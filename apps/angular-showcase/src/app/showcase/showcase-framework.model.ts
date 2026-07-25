export type ShowcaseFramework = 'bootstrap' | 'material' | 'tailwind';

export type ShowcaseTab = 'sample' | 'complex' | 'performance';

export interface ShowcaseFrameworkMeta {
  id: ShowcaseFramework;
  label: string;
  description: string;
  strategy: string;
}

export const SHOWCASE_FRAMEWORKS: ShowcaseFrameworkMeta[] = [
  {
    id: 'bootstrap',
    label: 'Bootstrap 5',
    description: 'Bootstrap form controls with `BootstrapValidationDisplayStrategy` (`is-invalid`, `invalid-feedback`).',
    strategy: 'BootstrapValidationDisplayStrategy'
  },
  {
    id: 'material',
    label: 'Angular Material',
    description: 'Material form fields with `MaterialValidationDisplayStrategy` (`mat-error`, `mat-form-field-invalid`).',
    strategy: 'MaterialValidationDisplayStrategy'
  },
  {
    id: 'tailwind',
    label: 'Tailwind CSS',
    description: 'Utility-class styling via `GenericValidationDisplayStrategy` with Tailwind error classes.',
    strategy: 'GenericValidationDisplayStrategy'
  }
];

export const SHOWCASE_TABS: { id: ShowcaseTab; label: string; description: string }[] = [
  {
    id: 'sample',
    label: 'Sample Form',
    description: 'Every HTML control type with a single validation policy.'
  },
  {
    id: 'complex',
    label: 'Complex Form',
    description: 'Multi-section checkout with conditional billing and policy groups.'
  },
  {
    id: 'performance',
    label: 'Performance Form',
    description: 'Dynamically generated sections for validation benchmarks.'
  }
];
