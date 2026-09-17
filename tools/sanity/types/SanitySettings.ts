interface SanitySettings {
  title: string;
  slug: {
    _type: string;
    current: string;
  };
  heaader: {
    headerMenuSections: {
      _type: string;
      _key: string;
      title: string;
      links: {
        _type: string;
        _key: string;
        title: string;
        link: {
          _type: string;
          _key: string;
          title: string;
          href: string;
        };
      }[];
    }[];
  };
  _createdAt: string;
  _updatedAt: string;
  _id: string;
  _rev: string;
  _type: string;
  seoTitle: string;
}
