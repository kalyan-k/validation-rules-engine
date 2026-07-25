/// <reference types="vite/client" />

import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'validation-platform-shell': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
      'active-application'?: string;
      'application-name'?: string;
      version?: string;
      'portal-url'?: string;
      'docs-url'?: string;
      'angular-url'?: string;
      'react-url'?: string;
      };
    }
  }
}
