import { groq } from 'next-sanity';

// Keep this list explicit — never `asset->{...}`. A bare spread returns the whole
// asset document (palette ~900B, blurHash, sha1hash, uploadId, path, assetId,
// originalFilename, _rev, timestamps) on every image on every page, none of which
// is read anywhere. Each field below has exactly one consumer:
//   _id                       -> useNextSanityImage / @sanity/image-url; the CDN URL
//                                and the intrinsic dimensions are both parsed out of
//                                this string, so images break entirely without it
//   url                       -> Image's render guard + the `.svg` passthrough check
//   altText                   -> asset-level alt fallback in components/Image
//   metadata.dimensions       -> width/height in Image.Animated
//   metadata.lqip             -> blur placeholder in ImageSanity
// Add a field only when something actually reads it.
const imageProjection = groq`{
  asset->{
    _id,
    url,
    altText,
    metadata {
      dimensions {
        width,
        height
      },
      lqip
    }
  },
  crop,
  hotspot,
  altText,
  aspectRatio
}`;

export default imageProjection;
