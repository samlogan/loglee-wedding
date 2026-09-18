import { FiDatabase } from 'react-icons/fi';
import { TbCards, TbCube3dSphere, TbDeviceGamepad2, TbLetterCase, TbProgress } from 'react-icons/tb';
import { defineType } from 'sanity';
import slugify from 'slugify';

interface IPlayerTextStat {
  _key: string;
  _type: 'playerTextStat';
  label: string;
  value?: string;
  fullWidth: boolean;
}

interface IPlayerMeterStat {
  _key: string;
  _type: 'playerMeterStat';
  label: string;
  score: number;
}

type IPlayerStat = IPlayerTextStat | IPlayerMeterStat;

interface IPlayerDocument {
  // Sanity fields
  _createdAt: string;
  _updatedAt: string;

  // Defined fields
  name: string;
  slug: {
    current: string;
  };
  order?: number;
  model?: {
    asset: {
      _id?: string;
      url: string;
    };
  };
  clips: {
    idle?: string;
    hover?: string;
    feature?: string;
  };
  fallbackImage?: SanityImageSimple;
  eyebrow?: string;
  level?: string;
  stats: IPlayerStat[];
}

// A text stat and a meter stat are separate types rather than one type with a `kind` switch, so the
// Studio's "Add item" menu names the two shapes, each list row previews with its own icon and
// subtitle, and the renderer can partition on `_type` without reading a discriminator field.
const playerTextStat = defineType({
  fields: [
    {
      name: `label`,
      title: `Label`,
      type: `string`,
      validation: (Rule) => Rule.required()
    },
    {
      description: 'Set in the monospace UI face, unless this stat is full width.',
      name: `value`,
      title: `Value`,
      type: `string`
    },
    {
      description:
        'Spans both columns of the card, drops its underline rule and sets its value in the body face rather than the mono. Used for the closing stat.',
      initialValue: false,
      name: `fullWidth`,
      title: `Full Width`,
      type: `boolean`
    }
  ],
  icon: TbLetterCase,
  name: `playerTextStat`,
  preview: {
    prepare(selection) {
      const { label, value, fullWidth } = selection;
      return {
        subtitle: [value, fullWidth ? 'Full width' : null].filter(Boolean).join(' — ') || undefined,
        title: label || 'Text Stat'
      };
    },
    select: {
      fullWidth: 'fullWidth',
      label: 'label',
      value: 'value'
    }
  },
  title: `Text Stat`,
  type: `object`
});

const playerMeterStat = defineType({
  fields: [
    {
      name: `label`,
      title: `Label`,
      type: `string`,
      validation: (Rule) => Rule.required()
    },
    {
      description: 'Drawn as a game-style bar on the player card.',
      name: `score`,
      title: `Score (0 to 10)`,
      type: `number`,
      validation: (Rule) => Rule.required().min(0).max(10)
    }
  ],
  icon: TbProgress,
  name: `playerMeterStat`,
  preview: {
    prepare(selection) {
      const { label, score } = selection;
      return {
        subtitle: typeof score === 'number' ? `${score} / 10` : undefined,
        title: label || 'Meter Stat'
      };
    },
    select: {
      label: 'label',
      score: 'score'
    }
  },
  title: `Meter Stat`,
  type: `object`
});

const player = defineType({
  fields: [
    {
      group: 'data',
      name: `name`,
      title: `Name`,
      type: `string`,
      validation: (Rule) => Rule.required()
    },
    {
      description:
        'The player page this player appears on: "sam" for /sam, "lauren" for /lauren. Those pages are built in code, so a player with any other slug has no page and is left out of the player pages.',
      group: 'data',
      name: `slug`,
      options: {
        slugify: (input: string) => slugify(input, { lower: true, strict: true }),
        source: 'name'
      },
      title: `Slug`,
      type: `slug`,
      validation: (Rule) => Rule.required()
    },
    {
      description: 'Position on the Select Player screen, lowest first.',
      group: 'data',
      name: `order`,
      title: `Order`,
      type: `number`
    },
    {
      description: 'The short line above the name, e.g. "PLAYER 01 — GROOM".',
      group: 'data',
      name: `eyebrow`,
      title: `Eyebrow`,
      type: `string`
    },
    {
      description: 'The compressed GLB export. Only .glb is accepted.',
      group: 'model',
      name: `model`,
      options: {
        accept: '.glb'
      },
      title: `Model (GLB)`,
      type: `file`
    },
    {
      description:
        'Each name must match a clip inside the GLB exactly — copy it verbatim from the file. The names differ per character, so there is no shared list and no default worth pre-filling.',
      fields: [
        {
          description: 'Looped on the home screen while this character waits to be picked.',
          name: `idle`,
          title: `Idle`,
          type: `string`
        },
        {
          description: 'Played when a guest hovers or taps this character on the home screen.',
          name: `hover`,
          title: `Hover Or Tap`,
          type: `string`
        },
        {
          description: `Played on this character's own player page, beside the card.`,
          name: `feature`,
          title: `Player Page`,
          type: `string`
        }
      ],
      group: 'model',
      name: `clips`,
      options: {
        collapsible: false
      },
      title: `Animation Clips`,
      type: `object`
    },
    {
      description: 'Shown whenever the 3D is unavailable — no WebGL, reduced motion, or a failed load.',
      group: 'model',
      name: `fallbackImage`,
      title: `Fallback Image`,
      type: `imageElementSimple`
    },
    {
      description: 'The readout in the player card header, e.g. "LV. 32".',
      group: 'card',
      name: `level`,
      title: `Level`,
      type: `string`
    },
    {
      description:
        'Add, remove, rename and reorder freely. The card groups all text stats above all meter stats regardless of the order here, so the two can be interleaved without breaking the layout.',
      group: 'card',
      name: `stats`,
      of: [{ type: 'playerTextStat' }, { type: 'playerMeterStat' }],
      title: `Player Card Stats`,
      type: `array`
    }
  ],
  groups: [
    {
      default: true,
      icon: FiDatabase,
      name: 'data',
      title: 'Data'
    },
    {
      icon: TbCube3dSphere,
      name: 'model',
      title: '3D Model'
    },
    {
      icon: TbCards,
      name: 'card',
      title: 'Player Card'
    }
  ],
  icon: TbDeviceGamepad2,
  name: `player`,
  orderings: [
    {
      by: [{ direction: 'asc', field: 'order' }],
      name: 'order',
      title: 'Select Player Order'
    }
  ],
  preview: {
    prepare(selection) {
      const { name, eyebrow, media } = selection;
      return {
        media,
        subtitle: eyebrow,
        title: name || 'Player'
      };
    },
    select: {
      eyebrow: 'eyebrow',
      media: 'fallbackImage',
      name: 'name'
    }
  },
  title: `Player`,
  type: `document`
});

export { player, playerMeterStat, playerTextStat };
export type { IPlayerDocument, IPlayerMeterStat, IPlayerStat, IPlayerTextStat };
