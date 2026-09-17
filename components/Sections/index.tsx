import { createElement } from 'react';
import type { ComponentType } from 'react';

import SectionErrorBoundary from '@/components/SectionErrorBoundary';
import Text from '@/components/Text';
import * as sectionsLibrary from '@/sections';
import * as string from '@/tools/helpers/string';

// eslint-disable-next-line typescript-eslint/no-explicit-any -- section components have varying prop shapes
type SectionLibrary = Record<string, ComponentType<any>>;

interface SectionProps {
  sections: {
    _key: string;
    _type: string;
  }[];
  params: SanityPageParams | undefined;
  extraData?: Record<string, unknown>[];
}

const IS_DEV = process.env.NODE_ENV === 'development';

const Sections = (props: SectionProps) => {
  const { sections, params, extraData } = props;
  if (!sections) {
    return null;
  }

  return sections.map((section, index) => {
    const { _key: key, _type: type, ...sectionProps } = section;
    const sectionType = string.toCapitalise(type);
    const sectionComponent = (sectionsLibrary as SectionLibrary)[sectionType];
    const sectionExtraData = extraData?.find((data) => data?.[sectionType]);
    if (sectionComponent) {
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        console.info('Section -----', type, sectionProps);
      }

      /*
       * Contain a throwing section instead of blanking the page.
       *
       * This shape does **not** move the RSC boundary. The section is still built with
       * `createElement` here, in server scope, and passed as `children` — only its rendered output
       * crosses into the client boundary. Passing `sectionComponent` as a *prop* instead would
       * throw "Functions cannot be passed directly to Client Components".
       *
       * `showDetails` is explicit rather than an internal NODE_ENV check: a built Storybook is a
       * production build, and that is exactly where a reviewer needs to see the error. In the app,
       * production renders `null` and keeps the rest of the page.
       */
      return (
        /*
         * `resetKeys={[section]}` so corrected content clears a caught error.
         *
         * The `key` is the Sanity `_key`, which is invariant across edits — so an editor fixing the
         * document and triggering revalidation would otherwise leave the section blank until a full
         * page reload, because React preserves the boundary instance and the error with it. A refetch
         * produces a new `section` object, which is exactly the signal wanted here.
         *
         * Safe only because the boundary compares reset keys against the ones held when the error was
         * captured, not against the previous render's. Comparing consecutive renders would make every
         * parent update look like a change and rethrow on each one.
         */
        <SectionErrorBoundary key={key} name={sectionType} resetKeys={[section]} showDetails={IS_DEV}>
          {createElement(sectionComponent, {
            ...sectionProps,
            extraData: sectionExtraData,
            id: key,
            params,
            type: sectionType
          })}
        </SectionErrorBoundary>
      );
    }
    if (!IS_DEV) {
      return null;
    }
    console.log(`○ Section component not found for type "${type}"`);
    return (
      <section
        key={key}
        style={{
          border: '1px dashed black',
          borderRadius: '8px',
          margin: '24px',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <Text as="p" text={`Missing "${sectionType}" section`} />
      </section>
    );
  });
};

export default Sections;
