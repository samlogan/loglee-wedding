declare global {
  interface SanityTextBlockChild {
    _key: string;
    _type: string;
    text?: string;
    marks?: string[];
  }

  interface SanityTextBlock {
    _key: string;
    _type: string;
    markDefs: Record<string, unknown>[];
    children: SanityTextBlockChild[];
    style: string;
    level?: number;
    listItem?: string;
  }
}

export type { SanityTextBlock, SanityTextBlockChild };
