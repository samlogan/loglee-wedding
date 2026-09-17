import type { FC } from 'react';

import Section from '@/components/Section';
import Text from '@/components/Text';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IEmbedSection } from '@/tools/sanity/schema/sections/embedSection';

import styles from './styles.module.scss';

/**
 * Get a URL to embed out of whatever the editor pasted.
 *
 * The field is a plain text area labelled "Add embed link", but editors paste one of two things: a
 * bare URL, or the full `<iframe …>` snippet a provider hands them. Both are supported, and neither
 * is injected as markup.
 *
 * **This deliberately does not use `dangerouslySetInnerHTML`.** Anyone who can edit a page in the
 * Studio could otherwise put arbitrary script into every visitor's browser, and a CMS field is not a
 * trust boundary you want to hand that to. Pulling the `src` out and rebuilding a sandboxed iframe
 * gives the same result for real embeds and nothing for an injection attempt.
 */
const resolveEmbedUrl = (value?: string): string | null => {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  // Full embed snippet — take the src and discard the rest of the markup.
  const iframeSrc = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)?.[1];
  const candidate = iframeSrc ?? raw;

  try {
    const url = new URL(candidate);
    // Only http(s). Blocks `javascript:` and `data:` URLs, which an iframe would otherwise honour.
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const EmbedSection: FC<IEmbedSection> = (props) => {
  const { embed } = props;
  const src = resolveEmbedUrl(embed);

  return (
    <Section name="EmbedSection" theme={getSectionTheme(props, 'light')} {...getSectionSpacingProps(props)}>
      {src ? (
        <div className={styles.frame}>
          <iframe
            src={src}
            title="Embedded content"
            className={styles.iframe}
            loading="lazy"
            // `allowFullScreen` covers video embeds; the sandbox keeps everything else contained.
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        /*
         * An empty or unusable value renders a visible, self-explaining placeholder rather than an
         * empty section. An editor who pastes something the field cannot use gets told so in the
         * page, which is where they are looking — not in a console they will never open.
         */
        <div className={styles.placeholder}>
          <Text as="p" text="No embed URL set" weight="medium" alignment="center" />
          <Text
            as="p"
            text="Add an embed link in the Studio. A full <iframe> snippet works too — its src is used."
            size="sm"
            color="themeFgMuted"
            alignment="center"
          />
        </div>
      )}
    </Section>
  );
};

export default EmbedSection;
