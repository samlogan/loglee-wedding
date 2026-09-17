#!/usr/bin/env bash
#
# Optimise a raw Meshy GLB export for the web.
#
#   yarn model:optimise <input.glb> [output.glb]
#
# Meshy exports are roughly 23–25 MB: geometry is already fine (~30K triangles), but the
# textures are PNG and one of them ships at 4096×4096. This takes them to ~4 MB with no
# visible loss. Originals are copied to ../loglee-wedding-assets/3d-originals first.
#
# ── Three things that were learned the hard way ───────────────────────────────────────
#
# 1. `meshopt --level medium`, NOT the default `high`.
#    In gltf-transform, "high" means *more aggressive compression*, not better quality. It
#    quantises NORMAL and TANGENT down to 8-bit — 256 levels per axis. Normals drive every
#    lighting calculation, so on smooth organic surfaces that produces banded, flattened
#    shading that reads as "washed out". `medium` keeps them at 16-bit for ~0.4 MB more.
#
# 2. `quantize --quantize-normal 16` does NOT fix that if meshopt runs afterwards.
#    Meshopt re-quantises and silently discards the setting — byte-identical 8-bit output.
#    The only lever is `--level`.
#
# 3. Do not use `optimize` as a single blanket pass.
#    It applies one aggressive quality to every texture, including the normal and
#    metallicRoughness maps, which encode vectors and material values rather than colour.
#
# ── Tone mapping ──────────────────────────────────────────────────────────────────────
#
# If a model looks washed out in a viewer, check the renderer before re-exporting. A plain
# GLB previewer usually applies no tone mapping, so anything above 1.0 clips to white. This
# project renders with Khronos PBR Neutral. See /dev/models.
#
set -euo pipefail

GT="npx --yes @gltf-transform/cli@4"
# Originals live beside the repo, not inside it — a raw export is ~25 MB and committing one
# puts it in git history permanently.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="$(cd "$REPO_ROOT/.." && pwd)/loglee-wedding-assets/3d-originals"

TEXTURE_SIZE=2048   # caps Meshy's 4096 metallicRoughness map
TEXTURE_QUALITY=95  # webp; below ~90 the colour map visibly softens

die() { echo "error: $*" >&2; exit 1; }

IN="${1:-}"
[ -n "$IN" ] || die "usage: yarn model:optimise <input.glb> [output.glb]"
[ -f "$IN" ] || die "no such file: $IN"
OUT="${2:-$IN}"

NAME="$(basename "$IN" .glb)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

size_mb() { echo "scale=2; $(wc -c < "$1")/1048576" | bc; }

# ── Back up the original before touching anything ─────────────────────────────────────
mkdir -p "$BACKUP_DIR"
if [ -f "$BACKUP_DIR/$NAME.glb" ] && ! cmp -s "$IN" "$BACKUP_DIR/$NAME.glb"; then
  STAMP="$NAME-$(date +%Y%m%d-%H%M%S).glb"
  cp "$IN" "$BACKUP_DIR/$STAMP"
  echo "backed up  → $BACKUP_DIR/$STAMP (existing backup differed, kept both)"
else
  cp "$IN" "$BACKUP_DIR/$NAME.glb"
  echo "backed up  → $BACKUP_DIR/$NAME.glb"
fi

BEFORE="$(size_mb "$IN")"
echo "input      → $IN ($BEFORE MB)"
echo

# ── Pipeline ──────────────────────────────────────────────────────────────────────────
echo "1/3  resize textures to ${TEXTURE_SIZE}px"
$GT resize "$IN" "$TMP/1.glb" --width $TEXTURE_SIZE --height $TEXTURE_SIZE >/dev/null 2>&1

echo "2/3  webp q$TEXTURE_QUALITY"
$GT webp "$TMP/1.glb" "$TMP/2.glb" --quality $TEXTURE_QUALITY >/dev/null 2>&1

echo "3/3  meshopt (level medium — keeps 16-bit normals)"
$GT meshopt "$TMP/2.glb" "$TMP/3.glb" --level medium >/dev/null 2>&1

cp "$TMP/3.glb" "$OUT"
AFTER="$(size_mb "$OUT")"

# ── Report ────────────────────────────────────────────────────────────────────────────
echo
echo "output     → $OUT ($AFTER MB, was $BEFORE MB)"
echo

if $GT validate "$OUT" 2>&1 | grep -q "No errors found"; then
  echo "validation → no errors"
else
  echo "validation → ISSUES FOUND, run: $GT validate $OUT"
fi

# gltf-transform reports attribute precision as f32 / i16_norm / i8_norm, not as numeric
# glTF component types. 8-bit here is the flat-shading bug described at the top of this file.
NORMALS="$($GT inspect "$OUT" 2>/dev/null | grep -oE 'NORMAL:[a-z0-9_]+' | head -1 | cut -d: -f2)"
case "$NORMALS" in
  f32)      echo "normals    → float32, uncompressed" ;;
  i16_norm) echo "normals    → 16-bit — correct" ;;
  i8_norm)  echo "normals    → 8-bit — WRONG, shading will look flat. Check --level medium." ;;
  *)        echo "normals    → could not determine (got '${NORMALS:-nothing}')" ;;
esac

echo
echo "clips — these must be entered verbatim into the player document in Sanity:"
$GT inspect "$OUT" 2>/dev/null | sed -n '/ANIMATIONS/,$p' | grep -E "KB|MB" \
  | awk -F'│' '{gsub(/^ +| +$/,"",$3); gsub(/^ +| +$/,"",$6); print "  " $3 "  (" $6 "s)"}'

cat <<'EOF'

Reminders
  · Running, Walking and restpose are Meshy defaults present in every export.
  · Locomotion clips carry root motion and will drift out of a fixed canvas.
  · Both characters must be exported at the same scale, or they mismatch side by side.
  · Preview at /dev/models before committing.
EOF
