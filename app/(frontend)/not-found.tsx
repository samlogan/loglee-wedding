import Link from '@/components/Link';
import Section from '@/components/Section';
import Text from '@/components/Text';

const NotFound = () => (
  <div id="page-sections">
    <Section>
      <div style={{ marginBottom: '8px' }}>
        <Text text="Page not found" variant="heading" size="lg" weight="medium" />
      </div>
      <div style={{ marginBottom: '24px' }}>
        <Text text="Sorry, we couldn't find the page you're looking for." size="lg" />
      </div>
      <div>
        <Link href="/" text="Go back to the homepage" size="md" theme="primary" outline variant="rounded" />
      </div>
    </Section>
  </div>
);

export default NotFound;
