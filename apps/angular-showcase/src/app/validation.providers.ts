import { APP_INITIALIZER } from '@angular/core';
import { ValidationProviderService } from '@validation-rules/angular';
import { SampleFormValidationPolicy } from './components/sample-form/sample-form.validation.policy';
import {
  BillingAddressValidationPolicy,
  PersonalInfoValidationPolicy,
  ShippingAddressValidationPolicy
} from './components/complex-form/complex-form.validation.policy';
import { PerformanceConfigValidationPolicy } from './components/performance-form/performance-form.validation.policy';

export function registerValidationPolicies(validationProvider: ValidationProviderService): () => void {
  return () => {
    validationProvider.register('SampleForm', new SampleFormValidationPolicy());
    validationProvider.register('PersonalInfo', new PersonalInfoValidationPolicy());
    validationProvider.register('ShippingAddress', new ShippingAddressValidationPolicy());
    validationProvider.register('BillingAddress', new BillingAddressValidationPolicy());
    validationProvider.register('PerformanceConfig', new PerformanceConfigValidationPolicy());

    validationProvider.registerFormGroupPolicy('mainForm', 'SampleForm');
    validationProvider.registerFormGroupPolicy('personalInfo', 'PersonalInfo');
    validationProvider.registerFormGroupPolicy('shippingInfo', 'ShippingAddress');
    validationProvider.registerFormGroupPolicy('billingInfo', 'BillingAddress');
    validationProvider.registerFormGroupPolicy('perfConfig', 'PerformanceConfig');

    validationProvider.registerPolicyGroup('checkout', {
      policies: ['PersonalInfo', 'ShippingAddress', 'BillingAddress'],
      formGroups: ['personalInfo', 'shippingInfo', 'billingInfo']
    });
  };
}

export const validationProviders = [
  {
    provide: APP_INITIALIZER,
    useFactory: registerValidationPolicies,
    deps: [ValidationProviderService],
    multi: true
  }
];
