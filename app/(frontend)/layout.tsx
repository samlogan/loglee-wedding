import type { ReactNode } from 'react';

import Layout from '@/components/Layout';

const FrontendLayout = ({ children }: { children: ReactNode }) => <Layout>{children}</Layout>;

export default FrontendLayout;
