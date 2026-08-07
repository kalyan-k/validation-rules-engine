import type { ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/core';
import type { ValidationTarget } from './validation/types';
import type { PerformanceStateModel } from './performance/performance-generator';

export type SimpleStateModel = ValidationTarget & {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type ComplexStateModel = ValidationTarget & {
  personal: {
    firstName: string;
    lastName: string;
    preferredContact: string;
    hasSecondary: boolean;
    secondaryEmail: string;
  };
  addresses: Array<{ street: string; city: string; postalCode: string; country: string }>;
  contacts: Array<{ type: string; value: string }>;
};

export const SIMPLE_INITIAL_MODEL: SimpleStateModel = {
  firstName: '', lastName: '', email: '', phone: ''
};

export const simpleStatePolicy: ValidationPolicy = {
  addValidations(helper: ValidatorHelper): Validator[] {
    return [
      helper.validateFor('firstName').isRequired('First name is required.'),
      helper.validateFor('lastName').isRequired('Last name is required.'),
      helper.validateFor('email').isRequired('Email is required.').isEmail('Enter a valid email address.'),
      helper.validateFor('phone').isPhone('Enter a valid North American phone number.')
    ];
  }
};

export const COMPLEX_INITIAL_MODEL: ComplexStateModel = {
  personal: { firstName: '', lastName: '', preferredContact: '', hasSecondary: false, secondaryEmail: '' },
  addresses: [{ street: '', city: '', postalCode: '', country: '' }],
  contacts: [{ type: 'email', value: '' }]
};

export const COMPLEX_SAMPLE_MODEL: ComplexStateModel = {
  personal: {
    firstName: 'Avery', lastName: 'Patel', preferredContact: 'email', hasSecondary: true,
    secondaryEmail: 'avery.backup@example.com'
  },
  addresses: [
    { street: '100 Market Street', city: 'Philadelphia', postalCode: '19106', country: 'US' },
    { street: '25 King Street', city: 'Toronto', postalCode: 'M5H 1J9', country: 'CA' }
  ],
  contacts: [
    { type: 'email', value: 'avery@example.com' },
    { type: 'phone', value: '215-555-0182' }
  ]
};

export function cloneModel<TModel extends ValidationTarget>(model: TModel): TModel {
  if (typeof structuredClone === 'function') return structuredClone(model);
  return JSON.parse(JSON.stringify(model)) as TModel;
}

export type { PerformanceStateModel };
