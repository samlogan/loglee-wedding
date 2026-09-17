import { Box, Button, TextInput, Card, Flex, Stack, useToast } from '@sanity/ui';
import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { set, unset, useFormValue } from 'sanity';

import { studioAuthHeader } from '../../helpers/studioAuthToken';

const createPatchFrom = (value: string) => (value === '' ? unset() : set(value));

// Util function to check if URL is a valid YouTube or Vimeo URL
function isValidVideoUrl(url: string): boolean {
  const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
  const vimeoPattern = /^(https?:\/\/)?(www\.)?vimeo\.com\/\d+/;
  return youtubePattern.test(url) || vimeoPattern.test(url);
}

interface VideoUrlInputProps {
  type?: unknown;
  value?: string;
  onChange: (patch: ReturnType<typeof set> | ReturnType<typeof unset>) => void;
  path?: unknown;
  elementProps: {
    id: string;
    [key: string]: unknown;
  };
  schemaType?: {
    components?: {
      options?: {
        thumbnailField?: string;
      };
    };
  };
  [key: string]: unknown;
}

function VideoUrlInput({ type, value, onChange, path, elementProps, schemaType, ...rest }: VideoUrlInputProps) {
  const { _id: documentId } = useFormValue([]) as { _id: string };
  const toast = useToast();

  const thumbnailFieldKey = schemaType?.components?.options?.thumbnailField;
  const idSections = elementProps.id.split('.');
  const idSectionsExcludingLast = idSections.slice(0, -1);
  const idBase = idSectionsExcludingLast.join('.');
  /*
   * `idBase` is empty when the video field sits at the top level of a document, and the template
   * then produced `.thumbnail` — a leading dot, which is not a path Sanity accepts. It reached the
   * API as a malformed patch key rather than an error, so nothing said why the thumbnail never
   * appeared. `mediaSection` is nested, so the common path masked it.
   */
  const thumbnailField = idBase ? `${idBase}.${thumbnailFieldKey}` : thumbnailFieldKey;

  const generateThumbnail = async () => {
    if (!value) {
      return;
    }
    try {
      const platform =
        value.includes('youtube.com') || value.includes('youtu.be')
          ? 'YouTube'
          : value.includes('vimeo.com')
            ? 'Vimeo'
            : 'Unknown';

      toast.push({
        status: 'info',
        title: `Fetching thumbnail from ${platform}. Please wait...`
      });

      let thumbnailUrl = '';
      let videoId: string | undefined;

      if (platform === 'YouTube') {
        if (value.includes('youtube.com')) {
          // Extracting video ID from long-form URLs
          videoId = value.split('v=')[1]?.split('&')[0];
        } else if (value.includes('youtu.be')) {
          // Extracting video ID from short-form URLs
          videoId = value.split('youtu.be/')[1]?.split('?')[0];
        }

        if (videoId) {
          thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      } else if (platform === 'Vimeo') {
        videoId = value.split('/').pop();
        const apiUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        thumbnailUrl = data.thumbnail_url.replace(/_295x166/, '_1600x');
      }

      if (thumbnailUrl && documentId && thumbnailField && videoId) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sanity/save-image`, {
          body: JSON.stringify({
            fileName: `${videoId}.jpg`, // The file name
            imageUrl: thumbnailUrl, // The video URL
            documentRef: documentId, // Provide the document ID where you want to save the thumbnail
            fieldName: thumbnailField // The field name in your document where the thumbnail should be saved
          }),
          headers: {
            'Content-Type': 'application/json',
            // The route verifies this against Sanity before acting on it — see
            // `tools/sanity/helpers/verifyStudioUser`. Without it the request is anonymous and 401s.
            ...studioAuthHeader()
          },
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error('Failed to generate thumbnail');
        }

        const data = await response.json();

        toast.push({
          status: 'success',
          title: `Fetched thumbnail from ${platform}.`
        });
      }
    } catch (error) {
      console.error(error);
      toast.push({
        description: 'Try uploading it manually to the asset field instead.',
        status: 'error',
        title: 'Failed to generate thumbnail'
      });
    }
  };

  return (
    <Stack space={3}>
      <Flex direction="row" align="center" gap={3}>
        <Box flex={1} style={{ maxWidth: '100%' }}>
          <TextInput
            value={value}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(createPatchFrom(event.target.value))}
            {...rest}
          />
        </Box>
        <Button
          text="Generate Thumbnail"
          onClick={generateThumbnail}
          disabled={!isValidVideoUrl(value || '')}
          tone="primary"
        />
      </Flex>
    </Stack>
  );
}

export default VideoUrlInput;
