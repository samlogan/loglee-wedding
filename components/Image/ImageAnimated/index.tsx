'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import NextImage from 'next/image';
import { useRef } from 'react';

import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

interface ImagePropsSanity {
  asset: {
    altText: string;
    url: string;
    metadata: {
      dimensions: {
        width: number;
        height: number;
      };
      lqip?: string;
    };
  };
  className?: string;
  fill?: boolean;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  ratio?: 'auto' | '1-1' | '3-2' | '4-3' | '16-9';
  yMotion?: number;
}

interface ImagePropsStandard {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fill?: boolean;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  ratio?: 'auto' | '1-1' | '3-2' | '4-3' | '16-9';
  yMotion?: number;
}

type ImageProps = ImagePropsStandard | ImagePropsSanity;

const Image = (props: ImageProps) => {
  const { className, quality = 80, priority = false, placeholder = 'empty', ratio = 'auto', yMotion = 20 } = props;

  const classes = classNames(styles.container, styles[`ratio-${ratio}`], className);

  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    offset: ['start end', 'end start'],
    target: ref
  });

  const scale = 100 + yMotion + yMotion / 4;
  const transform = useTransform(
    scrollYProgress,
    [0, 1],
    [`translateY(-${yMotion}%) scale(${scale}%)`, `translateY(${yMotion}%) scale(${scale}%)`]
  );

  let imageContent = null;

  if ('asset' in props) {
    const { asset } = props;
    imageContent = (
      <NextImage
        className={styles.image}
        src={asset?.url}
        alt={asset?.altText || ''}
        width={asset?.metadata?.dimensions?.width}
        height={asset?.metadata?.dimensions?.height}
        quality={quality}
        priority={priority}
        blurDataURL={asset?.metadata?.lqip}
        placeholder={asset?.metadata?.lqip ? 'blur' : placeholder}
      />
    );
  } else if ('src' in props) {
    const { src, alt, width, height, quality, priority } = props;
    imageContent = (
      <NextImage
        className={styles.image}
        src={src}
        alt={alt || ''}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
      />
    );
  }

  if (!imageContent) {
    return null;
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <motion.div className={classes} style={{ transform }}>
        {imageContent}
      </motion.div>
    </div>
  );
};

export default Image;
