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

  interface SanityImageSimple {
    asset: SanityImageAsset;
    altText?: string;
  }

  type SanityAspectRatio = 'natural' | '16-9' | '3-2' | '1-1' | '4-3';

  interface SanityImageAdvanced extends SanityImageSimple {
    aspectRatio?: SanityAspectRatio;
  }

  type SanityImage = SanityImageSimple | SanityImageAdvanced;
}

export type { SanityImage, SanityImageAsset, SanityAspectRatio, SanityImageSimple, SanityImageAdvanced };
