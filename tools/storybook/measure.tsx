import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Shared visual language for the layout primitives.
 *
 * `Section` and `Container` have no appearance of their own — they exist to create space. Stories
 * for them have to draw that space, and they should draw it the same way, so a reader moving between
 * the two is comparing values rather than re-learning a diagram.
 *
 * The convention is:
 *
 * - **Tinted bands** are the space the component creates: padding on `Section`, gutters on
 *   `Container`.
 * - **A hatched area** is where content would go. Deliberately not a filled panel — a solid block
 *   reads as the component having an appearance, which is the misconception these stories exist to
 *   correct.
 * - **A dashed rule** is an edge.
 *
 * Every number shown is measured off the DOM at the current viewport, never hardcoded. That matters
 * more than it sounds: the spacing classes are built dynamically (`styles[\`spacing_top_${x}\`]`), so
 * a typo'd token yields silently zero padding, and a hand-written table would report the value the
 * author intended rather than the one the browser applied.
 */

/**
 * Diagram red, not a brand colour.
 *
 * These overlays are annotation, not design. A brand tint on a light canvas can sit at barely any
 * contrast, making the bands and hatching close to invisible on exactly the stories whose whole job
 * is to show them. Red is not in the palette these primitives ever render, which is the point:
 * nothing on the page can be mistaken for part of the component.
 */
const RED = '240, 68, 56'; // --system-error-500

export const bandStyle = {
  background: `rgba(${RED}, 0.24)`
} as const;

export const hatchStyle = {
  backgroundImage: `repeating-linear-gradient(45deg, rgba(${RED}, 0.22) 0 6px, transparent 6px 12px)`,
  border: `1px dashed rgba(${RED}, 0.75)`
} as const;

export const dashed = `1px dashed rgba(${RED}, 0.75)`;

/**
 * The outline of the primitive under test.
 *
 * `Section` and `Container` draw nothing themselves, so without this the stories show a hatched
 * content block floating in white space with no way to see where the component's own box ends —
 * which is to say, no way to see the gutter or the padding, the one thing being demonstrated. The
 * band between this outline and the hatching inside it *is* the space the component creates.
 */
export const frameStyle = {
  outline: `1px solid rgba(${RED}, 0.55)`,
  outlineOffset: -1,
  background: `rgba(${RED}, 0.07)`
} as const;

export const STACK_GAP = '2rem';

/**
 * Measure a descendant of the row and re-measure when the layout changes.
 *
 * Uses `querySelector` rather than a ref, because the stories measure a *descendant* of the row —
 * the `Section` or `Container` under test — not the wrapper the hook is attached to. Both primitives
 * do now accept a ref correctly, so a ref would work for a single specimen, but these stories render
 * several per story and a query keeps one hook per row rather than one per specimen.
 *
 * Three details are deliberate:
 *
 * - **`read` is held in a ref.** It is defined inline at every call site, so it is a fresh closure
 *   on every render. Capturing it in a `useCallback` keyed on `selector` would pin the *mount-time*
 *   closure forever, and a `read` that referenced a prop would silently keep reporting the
 *   mount-time value. Keeping it in a ref means the effect never re-runs but always calls the
 *   current function.
 * - **The viewport is observed as well as the target.** The numbers being read are padding and
 *   gutters, which live *inside* the border-box. A `Container` capped at its `max-width` keeps a
 *   constant border-box from 1400px down to its cap, so a target-only observer never fires while the
 *   gutter changes across a breakpoint — the readout would go quietly stale on exactly the drag the
 *   stories exist to demonstrate.
 * - **A missing target says so.** The selectors are string literals coupled by convention to markup
 *   in another file; without this a rename degrades to a permanent, unexplained "measuring…".
 */
export const useMeasure = <T,>(selector: string, read: (element: Element) => T) => {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<T | null>(null);
  const readRef = useRef(read);

  useEffect(() => {
    readRef.current = read;
  });

  useEffect(() => {
    const measure = () => {
      const target = ref.current?.querySelector(selector);
      if (target) {
        setValue(readRef.current(target));
      }
    };
    measure();

    const target = ref.current?.querySelector(selector);
    if (!target) {
      // eslint-disable-next-line no-console -- a permanent "measuring…" with no cause is worse
      console.warn(`useMeasure: nothing matched "${selector}", so this row will not report a value.`);
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(target);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [selector]);

  return { ref, value };
};

export interface RowProps {
  label: string;
  /** The measured readout — the reason the row exists. */
  meta?: ReactNode;
  children: ReactNode;
}

/**
 * One labelled specimen.
 *
 * The label and readout sit in a header attached to the card rather than floating above it, so a
 * stack of rows reads as a table of values rather than a column of unrelated boxes.
 */
export const Row = ({ label, meta, children }: RowProps) => (
  <div style={{ marginBottom: STACK_GAP }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 16,
        padding: '6px 10px',
        borderBottom: dashed,
        fontFamily: 'var(--body-font), sans-serif',
        fontSize: 12
      }}
    >
      <strong>{label}</strong>
      <span style={{ opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>{meta ?? 'measuring…'}</span>
    </div>
    {children}
  </div>
);

/** The hatched stand-in for content. */
export const Content = ({ children, height = 56 }: { children?: ReactNode; height?: number }) => (
  <div
    style={{
      ...hatchStyle,
      minHeight: height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--body-font), sans-serif',
      fontSize: 12,
      opacity: 0.85
    }}
  >
    {children ?? 'content'}
  </div>
);
