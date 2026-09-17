import type { ReactNode, CSSProperties } from 'react';

interface BlockComponentProps {
  children: ReactNode;
}

export const SupComponent = (props: BlockComponentProps) => <sup>{props.children}</sup>;

export const CenterTextComponent = ({ children }: BlockComponentProps) => {
  const centerStyle: CSSProperties = {
    alignItems: 'center',
    display: 'flex',
    height: '100%',
    justifyContent: 'center',
    textAlign: 'center'
  };

  return <div style={centerStyle}>{children}</div>;
};
