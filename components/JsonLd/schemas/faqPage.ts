import type { FAQPage, WithContext } from 'schema-dts';

// Note: Google restricted FAQ rich results to authoritative government/health sites only (Aug 2023).
// This markup no longer triggers rich results for standard websites, but is retained because it
// still helps AI platforms and other consumers understand content structure.

interface FaqPageProps {
  faqs: {
    question: string;
    answer: string;
  }[];
}

const faqPage = (props: FaqPageProps): WithContext<FAQPage> => {
  const { faqs } = props;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      },
      name: faq.question
    }))
  };
};

export default faqPage;
