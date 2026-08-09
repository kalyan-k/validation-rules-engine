export type ApplicationKind = 'documentation' | 'showcase';

export interface ApplicationDefinition {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  kind: ApplicationKind;
  url: string;
  healthUrl: string;
  startScript: string;
  startArgs?: string[];
  documentationUrl: string;
  tags: string[];
  showcaseLinks?: Array<{ label: string; url: string; documentationUrl: string }>;
}

function configuredValue(names: string | string[]): string | undefined {
  const candidates = Array.isArray(names) ? names : [names];
  return candidates.map((name) => process.env[name]).find((value): value is string => Boolean(value));
}

function configuredPort(names: string | string[], fallback: number): number {
  const value = Number.parseInt(configuredValue(names) ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function configuredBaseUrl(names: string | string[], fallback: string): string {
  return (configuredValue(names) ?? fallback).replace(/\/$/, '');
}

export const portalPort = configuredPort('VRE_PORTAL_PORT', 4200);
const docsPort = configuredPort('VRE_DOCS_PORT', 4201);
const angularShowcasePort = configuredPort('VRE_ANGULAR_SHOWCASE_PORT', 4202);
const reactShowcasePort = configuredPort('VRE_REACT_SHOWCASE_PORT', 4204);
const vanillaShowcasePort = configuredPort('VRE_VANILLA_SHOWCASE_PORT', 4205);
export const singleHost = process.env['VRE_SINGLE_HOST'] === '1' || process.argv.includes('--single-host');
const useStaticShowcases = process.env['VRE_STATIC_SHOWCASES'] === '1';
const publicBaseUrl = configuredBaseUrl('VRE_PUBLIC_URL', '');
export const platformUrls = singleHost
  ? {
      portal: publicBaseUrl,
      docs: publicBaseUrl,
      angular: `${publicBaseUrl}/showcases/angular`,
      react: `${publicBaseUrl}/showcases/react`,
      vanilla: `${publicBaseUrl}/showcases/vanilla`
    }
  : {
      portal: configuredBaseUrl('VRE_PORTAL_URL', `http://127.0.0.1:${portalPort}`),
      docs: configuredBaseUrl('VRE_DOCS_URL', `http://127.0.0.1:${docsPort}`),
      angular: configuredBaseUrl('VRE_ANGULAR_SHOWCASE_URL', `http://127.0.0.1:${angularShowcasePort}`),
      react: configuredBaseUrl('VRE_REACT_SHOWCASE_URL', `http://127.0.0.1:${reactShowcasePort}`),
      vanilla: configuredBaseUrl('VRE_VANILLA_SHOWCASE_URL', `http://127.0.0.1:${vanillaShowcasePort}`)
    };

function showcaseStartScript(defaultScript: string): string {
  return useStaticShowcases ? 'serve:static' : defaultScript;
}

function showcaseHealthUrl(url: string): string {
  return singleHost || useStaticShowcases ? `${url}/health` : url;
}

function staticShowcaseArgs(root: string, port: number, name: string): string[] {
  return ['--root', root, '--host', '127.0.0.1', '--port', String(port), '--name', name, '--spa', 'true'];
}

export const applicationDefinitions: ApplicationDefinition[] = [
  {
    id: 'docs',
    title: 'Documentation',
    shortTitle: 'Docs',
    description: 'Concepts, guides, public APIs, architecture, testing, and migration guidance.',
    kind: 'documentation',
    url: `${platformUrls.docs}/docs/overview`,
    healthUrl: singleHost ? '/docs/health' : `${platformUrls.docs}/health`,
    startScript: 'serve:docs:portal',
    documentationUrl: `${platformUrls.docs}/docs/overview`,
    tags: ['Guides', 'API', 'Architecture']
  },
  {
    id: 'vanilla-showcase',
    title: 'Vanilla JS Showcase',
    shortTitle: 'Vanilla JS',
    description: 'Framework-free TypeScript forms that call @validation-rules-engine/core directly for simple, complex, and large-form validation.',
    kind: 'showcase',
    url: platformUrls.vanilla,
    healthUrl: showcaseHealthUrl(platformUrls.vanilla),
    startScript: showcaseStartScript('serve:vanilla-showcase'),
    startArgs: useStaticShowcases
      ? staticShowcaseArgs('dist/showcases/vanilla', vanillaShowcasePort, 'vanilla-showcase')
      : ['--host', '127.0.0.1', '--port', String(vanillaShowcasePort)],
    documentationUrl: `${platformUrls.docs}/docs/core-package`,
    tags: ['TypeScript', 'Vite', 'Core API'],
    showcaseLinks: [
      ['Simple Form', 'simple'],
      ['Complex Form', 'complex'],
      ['Performance Form', 'performance']
    ].map(([label, slug]) => ({
      label: label!,
      url: `${platformUrls.vanilla}/${slug}`,
      documentationUrl: `${platformUrls.docs}/docs/core-examples`
    }))
  },
  {
    id: 'angular-showcase',
    title: 'Angular Showcase',
    shortTitle: 'Angular',
    description: 'Angular validation showcases with UI framework examples and comparable state management implementations.',
    kind: 'showcase',
    url: platformUrls.angular,
    healthUrl: showcaseHealthUrl(platformUrls.angular),
    startScript: showcaseStartScript('serve:angular-showcase'),
    startArgs: useStaticShowcases
      ? staticShowcaseArgs('dist/showcases/angular', angularShowcasePort, 'angular-showcase')
      : ['--host', '127.0.0.1', '--port', String(angularShowcasePort)],
    documentationUrl: `${platformUrls.docs}/docs/angular`,
    tags: ['ngModel', 'Reactive Forms', 'NgRx', 'NGXS', 'Signals'],
    showcaseLinks: [
      ['Template Driven', 'template-driven', 'angular-ngmodel'],
      ['Reactive Forms', 'reactive-forms', 'angular-reactive-forms'],
      ['NgRx', 'ngrx', 'angular-state-ngrx'],
      ['NGXS', 'ngxs', 'angular-state-ngxs'],
      ['Akita', 'akita', 'angular-state-akita'],
      ['Elf', 'elf', 'angular-state-elf'],
      ['RxAngular State', 'rx-angular-state', 'angular-state-rx-angular'],
      ['Signals', 'signals', 'angular-state-signals'],
      ['Custom RxJS Store', 'custom-rxjs-store', 'angular-state-custom-rxjs-store']
    ].map(([label, slug, docSlug]) => ({
      label: label!,
      url: `${platformUrls.angular}/state/${slug}`,
      documentationUrl: `${platformUrls.docs}/docs/${docSlug}`
    }))
  },
  {
    id: 'react-showcase',
    title: 'React Showcase',
    shortTitle: 'React',
    description: 'Hooks-first controlled forms with nested policies, dynamic groups, accessibility, and measured large-form behavior.',
    kind: 'showcase',
    url: platformUrls.react,
    healthUrl: showcaseHealthUrl(platformUrls.react),
    startScript: showcaseStartScript('serve:react-showcase'),
    startArgs: useStaticShowcases
      ? staticShowcaseArgs('dist/showcases/react', reactShowcasePort, 'react-showcase')
      : ['--host', '127.0.0.1', '--port', String(reactShowcasePort)],
    documentationUrl: `${platformUrls.docs}/docs/react-overview`,
    tags: ['React', 'Hooks', 'Seven state integrations'],
    showcaseLinks: [
      ['Local State', 'local-state'],
      ['Redux Toolkit', 'redux-toolkit'],
      ['Zustand', 'zustand'],
      ['Jotai', 'jotai'],
      ['Recoil', 'recoil'],
      ['MobX', 'mobx'],
      ['Context API', 'context']
    ].map(([label, slug]) => ({
      label: label!,
      url: `${platformUrls.react}/state/${slug}`,
      documentationUrl: `${platformUrls.docs}/docs/react-state-${slug}`
    }))
  }
];
