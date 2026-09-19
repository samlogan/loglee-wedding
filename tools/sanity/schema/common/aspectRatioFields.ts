import type { FieldDefinition } from 'sanity';

/**
 * The shapes an editor can give a full-bleed section, one per viewport. `value` is the class suffix
 * in `components/AspectRatioFrame/styles.module.scss` — add one here, add it there.
 *
 * `fullscreen` is not a ratio: it is the height of the viewport, whatever its shape.
 */
const ASPECT_RATIO_OPTIONS = [
  { title: 'Full screen (viewport height)', value: 'fullscreen' },
  { title: '21:9 — panoramic', value: '21x9' },
  { title: '16:9 — widescreen', value: '16x9' },
  { title: '3:2', value: '3x2' },
  { title: '4:3', value: '4x3' },
  { title: '1:1 — square', value: '1x1' },
  { title: '4:5 — portrait', value: '4x5' },
  { title: '3:4 — portrait', value: '3x4' },
  { title: '9:16 — tall', value: '9x16' }
] as const;

type FrameAspectRatio = (typeof ASPECT_RATIO_OPTIONS)[number]['value'];

interface IAspectRatioFields {
  aspectRatioDesktop?: FrameAspectRatio | null;
  aspectRatioMobile?: FrameAspectRatio | null;
}

/**
 * The desktop / mobile pair, in the `styles` group. Each section chooses its own defaults, because
 * what reads well differs — a map wants width, a photograph often wants the whole screen.
 */
const aspectRatioFields = (defaults: { desktop: FrameAspectRatio; mobile: FrameAspectRatio }): FieldDefinition[] => [
  {
    description: 'The shape on laptops and desktops.',
    group: 'styles',
    initialValue: defaults.desktop,
    name: 'aspectRatioDesktop',
    options: { list: [...ASPECT_RATIO_OPTIONS] },
    title: 'Aspect Ratio — Desktop',
    type: 'string'
  },
  {
    description: 'The shape on phones and small tablets.',
    group: 'styles',
    initialValue: defaults.mobile,
    name: 'aspectRatioMobile',
    options: { list: [...ASPECT_RATIO_OPTIONS] },
    title: 'Aspect Ratio — Mobile',
    type: 'string'
  }
];

export { ASPECT_RATIO_OPTIONS, aspectRatioFields };
export type { FrameAspectRatio, IAspectRatioFields };
