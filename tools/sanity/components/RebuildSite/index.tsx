import { Stack, Inline, Button, Text, Heading, useToast } from '@sanity/ui';
import { useState } from 'react';

import rebuildSite from '../../helpers/rebuildSite';
import BuildStatus from '../BuildStatus';

export const RebuildSite = () => {
  const [isSubmitting, setSubmitting] = useState(false);

  // Sanity onClick popup
  const toast = useToast();

  const handleWebsiteRebuild = async () => {
    setSubmitting(true);
    toast.push({
      status: 'success',
      title: `Website Rebuild Successfully Triggered`
    });
    await rebuildSite(true, false);
    setSubmitting(false);
  };

  const handlePreviewRebuild = async () => {
    setSubmitting(true);
    toast.push({
      status: 'success',
      title: `Preview Rebuild Successfully Triggered`
    });
    await rebuildSite(true, true);
    setSubmitting(false);
  };

  return (
    <Stack space={4}>
      <Heading as="h6" size={1}>
        Rebuild Website with Clean Cache
      </Heading>
      <Text size={2}>
        Please note this process can take between 5-10 minutes, and the button should not be clicked multiple times.
      </Text>
      <Inline space={[3, 3, 4]}>
        <Button
          fontSize={[1, 1, 2]}
          padding={[2, 2, 3]}
          text="Rebuild Website"
          onClick={handleWebsiteRebuild}
          disabled={isSubmitting}
        />
        <BuildStatus />
      </Inline>
      <Inline space={[3, 3, 4]}>
        <Button
          fontSize={[1, 1, 2]}
          padding={[2, 2, 3]}
          text="Rebuild Preview"
          onClick={handlePreviewRebuild}
          disabled={isSubmitting}
        />
        <BuildStatus branch="preview" />
      </Inline>
    </Stack>
  );
};
