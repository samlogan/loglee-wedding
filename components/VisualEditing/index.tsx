'use client';

import { VisualEditing as VisualEditingNextSanity } from 'next-sanity/visual-editing';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getIsInStudio = () => typeof window !== 'undefined' && window !== parent;
const getServerSnapshot = () => false;

const VisualEditing = () => {
  const isInStudio = useSyncExternalStore(subscribe, getIsInStudio, getServerSnapshot);

  if (!isInStudio) {
    return null;
  }

  return <VisualEditingNextSanity />;
};

export default VisualEditing;
