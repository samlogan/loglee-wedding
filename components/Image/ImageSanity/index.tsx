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

    // Add height constraints based on expected display size.
    // croppedImageDimensions.height is fractional for cropped images, so it
    // must be rounded — an un-rounded `h=598.47…` makes the CDN return 400,
    // which triggers onError and falls back to the placeholder image.
    const imageHeight = options.croppedImageDimensions?.height;
    if (imageHeight) {
      builder = builder.height(Math.round(Math.min(imageHeight, 1600))); // Cap at 1600px max
    }

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
      {...imageProps}
    />
  );
};

export default ImageSanity;
