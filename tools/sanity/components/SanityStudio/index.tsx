'use client';

import { NextStudio } from 'next-sanity/studio';
import type { FC } from 'react';

import config from '../../config';

import styles from './style.module.scss';

// const IS_DEV = process.env.NODE_ENV === 'development';

const Studio: FC = () => (
  <div className={styles.sanity}>
    <NextStudio config={config} />
  </div>
);

export default Studio;
