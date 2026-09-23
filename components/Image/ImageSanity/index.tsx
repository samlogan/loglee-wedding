'use client';

import type { UseNextSanityImageBuilderOptions, ImageUrlBuilder } from 'next-sanity-image';
import { useNextSanityImage } from 'next-sanity-image';
import NextImage, { ImageProps } from 'next/image';
import type { FC } from 'react';

import { client as sanityClient } from '@/tools/sanity/lib/client';

interface ImageSanityProps {
  asset: SanityImageAsset;
  className?: string;
  sizes?: string;
  alt: string;
  quality: number;
  onError: () => void;
  error: boolean;
  fill: boolean;
  fallback: {
    src: string;
    height: number;
    width: number;
    blurDataURL?: string;
  };
  priority: boolean;
  placeholder?: 'blur' | 'empty';
  crop?: SanityImageCrop;
  hotspot?: SanityImageHotspot;
}

/**
 * Where `object-fit: cover` should centre its crop: the editor's hotspot, as a CSS `object-position`.
 *
 * The hotspot is stored as a point in the *original* image, but the image served is the editor's
 * crop of it (`rect=` in the URL), so the point is re-expressed inside that rect. `undefined` when
 * there is no hotspot, which leaves the stylesheet's `50% 50%` in place.
 */
const hotspotPosition = (hotspot?: SanityImageHotspot, crop?: SanityImageCrop): string | undefined => {
  if (hotspot?.x === undefined || hotspot.y === undefined) {
    return undefined;
  }
  const { bottom = 0, left = 0, right = 0, top = 0 } = crop ?? {};
  const inside = (point: number, start: number, end: number) => {
    const span = 1 - start - end;
    const fraction = span > 0 ? (point - start) / span : 0.5;
    return `${(Math.min(1, Math.max(0, fraction)) * 100).toFixed(2)}%`;
  };
  return `${inside(hotspot.x, left, right)} ${inside(hotspot.y, top, bottom)}`;
};

const ImageSanity: FC<ImageSanityProps> = (props) => {
  const {
    asset,
    sizes,
    className,
    quality,
    alt,
    fill,
    placeholder,
    onError,
    priority,
    error,
    fallback,
    crop,
    hotspot
  } = props;

  let imageProps: Record<string, any> = {};

  // const sanityImage: any = useNextSanityImage(sanityClient, asset);

  const isSvg = asset?.url?.includes('.svg');

  const imageBuilder = (imageUrlBuilder: ImageUrlBuilder, options: UseNextSanityImageBuilderOptions) => {
    // SVGs should not be transformed — serve raw
    if (isSvg) {
      return imageUrlBuilder;
    }

    // Use the quality prop from component or default to 75
    const imageQuality = quality || 75;
    let builder = imageUrlBuilder.format('webp').quality(imageQuality);

    // Add width constraints based on expected display size.
    // Round: the Sanity CDN rejects non-integer w/h params with a 400.
    if (options.width) {
      builder = builder.width(Math.round(Math.min(options.width, 2400))); // Cap at 2400px max
    }

    /*
     * Width only — never a height. The CDN scales the (editor-cropped) image to this width and keeps
     * its shape. This used to add `h = min(croppedHeight, 1600)` to every srcset entry, so a 384w
     * entry of a 1536×2048 photo asked for 384×1600: the CDN answered by cutting a 0.24:1 sliver out
     * of the middle (`rect=522,0,492,2048`), and `object-fit: cover` then cropped that again. Every
     * Sanity image lost most of its width — two thirds of each carousel photo.
     */
    return builder;
  };

  const sanityImage = useNextSanityImage(
    sanityClient,
    { asset: asset, crop: crop, hotspot: hotspot },
    { imageBuilder }
  );

  if (sanityImage && sanityImage?.src && !error) {
    imageProps = { ...sanityImage, placeholder: 'empty' };
    const lqip = asset?.metadata?.lqip;
    if (lqip) {
      imageProps.blurDataURL = lqip;
      imageProps.placeholder = 'blur';
    }
  } else {
    imageProps = {
      ...fallback,
      placeholder: fallback.blurDataURL ? 'blur' : 'empty'
    };
  }

  if (placeholder) {
    imageProps.placeholder = placeholder;
  }

  return (
    <NextImage
      src={imageProps.src || fallback.src}
      className={className}
      quality={quality}
      sizes={sizes}
      priority={priority}
      alt={alt}
      fill={fill}
      onError={onError}
      // The crop `object-fit: cover` makes, centred on the editor's hotspot rather than the middle.
      style={{ objectPosition: hotspotPosition(hotspot, crop) }}
      {...imageProps}
    />
  );
};

export default ImageSanity;
