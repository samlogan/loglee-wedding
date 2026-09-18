'use client';

import { colorInput } from '@sanity/color-input';
import { table } from '@sanity/table';
import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { IconManager } from 'sanity-plugin-icon-manager';
import { media } from 'sanity-plugin-media';
import { presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';

import PreviewAction from '../actions/PreviewAction';
import schemas from '../schema';
import structure from '../structure';
import theme from './theme';

// Singletons are pinned in the desk structure against a fixed document ID, so they must not be
// creatable a second time from the global "Create new" menu.
const singletonTypes = new Set(['headerDocument', 'settings', 'socialMediaDocument', 'weddingSettings']);

// Written only by the RSVP server action and read-only in the Studio, so creating one by hand would
// produce an empty document nobody can then fill in. Document-level readOnly does not hide the
// "Create new" entry on its own.
const serverWrittenTypes = new Set(['rsvp']);

const SANITY_STUDIO_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const SANITY_STUDIO_PROJECT_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET;
const SANITY_STUDIO_PROJECT_NAME = process.env.NEXT_PUBLIC_SANITY_PROJECT_NAME;

export default defineConfig({
  basePath: '/studio',
  dataset: SANITY_STUDIO_PROJECT_DATASET || '',
  document: {
    actions: [PreviewAction],
    newDocumentOptions: (prev) =>
      prev.filter(
        (template) => !(singletonTypes.has(template.templateId) || serverWrittenTypes.has(template.templateId))
      )
  },
  icon: () => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/apple-icon.png" alt="" style={{ height: '100%', width: '100%' }} />
  ),
  name: 'default',
  plugins: [
    structureTool({ structure }),
    colorInput(),
    visionTool(),
    media(),
    table(),
    IconManager({
      availableCollections: ['tabler'],
      inlineSvg: true
    }),
    presentationTool({
      // locate,
      name: 'visual-editor',
      previewUrl: {
        draftMode: {
          enable: '/api/draft'
        }
      },
      title: 'Visual Editor'
    })
    // googleMapsInput({
    //   apiKey: GATSBY_GOOGLE_MAPS_API_KEY,
    // }),
  ],
  projectId: SANITY_STUDIO_PROJECT_ID || '',
  releases: {
    // Disables multi-document Content Releases UI; the sidebar tool relabels to "Scheduled Drafts"
    // and the per-document SchedulePublishAction continues to work.
    enabled: false
  },
  scheduledPublishing: {
    enabled: false
  },
  schema: {
    types: schemas
  },
  theme,
  title: SANITY_STUDIO_PROJECT_NAME
});
