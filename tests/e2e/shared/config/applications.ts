import { applicationBaseUrls, type ApplicationBaseUrls } from '../../../../playwright/config/applications';

export type { ApplicationBaseUrls };

export const baseUrls = applicationBaseUrls();

export const angularStrategies = [
  { id: 'template-driven', label: 'Template Driven Forms (ngModel)', tag: '@template-driven' },
  { id: 'reactive-forms', label: 'Reactive Forms', tag: '@reactive-forms' },
  { id: 'ngrx', label: 'NgRx', tag: '@ngrx' },
  { id: 'ngxs', label: 'NGXS', tag: '@ngxs' },
  { id: 'akita', label: 'Akita', tag: '@akita' },
  { id: 'elf', label: 'Elf', tag: '@elf' },
  { id: 'rx-angular-state', label: 'RxAngular State', tag: '@rx-angular-state' },
  { id: 'signals', label: 'Signals', tag: '@signals' },
  { id: 'custom-rxjs-store', label: 'Custom RxJS Store', tag: '@custom-rxjs-store' }
] as const;

export const reactStrategies = [
  { id: 'local-state', label: 'Local State', tag: '@local-state' },
  { id: 'redux-toolkit', label: 'Redux Toolkit', tag: '@redux-toolkit' },
  { id: 'zustand', label: 'Zustand', tag: '@zustand' },
  { id: 'jotai', label: 'Jotai', tag: '@jotai' },
  { id: 'recoil', label: 'Recoil', tag: '@recoil' },
  { id: 'mobx', label: 'MobX', tag: '@mobx' },
  { id: 'context', label: 'Context API', tag: '@context' }
] as const;

export const statePages = [
  { slug: '', label: 'Overview' },
  { slug: 'simple', label: 'Simple Form' },
  { slug: 'complex', label: 'Complex Form' },
  { slug: 'performance', label: 'Performance Form' }
] as const;
