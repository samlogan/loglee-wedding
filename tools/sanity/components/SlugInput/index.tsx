import { Box, Flex, Stack, Text } from '@sanity/ui';
import { useEffect, useRef } from 'react';
import type { SlugInputProps } from 'sanity';
import { getPublishedId, useDocumentOperation, useFormValue } from 'sanity';

// Auto-format a slug so editors don't have to: lowercase it, turn spaces and underscores into
// hyphens (collapsing runs so we never produce double hyphens), and ensure a single leading and
// trailing slash. Other characters are left untouched — that keeps nested slugs (/foo/bar/) intact
// and lets validation still flag anything that remains unsupported.
const normalizeSlug = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  let result = trimmed.toLowerCase().replaceAll(/[\s_]+/g, '-');
  if (!result.startsWith('/')) {
    result = `/${result}`;
  }
  if (!result.endsWith('/')) {
    result = `${result}/`;
  }
  return result;
};

const SlugInput = (props: SlugInputProps) => {
  const { prefix = '' } = props.schemaType.options as SlugInputProps['schemaType']['options'] & {
    prefix?: string;
  };

  // @ts-expect-error
  const { _id, _type } = useFormValue([]);
  const { patch } = useDocumentOperation(getPublishedId(_id), _type);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const input = ref.current?.querySelector('input[type="text"]') as HTMLInputElement | null;
    const generateButton = ref.current?.querySelector('button');
    if (input && generateButton) {
      const applyNormalizedSlug = (rawValue: string) => {
        const normalized = normalizeSlug(rawValue);
        const patches: { set: Record<string, unknown> }[] = [];
        // Auto-add the leading/trailing slashes when they're missing.
        if (normalized !== rawValue) {
          patches.push({ set: { slug: { _type: 'slug', current: normalized } } });
        }
        patches.push({ set: { pathname: `${prefix}${normalized}` } });
        patch.execute(patches);
      };
      const onBlur = (e: Event) => {
        const target = e.currentTarget as HTMLInputElement;
        applyNormalizedSlug(target.value);
      };
      const onClick = () => {
        // Wait for the default "Generate" handler to populate the input first
        setTimeout(() => {
          applyNormalizedSlug(input.value);
        }, 500);
      };
      input.addEventListener('blur', onBlur);
      generateButton.addEventListener('click', onClick);
      return () => {
        input.removeEventListener('blur', onBlur);
        generateButton.removeEventListener('click', onClick);
      };
    }
  }, [prefix, patch]);

  return (
    <Stack>
      <Flex>
        {prefix && (
          <Box
            padding={3}
            style={{
              backgroundColor: '#eee',
              boxShadow: 'inset 0 1px 0 0 #c1c1c1, inset 0 -1px 0 0 #c1c1c1, inset 1px 0 0 0 #c1c1c1',
              cursor: 'default'
            }}
            title="Slug prefix"
          >
            <Text style={{ color: '#444' }}>{prefix}</Text>
          </Box>
        )}
        <Box flex={1} ref={ref}>
          {props.renderDefault(props)}
        </Box>
      </Flex>
    </Stack>
  );
};

export default SlugInput;
