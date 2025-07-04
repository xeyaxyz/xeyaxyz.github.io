declare module 'react-katex' {
  import * as React from 'react';

  export interface BlockMathProps {
    math: string;
    renderError?: (error: Error) => React.ReactNode;
    errorColor?: string;
  }

  export interface InlineMathProps {
    math: string;
    renderError?: (error: Error) => React.ReactNode;
    errorColor?: string;
  }

  export const BlockMath: React.FC<BlockMathProps>;
  export const InlineMath: React.FC<InlineMathProps>;
} 