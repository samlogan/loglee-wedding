'use client';

import NextImage from 'next/image';
import { useState } from 'react';

import fallback from '@/assets/images/fallback.png';
import classNames from '@/helpers/classNames';
import type { Breakpoints } from '@/tools/helpers/breakpoints';
import breakpoints from '@/tools/helpers/breakpoints';

import ImageSanity from './ImageSanity';

import styles from './styles.module.scss';

export interface ImagePropsSanity {
  asset: SanityImageAsset;
  altText?: string;
  className?: string;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  objectFit?: 'cover' | 'contain';
  sizes?: string | Breakpoints;
  fill?: boolean;
  aspectRatio?: SanityAspectRatio;
  // The two keys `imageProjection` returns on every image field and this component reads below. They
  // are named types rather than inline literals because three files had written the same two object
  // shapes out by hand — see the note on `SanityImageSimple`.
  crop?: SanityImageCrop;
  hotspot?: SanityImageHotspot;
}

export interface ImagePropsStandard {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  objectFit?: 'cover' | 'contain';
  sizes?: string | Breakpoints;
  fill?: boolean;
  aspectRatio?: SanityAspectRatio;
}

export type ImageProps = ImagePropsStandard | ImagePropsSanity;

const Image = (props: ImageProps) => {
  const {
    className,
    quality = 80,
    priority = false,
    sizes,
    objectFit = 'cover',
    aspectRatio = 'natural',
    placeholder,
    fill
  } = props;

  const [error, setError] = useState(false);
  const onError = () => setError(true);

  const classes = classNames(
    styles.container,
    aspectRatio ? styles[`ratio_${aspectRatio}`] : styles['ratio_natural'],
    styles[`object-fit_${objectFit}`],
    className
  );

  const getSizes = () => {
    if (!sizes) {
      return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
    }
    if (typeof sizes === 'string') {
      return sizes;
    } // sizes="100vw"
    const devices = Object.keys(sizes) as (keyof typeof breakpoints | 'any')[];
    return devices
      .reduce<string[]>((acc, device) => {
        const breakpointSize = sizes[device];
        if (device === 'any') {
          if (breakpointSize) {
            acc.push(breakpointSize);
          }
          return acc;
        }
        const breakpoint = breakpoints[device];
        if (breakpoint) {
          acc.push(`(max-width: ${breakpoint}) ${breakpointSize}`);
        }
        return acc;
      }, [])
      .join(', ');
  };

  const sizesAttributes = getSizes();

  if ('asset' in props) {
    const asset = props?.asset;
    if (!asset?.url) {
      return null;
    }

    return (
      <div className={classes}>
        <ImageSanity
          alt={props?.altText || asset?.altText || ''}
          asset={props?.asset}
          className={styles.image}
          sizes={sizesAttributes}
          onError={onError}
          error={error}
          fallback={fallback}
          quality={quality}
          priority={priority}
          fill={fill || false}
          placeholder={placeholder}
          crop={props?.crop}
          hotspot={props?.hotspot}
        />
      </div>
    );
  }

  if ('src' in props) {
    const { src, alt, width, height, quality, priority } = props;
    return (
      <div className={classes}>
        <NextImage
          className={styles.image}
          src={error ? fallback : src}
          alt={alt || ''}
          width={width}
          height={height}
          quality={quality}
          priority={priority}
          sizes={sizesAttributes}
          fill={fill}
          onError={onError}
        />
      </div>
    );
  }

  return (
    <div className={classes}>
      <NextImage
        className={styles.image}
        src={fallback}
        alt=""
        width={1203}
        height={900}
        quality={quality}
        priority={priority}
        sizes={sizesAttributes}
        fill={fill}
      />
    </div>
  );
};

// Image.Animated = ImageAnimated;

export default Image;
