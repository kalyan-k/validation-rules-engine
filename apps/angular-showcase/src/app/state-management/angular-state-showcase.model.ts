import {
  type FormGroupStatus,
  type ValidationModel,
  type ValidationPolicy,
  type ValidationResult,
  type Validator,
  type ValidatorHelper
} from '@validation-rules/angular';

export type AngularStateStrategyId =
  | 'template-driven'
  | 'reactive-forms'
  | 'ngrx'
  | 'ngxs'
  | 'akita'
  | 'elf'
  | 'rx-angular-state'
  | 'signals'
  | 'custom-rxjs-store';

export type AngularStatePage = 'overview' | 'simple' | 'complex' | 'performance';
export type ComplexPolicyMode = 'standard' | 'regulated';

export interface AngularStateStrategy {
  id: AngularStateStrategyId;
  label: string;
  shortLabel: string;
  packageName: string;
  docsSlug: string;
  statePattern: string;
  description: string;
  enterpriseUseCases: string[];
  whyChoose: string[];
  integration: string;
  architecture: string[];
}

export interface AngularStatePageLink {
  page: AngularStatePage;
  label: string;
  path: string;
  summary: string;
}

export const ANGULAR_STATE_PAGES: AngularStatePageLink[] = [
  {
    page: 'overview',
    label: 'Overview',
    path: '',
    summary: 'What this state option is, when teams choose it, and how validation is wired.'
  },
  {
    page: 'simple',
    label: 'Simple Form',
    path: 'simple',
    summary: 'A user profile form with inline validation, summaries, submit, reset, policies, and groups.'
  },
  {
    page: 'complex',
    label: 'Complex Form',
    path: 'complex',
    summary: 'An enterprise onboarding workflow with nested objects, arrays, conditionals, groups, and programmatic validation.'
  },
  {
    page: 'performance',
    label: 'Performance Form',
    path: 'performance',
    summary: 'The shared generated-form benchmark with sections, controls per section, and random seed.'
  }
];

export const ANGULAR_STATE_STRATEGIES: AngularStateStrategy[] = [
  {
    id: 'template-driven',
    label: 'Template Driven Forms (ngModel)',
    shortLabel: 'ngModel',
    packageName: '@angular/forms',
    docsSlug: 'angular-ngmodel',
    statePattern: 'Template model mutation through ngModel',
    description: 'Template-driven forms keep the model close to the template and let Angular update object properties through ngModel bindings.',
    enterpriseUseCases: [
      'Small-to-medium workflow screens with straightforward form ownership.',
      'Legacy Angular applications that already use ngModel heavily.',
      'Admin tools where template readability matters more than explicit reducer orchestration.'
    ],
    whyChoose: [
      'Lowest ceremony for Angular teams.',
      'Excellent for examples, prototypes, and forms with simple page-local state.',
      'Validation Rules can attach directly to controls through policyValidator.'
    ],
    integration: '@validation-rules/angular validates the same model object that ngModel updates, while form groups and summaries are registered by policy name.',
    architecture: ['Template controls', 'ngModel updates form model', 'policyValidator evaluates field policy', 'Validation summaries read model results']
  },
  {
    id: 'reactive-forms',
    label: 'Reactive Forms',
    shortLabel: 'Reactive',
    packageName: '@angular/forms',
    docsSlug: 'angular-reactive-forms',
    statePattern: 'FormGroup-owned state synchronized with a validation model',
    description: 'Reactive Forms centralize form state in FormGroup and FormControl instances so complex workflows can be composed in TypeScript.',
    enterpriseUseCases: [
      'Large forms with dynamic sections and programmatic control creation.',
      'Screens that need explicit value/status streams.',
      'Applications that coordinate form state with APIs, stores, and route lifecycles.'
    ],
    whyChoose: [
      'Strong TypeScript ergonomics for generated and nested forms.',
      'Good fit for enterprise workflows with programmatic validation.',
      'Validation Rules policies stay framework-neutral while Reactive Forms handles control orchestration.'
    ],
    integration: '@validation-rules/angular validates a plain policy model and can mirror the result back into FormGroup workflows when needed.',
    architecture: ['FormGroup controls', 'Value snapshot model', 'Validation Rules policy', 'Angular control errors and summaries']
  },
  {
    id: 'ngrx',
    label: 'NgRx',
    shortLabel: 'NgRx',
    packageName: '@ngrx/store',
    docsSlug: 'angular-state-ngrx',
    statePattern: 'Action -> reducer -> selector',
    description: 'NgRx is a Redux-inspired Angular store with actions, reducers, selectors, and predictable immutable state transitions.',
    enterpriseUseCases: [
      'Large Angular applications with shared state across feature modules.',
      'Auditable workflows where actions document every transition.',
      'Teams that rely on reducer tests, selectors, effects, and time-travel debugging.'
    ],
    whyChoose: [
      'Highly explicit state transitions.',
      'Scales well for cross-page enterprise workflows.',
      'Validation payloads can be stored alongside form drafts without coupling policies to NgRx.'
    ],
    integration: '@validation-rules/angular validates a cloned draft model, then NgRx commits the validation result snapshot through an action.',
    architecture: ['Component dispatches action', 'NgRx reducer stores draft', 'Validation Rules evaluates clone', 'Validated snapshot dispatches back to store']
  },
  {
    id: 'ngxs',
    label: 'NGXS',
    shortLabel: 'NGXS',
    packageName: '@ngxs/store',
    docsSlug: 'angular-state-ngxs',
    statePattern: 'Action classes and decorated state handlers',
    description: 'NGXS provides class-based Angular state management using action classes, @State metadata, selectors, and StateContext patching.',
    enterpriseUseCases: [
      'Domain-driven Angular teams that prefer class-based state files.',
      'Applications that want store semantics with less reducer boilerplate.',
      'Feature modules that group handlers, selectors, and defaults around a domain.'
    ],
    whyChoose: [
      'Concise state handlers with Angular-friendly dependency injection.',
      'Typed action classes make workflow intent easy to trace.',
      'Validation results can be patched into the same feature state as the form draft.'
    ],
    integration: '@validation-rules/angular produces validation results on the model; NGXS action handlers patch the validated model into state.',
    architecture: ['Component dispatches action class', 'NGXS @State handler patches draft', 'Validation Rules evaluates model', 'Validated model is patched back']
  },
  {
    id: 'akita',
    label: 'Akita',
    shortLabel: 'Akita',
    packageName: '@datorama/akita',
    docsSlug: 'angular-state-akita',
    statePattern: 'Store + Query',
    description: 'Akita models state as stores and queries so applications can update state imperatively while reading focused observable slices.',
    enterpriseUseCases: [
      'Feature stores with query-driven read models.',
      'CRUD-heavy domains that benefit from store/query separation.',
      'Teams migrating from services to structured state without full Redux ceremony.'
    ],
    whyChoose: [
      'Clear split between writes and reads.',
      'Lightweight state transitions that still feel structured.',
      'Validation state can live beside the form draft and be selected by queries.'
    ],
    integration: '@validation-rules/angular validates the feature model, then the Akita store updates the draft and validation metadata as one snapshot.',
    architecture: ['Component updates Akita store', 'Query exposes current draft', 'Validation Rules evaluates draft', 'Store updates validation snapshot']
  },
  {
    id: 'elf',
    label: 'Elf',
    shortLabel: 'Elf',
    packageName: '@ngneat/elf',
    docsSlug: 'angular-state-elf',
    statePattern: 'Tiny reactive store with immutable reducers',
    description: 'Elf is a small reactive store toolkit built around composable stores, immutable update reducers, and RxJS-friendly queries.',
    enterpriseUseCases: [
      'Feature-local state that needs structure without heavyweight global conventions.',
      'Teams that want store composition and small bundle overhead.',
      'Applications that already lean on RxJS for view-state streams.'
    ],
    whyChoose: [
      'Minimal API surface and predictable updates.',
      'Easy to keep feature stores close to the component tree.',
      'Validation policies remain independent from the store implementation.'
    ],
    integration: '@validation-rules/angular evaluates the plain model; Elf setProps commits the updated draft and validation results.',
    architecture: ['Elf store owns feature slice', 'setProps commits model changes', 'Validation Rules evaluates snapshot', 'Selectors render validation state']
  },
  {
    id: 'rx-angular-state',
    label: 'RxAngular State',
    shortLabel: 'RxAngular',
    packageName: '@rx-angular/state',
    docsSlug: 'angular-state-rx-angular',
    statePattern: 'Component-scoped reactive state',
    description: 'RxAngular State manages local Angular state through RxJS streams, computed selections, and component-scoped lifecycle cleanup.',
    enterpriseUseCases: [
      'High-performance component state with observable composition.',
      'Screens that need isolated local stores rather than global application state.',
      'Teams optimizing render behavior in complex Angular views.'
    ],
    whyChoose: [
      'Great fit for local reactive state and performance-sensitive screens.',
      'Lifecycle cleanup is scoped to the component provider.',
      'Validation results can flow as a state slice without global store overhead.'
    ],
    integration: '@validation-rules/angular writes results to the model while RxAngular State stores the current draft and validation lifecycle.',
    architecture: ['Component-scoped RxState', 'State slice stores form model', 'Validation Rules evaluates model', 'RxState publishes validated snapshot']
  },
  {
    id: 'signals',
    label: 'Signals',
    shortLabel: 'Signals',
    packageName: '@angular/core',
    docsSlug: 'angular-state-signals',
    statePattern: 'Signal and computed state',
    description: 'Angular Signals provide fine-grained reactive primitives for local and shared state with synchronous reads and computed values.',
    enterpriseUseCases: [
      'Modern Angular screens that prefer signal-first state.',
      'Forms that benefit from synchronous reads and fine-grained invalidation.',
      'Shared services that expose stable signal slices to multiple components.'
    ],
    whyChoose: [
      'Simple mental model for local state.',
      'Fine-grained updates without broad observable subscription chains.',
      'Validation Rules can validate the object represented by a signal snapshot.'
    ],
    integration: '@validation-rules/angular validates the current signal snapshot; the signal is updated with validation results and group status.',
    architecture: ['Signal stores model snapshot', 'Template reads signal-backed state', 'Validation Rules evaluates plain model', 'Computed values summarize results']
  },
  {
    id: 'custom-rxjs-store',
    label: 'Custom RxJS Store',
    shortLabel: 'RxJS Store',
    packageName: 'rxjs',
    docsSlug: 'angular-state-custom-rxjs-store',
    statePattern: 'BehaviorSubject-backed feature store',
    description: 'A custom RxJS store uses BehaviorSubject and pure update functions to create lightweight application-specific state management.',
    enterpriseUseCases: [
      'Teams that need a small feature store without adopting a framework.',
      'Libraries and embedded widgets where dependencies must stay minimal.',
      'Incremental migrations from service state to formal store libraries.'
    ],
    whyChoose: [
      'Transparent implementation and no store framework lock-in.',
      'Works well when the state model is small and feature-scoped.',
      'Validation Rules keeps policy logic separate from custom stream plumbing.'
    ],
    integration: '@validation-rules/angular validates the current BehaviorSubject value and pushes the validated snapshot back into the stream.',
    architecture: ['BehaviorSubject owns snapshot', 'Update functions emit immutable copies', 'Validation Rules evaluates model', 'Subscribers render latest state']
  }
];

export const SIMPLE_FORM_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'country',
  'startDate',
  'accepted',
  'contactPreference',
  'role'
];

export class AngularStateSimpleModel implements ValidationModel {
  [key: string]: unknown;

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  country = '';
  startDate = '';
  accepted = false;
  contactPreference = '';
  role = '';
  angularStateSimpleProfile?: FormGroupStatus;
  angularStateSimple?: FormGroupStatus;
  validationResults?: ValidationResult[];
  requiredResults?: Array<{ propertyName: string; isRequired: boolean; hasRequiredError: boolean }>;
}

export interface AngularStateAddress {
  type: 'Headquarters' | 'Billing' | 'Shipping' | 'Regional';
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface AngularStateContact {
  name: string;
  email: string;
  phone: string;
  relationship: 'Sponsor' | 'Approver' | 'Technical' | 'Billing';
}

export class AngularStateComplexModel implements ValidationModel {
  [key: string]: unknown;

  profile = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    employeeType: '',
    secondaryEmailEnabled: false,
    secondaryEmail: ''
  };
  addresses: AngularStateAddress[] = [emptyAngularStateAddress('Headquarters')];
  contacts: AngularStateContact[] = [emptyAngularStateContact('Sponsor')];
  preferences = {
    startDate: '',
    contractSigned: false,
    notificationFrequency: ''
  };
  compliance = {
    approver: '',
    riskTier: '',
    caseId: ''
  };
  policyMode: ComplexPolicyMode = 'standard';
  identityGroup?: FormGroupStatus;
  addressGroup?: FormGroupStatus;
  contactGroup?: FormGroupStatus;
  complianceGroup?: FormGroupStatus;
  angularStateComplex?: FormGroupStatus;
  validationResults?: ValidationResult[];
  requiredResults?: Array<{ propertyName: string; isRequired: boolean; hasRequiredError: boolean }>;
}

export function strategyById(id: string | null | undefined): AngularStateStrategy {
  return ANGULAR_STATE_STRATEGIES.find((strategy) => strategy.id === id) ?? ANGULAR_STATE_STRATEGIES[0];
}

export function emptyAngularStateAddress(type: AngularStateAddress['type'] = 'Regional'): AngularStateAddress {
  return {
    type,
    line1: '',
    line2: '',
    city: '',
    region: '',
    postalCode: '',
    country: ''
  };
}

export function emptyAngularStateContact(relationship: AngularStateContact['relationship'] = 'Technical'): AngularStateContact {
  return {
    name: '',
    email: '',
    phone: '',
    relationship
  };
}

export function createSimpleModel(): AngularStateSimpleModel {
  return new AngularStateSimpleModel();
}

export function createComplexModel(): AngularStateComplexModel {
  return new AngularStateComplexModel();
}

export function sampleSimpleModel(): AngularStateSimpleModel {
  return Object.assign(new AngularStateSimpleModel(), {
    firstName: 'Asha',
    lastName: 'Raman',
    email: 'asha.raman@example.com',
    phone: '212-555-0134',
    country: 'United States',
    startDate: '2026-08-15',
    accepted: true,
    contactPreference: 'email',
    role: 'Product Manager'
  });
}

export function sampleComplexModel(): AngularStateComplexModel {
  const model = new AngularStateComplexModel();
  model.profile = {
    firstName: 'Asha',
    lastName: 'Raman',
    email: 'asha.raman@example.com',
    phone: '212-555-0134',
    role: 'Director',
    employeeType: 'Full-time',
    secondaryEmailEnabled: true,
    secondaryEmail: 'asha.backup@example.com'
  };
  model.addresses = [
    {
      type: 'Headquarters',
      line1: '1 Market Street',
      line2: 'Suite 400',
      city: 'New York',
      region: 'NY',
      postalCode: '10001',
      country: 'United States'
    },
    {
      type: 'Billing',
      line1: '500 Finance Ave',
      line2: '',
      city: 'Chicago',
      region: 'IL',
      postalCode: '60601',
      country: 'United States'
    }
  ];
  model.contacts = [
    {
      name: 'Maya Sponsor',
      email: 'maya.sponsor@example.com',
      phone: '646-555-0198',
      relationship: 'Sponsor'
    },
    {
      name: 'Leo Technical',
      email: 'leo.technical@example.com',
      phone: '415-555-0167',
      relationship: 'Technical'
    }
  ];
  model.preferences = {
    startDate: '2026-09-01',
    contractSigned: true,
    notificationFrequency: 'Weekly'
  };
  model.compliance = {
    approver: 'Priya Compliance',
    riskTier: 'Medium',
    caseId: ''
  };
  model.policyMode = 'standard';
  return model;
}

export function invalidComplexModel(): AngularStateComplexModel {
  const model = new AngularStateComplexModel();
  model.profile = {
    firstName: '',
    lastName: '',
    email: 'not-an-email',
    phone: 'abc',
    role: '',
    employeeType: '',
    secondaryEmailEnabled: true,
    secondaryEmail: 'bad'
  };
  model.addresses = [
    {
      type: 'Headquarters',
      line1: '',
      line2: '',
      city: '',
      region: '',
      postalCode: 'x',
      country: ''
    }
  ];
  model.contacts = [
    {
      name: '',
      email: 'bad-contact-email',
      phone: '',
      relationship: 'Sponsor'
    }
  ];
  model.preferences = {
    startDate: 'bad-date',
    contractSigned: false,
    notificationFrequency: ''
  };
  model.compliance = {
    approver: '',
    riskTier: '',
    caseId: ''
  };
  model.policyMode = 'regulated';
  return model;
}

export class AngularStateSimplePolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('firstName').isRequired('First name is required'),
      v.validateFor('lastName').isRequired('Last name is required'),
      v.validateFor('email').isRequired('Email is required').isEmail('Enter a valid email address'),
      v.validateFor('phone').isRequired('Phone is required').isPhone('Enter a valid US phone number'),
      v.validateFor('country').isRequired('Country is required'),
      v.validateFor('startDate').isRequired('Date is required').isDate('Enter a valid date'),
      v.validateFor('accepted').isChecked('You must accept the policy terms'),
      v.validateFor('contactPreference').isRequired('Choose a contact preference'),
      v.validateFor('role').isRequired('Choose a role')
    ];
  }
}

export class AngularStateComplexIdentityPolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor('profile.firstName').isRequired('First name is required'),
      v.validateFor('profile.lastName').isRequired('Last name is required'),
      v.validateFor('profile.email').isRequired('Email is required').isEmail('Enter a valid email address'),
      v.validateFor('profile.phone').isRequired('Phone is required').isPhone('Enter a valid US phone number'),
      v.validateFor('profile.role').isRequired('Role is required'),
      v.validateFor('profile.employeeType').isRequired('Employee type is required'),
      v.validateFor('preferences.startDate').isRequired('Start date is required').isDate('Enter a valid start date'),
      v.validateFor('preferences.contractSigned').isChecked('Contract confirmation is required'),
      v.validateFor('preferences.notificationFrequency').isRequired('Notification frequency is required')
    ];
  }
}

export class AngularStateComplexAddressPolicy implements ValidationPolicy {
  constructor(private readonly addressCount = 1) {}

  addValidations(v: ValidatorHelper): Validator[] {
    return Array.from({ length: this.addressCount }, (_, index) => [
      v.validateFor(`addresses.${index}.type`).isRequired('Address type is required'),
      v.validateFor(`addresses.${index}.line1`).isRequired('Street address is required'),
      v.validateFor(`addresses.${index}.city`).isRequired('City is required'),
      v.validateFor(`addresses.${index}.region`).isRequired('State or region is required'),
      v.validateFor(`addresses.${index}.postalCode`)
        .isRequired('Postal code is required')
        .regEx('Enter a postal code with 3 to 10 letters, numbers, spaces, or dashes', '^[A-Za-z0-9 -]{3,10}$'),
      v.validateFor(`addresses.${index}.country`).isRequired('Country is required')
    ]).flat();
  }
}

export class AngularStateComplexContactsPolicy implements ValidationPolicy {
  constructor(private readonly contactCount = 1) {}

  addValidations(v: ValidatorHelper): Validator[] {
    return Array.from({ length: this.contactCount }, (_, index) => [
      v.validateFor(`contacts.${index}.name`).isRequired('Contact name is required'),
      v.validateFor(`contacts.${index}.email`).isRequired('Contact email is required').isEmail('Enter a valid contact email'),
      v.validateFor(`contacts.${index}.phone`).isRequired('Contact phone is required').isPhone('Enter a valid US phone number'),
      v.validateFor(`contacts.${index}.relationship`).isRequired('Contact relationship is required')
    ]).flat();
  }
}

export class AngularStateComplexCompliancePolicy implements ValidationPolicy {
  addValidations(v: ValidatorHelper): Validator[] {
    return [
      v.validateFor(
        'profile.secondaryEmail',
        (model: AngularStateComplexModel) => model.profile.secondaryEmailEnabled
      ).isRequired('Secondary email is required when enabled').isEmail('Enter a valid secondary email'),
      v.validateFor('compliance.approver').isRequired('Compliance approver is required'),
      v.validateFor('compliance.riskTier').isRequired('Risk tier is required'),
      v.validateFor(
        'compliance.caseId',
        (model: AngularStateComplexModel) => model.policyMode === 'regulated'
      ).isRequired('Case ID is required for regulated policy mode')
    ];
  }
}
