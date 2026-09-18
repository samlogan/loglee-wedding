declare global {
  interface SanityImageAsset {
    // Read by useNextSanityImage, not by our own code — the CDN URL and the
    // intrinsic dimensions are parsed out of it. Optional only so Storybook
    // mocks can omit it and fall through to the local fallback image.
    _id?: string;
    url: string;
    altText?: string;
    metadata: {
      dimensions: {
        width: number;
        height: number;
      };
      lqip?: string;
    };
  }

  /**
   * The editor's crop, as a fraction of each edge. Written by any image field with
   * `options: { hotspot: true }`, which is every one of them in this schema.
   */
  interface SanityImageCrop {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }

  /**
   * The editor's focal region, normalised 0–1. The only say an editor has over which slice of a tall
   * photograph survives a wide frame.
   */
  interface SanityImageHotspot {
    x?: number;
    y?: number;
    height?: number;
    width?: number;
  }

  /**
   * `crop` and `hotspot` are declared here because `imageProjection` returns them on **every** image
   * field in the repo and `components/Image` reads both — they were simply missing from the type.
   *
   * That gap was not harmless. It reached three files as three hand-written copies of the same two
   * object literals (`components/Image`, `components/Image/ImageSanity`, and
   * `specCardGridSection`'s card, which declared them locally with a note saying widening the global
   * type "is a shared file and a separate change"). And it was a live trap: the values reach a
   * renderer today only because the call sites spread the whole projected object, which is a runtime
   * operation. The obvious refactor to passing props explicitly would have dropped the hotspot with
   * **no type error**, silently re-centring every crop in the application.
   *
   * Optional, because a document written before the field existed, or by a raw mutation, has
   * neither.
   */
  interface SanityImageSimple {
    asset: SanityImageAsset;
    altText?: string;
    crop?: SanityImageCrop;
    hotspot?: SanityImageHotspot;
  }

  type SanityAspectRatio = 'natural' | '16-9' | '3-2' | '1-1' | '4-3';

  interface SanityImageAdvanced extends SanityImageSimple {
    aspectRatio?: SanityAspectRatio;
  }

  type SanityImage = SanityImageSimple | SanityImageAdvanced;
}

export type {
  SanityImage,
  SanityImageAsset,
  SanityAspectRatio,
  SanityImageCrop,
  SanityImageHotspot,
  SanityImageSimple,
  SanityImageAdvanced
};
