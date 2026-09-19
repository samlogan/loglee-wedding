'use client';

import { OrbitControls, useAnimations, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Group } from 'three';
import { SkeletonUtils } from 'three-stdlib';

import ModelLighting, { FallbackLighting } from '@/components/ModelViewer/ModelLighting';
import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

/**
 * Compression tiers, kept so a future model can be judged against the same ladder rather
 * than by eye against nothing. Tier A is what the site actually ships, so it points at the
 * live file rather than a duplicate.
 */
const TIERS = [
  { id: 'A', label: 'A — shipped', note: 'webp q95 · 16-bit normals', url: (who: string) => `/${who}.glb` },
  { id: 'B', label: 'B', note: 'webp q95 · float32 normals', url: (who: string) => `/models/${who}-B.glb` },
  { id: 'C', label: 'C', note: 'webp q99 · float32 normals', url: (who: string) => `/models/${who}-C.glb` }
] as const;

const CHARACTERS = ['sam', 'lauren'] as const;

/**
 * Khronos PBR Neutral is the project default. React Three Fiber's own default is ACES
 * Filmic, which pushes skin warm and desaturates. A plain GLB previewer usually applies
 * none at all, which clips everything above 1.0 to white — that is what "washed out"
 * looks like, and it is a renderer setting rather than an asset problem.
 */
const TONE_MAPPING = {
  neutral: THREE.NeutralToneMapping,
  aces: THREE.ACESFilmicToneMapping,
  none: THREE.NoToneMapping
} as const;

type ToneKey = keyof typeof TONE_MAPPING;

interface ModelProps {
  url: string;
  clip: string;
  playing: boolean;
  speed: number;
  showNormals: boolean;
  onLoad: (info: { clips: string[]; triangles: number }) => void;
}

const normalMaterial = new THREE.MeshNormalMaterial();

const Model = (props: ModelProps) => {
  const { url, clip, playing, speed, showNormals, onLoad } = props;
  const group = useRef<Group>(null);

  /*
   * `useDraco` off, as in `ModelCharacter`: drei's default attaches a `DRACOLoader` pointed at a Google
   * CDN, and these files are meshopt, not Draco. Meshopt stays on (drei's third argument defaults to
   * `true`) — the compressed tiers need it, and its decoder is bundled from `three-stdlib`.
   */
  const { scene, animations } = useGLTF(url, false);

  /**
   * `SkeletonUtils.clone`, not `scene.clone(true)`.
   *
   * A plain Object3D clone copies a SkinnedMesh but leaves it bound to the *original*
   * skeleton's bones, so the copy renders in its bind pose and never animates — no error,
   * no warning, just a character standing still. SkeletonUtils rebuilds the bone hierarchy
   * and rebinds the skin.
   *
   * The same applies on the home page, which renders both characters at once.
   */
  const model = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.userData.original = mesh.material;
      }
    });
    return clone;
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, model);

  useEffect(() => {
    let triangles = 0;
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry.index) {
        triangles += mesh.geometry.index.count / 3;
      }
    });
    onLoad({ clips: animations.map((a) => a.name), triangles });
  }, [model, animations, onLoad]);

  useEffect(() => {
    const action = actions[clip];
    if (!action) {
      return;
    }
    // Reset so every panel starts the clip at the same time and stays comparable.
    action.reset().setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY).play();
    return () => {
      action.stop();
    };
  }, [actions, clip]);

  useEffect(() => {
    mixer.timeScale = playing ? speed : 0;
  }, [mixer, playing, speed]);

  useEffect(() => {
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = showNormals ? normalMaterial : (mesh.userData.original as THREE.Material);
      }
    });
  }, [model, showNormals]);

  return <primitive object={model} ref={group} />;
};

const ModelHarness = () => {
  const [who, setWho] = useState<(typeof CHARACTERS)[number]>('lauren');
  const [tone, setTone] = useState<ToneKey>('neutral');
  const [exposure, setExposure] = useState(1);
  const [environment, setEnvironment] = useState(true);
  const [showNormals, setShowNormals] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [clips, setClips] = useState<string[]>([]);
  const [clip, setClip] = useState('');
  const [triangles, setTriangles] = useState(0);

  const handleLoad = useMemo(
    () => (info: { clips: string[]; triangles: number }) => {
      setTriangles(info.triangles);
      setClips((current) => (current.join(',') === info.clips.join(',') ? current : info.clips));
    },
    []
  );

  // Clip names differ per character — Meshy names each after its source animation — so the
  // selection is re-derived whenever the list changes. Prefer a dance over Meshy's defaults.
  useEffect(() => {
    if (clips.length === 0 || clips.includes(clip)) {
      return;
    }
    const preferred =
      clips.find((c) => /danc|groove|breakdance|cardio/i.test(c)) ??
      clips.find((c) => !/^(running|walking|restpose)$/i.test(c)) ??
      clips[0];
    setClip(preferred);
  }, [clips, clip]);

  return (
    <div className={styles.harness}>
      <header className={styles.bar}>
        <h1 className={styles.title}>Model harness</h1>

        <label className={styles.control}>
          <span>Character</span>
          <select onChange={(e) => setWho(e.target.value as (typeof CHARACTERS)[number])} value={who}>
            {CHARACTERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span>Tone mapping</span>
          <select onChange={(e) => setTone(e.target.value as ToneKey)} value={tone}>
            <option value="neutral">Khronos PBR Neutral</option>
            <option value="aces">ACES Filmic</option>
            <option value="none">None (raw clipping)</option>
          </select>
        </label>

        <label className={styles.control}>
          <span>Exposure</span>
          <input
            max={2.5}
            min={0.2}
            onChange={(e) => setExposure(Number(e.target.value))}
            step={0.05}
            type="range"
            value={exposure}
          />
          <b>{exposure.toFixed(2)}</b>
        </label>

        <label className={styles.control}>
          <span>Clip</span>
          <select onChange={(e) => setClip(e.target.value)} value={clip}>
            {clips.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span>Speed</span>
          <input
            max={2}
            min={0}
            onChange={(e) => setSpeed(Number(e.target.value))}
            step={0.05}
            type="range"
            value={speed}
          />
          <b>{speed.toFixed(2)}&times;</b>
        </label>

        <button
          className={classNames(styles.toggle, { [styles.on]: playing })}
          onClick={() => setPlaying((p) => !p)}
          type="button"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          className={classNames(styles.toggle, { [styles.on]: showNormals })}
          onClick={() => setShowNormals((n) => !n)}
          type="button"
        >
          Normals
        </button>
        <button
          className={classNames(styles.toggle, { [styles.on]: environment })}
          onClick={() => setEnvironment((e) => !e)}
          type="button"
        >
          Environment
        </button>
      </header>

      <div className={styles.grid}>
        {TIERS.map((tier) => (
          <section className={styles.cell} key={tier.id}>
            <div className={styles.caption}>
              <b>{tier.label}</b>
              <span>{tier.note}</span>
            </div>
            <Canvas
              camera={{ fov: 32, position: [0, 0.95, 3.4] }}
              gl={{ toneMapping: TONE_MAPPING[tone], toneMappingExposure: exposure }}
            >
              <color args={['#131412']} attach="background" />
              {/*
               * The viewers' own lighting, not a harness copy of it: the self-hosted HDRI, passed to drei
               * as a `map`. Three canvases share one cached texture here, which is the exact case where
               * `<Environment preset>` disposes it on unmount — see `ModelLighting`. Off is
               * `FallbackLighting`, i.e. what a reader whose HDRI failed to load sees.
               */}
              {environment ? <ModelLighting preset="studio" /> : <FallbackLighting />}
              <Suspense fallback={null}>
                <Model
                  clip={clip}
                  onLoad={handleLoad}
                  playing={playing}
                  showNormals={showNormals}
                  speed={speed}
                  url={tier.url(who)}
                />
              </Suspense>
              <OrbitControls enableDamping target={[0, 0.9, 0]} />
            </Canvas>
          </section>
        ))}
      </div>

      <p className={styles.note}>
        {triangles > 0 ? `${triangles.toLocaleString()} triangles · ${clips.length} clips · ` : ''}
        Every panel plays the same clip, so differences are the asset rather than playback drift. <b>Normals</b> shows
        normal direction as colour, which is where the geometry difference lives — tier A stores them at 16-bit, B and C
        at float32. <b>None</b> approximates a plain GLB previewer, clipping everything above 1.0 to white. Regenerate
        any model with <code>yarn model:optimise &lt;file.glb&gt;</code>.
      </p>
    </div>
  );
};

export default ModelHarness;
