import { Stack, Box, Text, Flex } from '@sanity/ui';
import type { StringInputProps } from 'sanity';

export const ReadTime = (props: StringInputProps) => (
  <Stack>
    <Flex>
      <Box flex={1}>{props.renderDefault(props)}</Box>
      <Box
        padding={3}
        style={{
          backgroundColor: '#eee',
          boxShadow: 'inset 0 1px 0 0 #c1c1c1, inset 0 -1px 0 0 #c1c1c1, inset -1px 0 0 0 #c1c1c1',
          cursor: 'default'
        }}
        title="Slug prefix"
      >
        <Text style={{ color: '#444' }}>min read</Text>
      </Box>
    </Flex>
  </Stack>
);
