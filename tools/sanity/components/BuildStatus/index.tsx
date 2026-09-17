import type { CardTone } from '@sanity/ui';
import { Text, Card, Flex } from '@sanity/ui';
import { useRef, useState, useEffect } from 'react';

const netlifySiteId = process.env.SANITY_STUDIO_NETLIFY_SITE_ID;

const REFRESH_INTERVAL = 5000;

type Status = 'success' | 'building' | 'failed' | 'canceled' | 'unknown';

const getMessage = (status: Status | null): string | null => {
  if (status === 'success') {
    return null;
  }
  if (status === 'building') {
    return 'Rebuilding site...';
  }
  if (status === 'failed') {
    return 'Site failed to build';
  }
  if (status === 'canceled') {
    return null;
  }
  return null;
};

// https://www.sanity.io/ui/docs/primitive/card
const getBannerTone = (status: Status | null): CardTone => {
  if (status === 'success') {
    return 'positive';
  }
  if (status === 'building') {
    return 'caution';
  }
  if (status === 'failed') {
    return 'critical';
  }
  if (status === 'canceled') {
    return 'primary';
  }
  return 'transparent';
};

const BuildStatus = ({ branch, navbar }: { branch?: string; navbar?: boolean }) => {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    const getNetlifyStatusBadge = async () => {
      const res = await fetch(
        `https://api.netlify.com/api/v1/badges/${netlifySiteId}/deploy-status${branch ? `?branch=${branch}` : ''}`,
        { method: 'GET' }
      );
      const html = await res.text();
      // Getting fill colour from status badge SVG
      if (html.search(`fill="#BEF9C6"`) > -1) {
        setStatus('success');
      } else if (html.search(`fill="#F6E0A5"`) > -1) {
        setStatus('building');
      } else if (html.search(`fill="#FFBDBA"`) > -1) {
        setStatus('failed');
      } else if (html.search(`fill="#D1D5DA"`) > -1) {
        setStatus('canceled');
      } else {
        setStatus('unknown');
      }
    };
    if (netlifySiteId) {
      getNetlifyStatusBadge();
      timer.current = setInterval(() => {
        getNetlifyStatusBadge();
      }, REFRESH_INTERVAL);
    }
    return () => clearInterval(timer.current ?? undefined);
  }, [branch]);
  const bannerTone = getBannerTone(status);
  const message = getMessage(status);
  if (!message) {
    return null;
  }
  if (navbar) {
    return (
      <Card padding={3} tone={bannerTone}>
        <Flex justify="center">
          <Text size={2}>{message}</Text>
        </Flex>
      </Card>
    );
  }
  return <Text size={2}>{message}</Text>;
};

export default BuildStatus;
