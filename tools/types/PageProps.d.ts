type SanityPageParams = Record<string, string | string[]>;

interface SanityPageProps {
  params: Promise<SanityPageParams | undefined>;
}

interface ResolvedPageProps {
  params: SanityPageParams | undefined;
}
