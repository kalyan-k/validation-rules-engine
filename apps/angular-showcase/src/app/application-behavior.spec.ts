import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import {
  BootstrapValidationDisplayStrategy,
  MaterialValidationDisplayStrategy,
  TailwindValidationDisplayStrategy,
  VALIDATION_DISPLAY_STRATEGY,
  ValidationProviderService
} from '@validation-rules/angular';
import { AppComponent } from './app.component';
import { ComplexFormComponent } from './components/complex-form/complex-form.component';
import { ComplexFormMaterialComponent } from './components/complex-form/complex-form-material.component';
import { ComplexFormTailwindComponent } from './components/complex-form/complex-form-tailwind.component';
import {
  BillingAddressValidationPolicy,
  PersonalInfoValidationPolicy,
  ShippingAddressValidationPolicy
} from './components/complex-form/complex-form.validation.policy';
import { SampleFormComponent } from './components/sample-form/sample-form.component';
import { SampleFormMaterialComponent } from './components/sample-form/sample-form-material.component';
import { SampleFormTailwindComponent } from './components/sample-form/sample-form-tailwind.component';
import { SampleFormValidationPolicy } from './components/sample-form/sample-form.validation.policy';
import { SHOWCASE_FRAMEWORKS, SHOWCASE_TABS } from './showcase/showcase-framework.model';
import { provideShowcaseFrameworkDisplay } from './showcase/showcase-framework.providers';
import { ShowcaseShellComponent } from './layout/showcase-shell.component';
import { AddressInfo, BillingInfo, ComplexFormModel, PersonalInfo } from './models/complex-form.model';
import { SampleForm } from './models/sample-form.model';
import { FrameworkShowcaseComponent } from './pages/framework-showcase/framework-showcase.component';
import { HomeComponent } from './pages/home/home.component';
import { registerValidationPolicies, validationProviders } from './validation.providers';

describe('showcase models, metadata, pages, and providers', () => {
  it('constructs form models with independent nested defaults', () => {
    const sample = new SampleForm();
    expect(sample).toEqual(jasmine.objectContaining({
      textInput: '', emailInput: '', checkboxInput: false, radioGroup: ''
    }));

    const first = new ComplexFormModel();
    const second = new ComplexFormModel();
    expect(first.personal).toBeInstanceOf(PersonalInfo);
    expect(first.shipping).toBeInstanceOf(AddressInfo);
    expect(first.billing).toBeInstanceOf(BillingInfo);
    expect(first.personal).not.toBe(second.personal);
    expect(first.billing.sameAsShipping).toBeTrue();
  });

  it('exposes three framework choices, showcase tabs, navigation, and quick-start steps', () => {
    expect(SHOWCASE_FRAMEWORKS.map((item) => item.id)).toEqual(['bootstrap', 'material', 'tailwind']);
    expect(SHOWCASE_TABS.map((item) => item.id)).toEqual(['sample', 'complex', 'performance']);
    expect(new ShowcaseShellComponent().frameworks.length).toBe(3);
    expect(new HomeComponent().quickStart.map((item) => item.step)).toEqual([1, 2, 3, 4]);
    expect(new AppComponent().title).toBe('angular-showcase');
  });

  it('selects framework tabs and reacts to route-data changes', () => {
    const data = new BehaviorSubject<any>({ framework: 'material' });
    const component = new FrameworkShowcaseComponent({ data } as unknown as ActivatedRoute);

    component.ngOnInit();
    expect(component.framework).toBe('material');
    expect(component.frameworkMeta?.label).toBe('Angular Material');

    component.setTab('performance');
    expect(component.activeTab).toBe('performance');
    data.next({});
    expect(component.framework).toBe('bootstrap');
  });

  it('registers every static policy, form-group mapping, and checkout policy group', () => {
    const service = new ValidationProviderService();
    const initializer = registerValidationPolicies(service);

    expect(initializer).toBeInstanceOf(Function);
    initializer();

    ['SampleForm', 'PersonalInfo', 'ShippingAddress', 'BillingAddress', 'PerformanceConfig']
      .forEach((name) => expect(service.hasPolicy(name)).withContext(name).toBeTrue());
    expect(service.formGroupPolicies['billingInfo']).toBe('BillingAddress');
    expect(service.policyGroups['checkout']).toEqual({
      policies: ['PersonalInfo', 'ShippingAddress', 'BillingAddress'],
      formGroups: ['personalInfo', 'shippingInfo', 'billingInfo']
    });
    expect(validationProviders[0].multi).toBeTrue();
  });

  it('provides the display strategy matching each route framework', () => {
    const cases: Array<[Provider[], any]> = [
      [provideShowcaseFrameworkDisplay('bootstrap'), BootstrapValidationDisplayStrategy],
      [provideShowcaseFrameworkDisplay('material'), MaterialValidationDisplayStrategy],
      [provideShowcaseFrameworkDisplay('tailwind'), TailwindValidationDisplayStrategy]
    ];

    cases.forEach(([providers, type]) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers });
      expect(TestBed.inject(VALIDATION_DISPLAY_STRATEGY)).toBeInstanceOf(type);
    });
  });
});

describe('showcase validation policies', () => {
  let service: ValidationProviderService;

  beforeEach(() => {
    service = new ValidationProviderService();
  });

  it('validates every sample-form control and accepts realistic valid values', async () => {
    service.register('SampleForm', new SampleFormValidationPolicy());
    const model = new SampleForm();

    await firstValueFrom(service.validateAll(model, 'SampleForm'));
    expect(model.validationResults?.map((result) => result.propertyName)).toEqual([
      'textInput', 'emailInput', 'passwordInput', 'numberInput', 'dateInput',
      'checkboxInput', 'radioGroup', 'selectInput', 'textareaInput'
    ]);

    Object.assign(model, {
      textInput: 'Ada',
      emailInput: 'ada@example.com',
      passwordInput: 'password',
      numberInput: 50,
      dateInput: '2025-01-01',
      checkboxInput: true,
      radioGroup: 'one',
      selectInput: 'alpha',
      textareaInput: 'Long enough comment'
    });
    await firstValueFrom(service.validateAll(model, 'SampleForm'));
    expect(model.validationResults).toBeUndefined();
  });

  it('validates format and boundary failures in the sample policy', async () => {
    service.register('SampleForm', new SampleFormValidationPolicy());
    const model = Object.assign(new SampleForm(), {
      textInput: 'Ada', emailInput: 'bad', passwordInput: 'short', numberInput: 101,
      dateInput: 'bad', checkboxInput: true, radioGroup: 'one', selectInput: 'one', textareaInput: 'short'
    });

    await firstValueFrom(service.validateAll(model, 'SampleForm'));
    expect(model.validationResults?.map((entry) => entry.error.message)).toEqual([
      'Enter a valid email address',
      'Password must be at least 8 characters',
      'Number must be between 1 and 100',
      'Enter a valid date',
      'Comments must be at least 10 characters'
    ]);
  });

  it('validates personal and conditionally active shipping and billing paths', async () => {
    service.register('Personal', new PersonalInfoValidationPolicy());
    service.register('Shipping', new ShippingAddressValidationPolicy());
    service.register('Billing', new BillingAddressValidationPolicy());
    const model = new ComplexFormModel();

    await firstValueFrom(service.validateAll(model, 'Personal'));
    expect(model.validationResults?.length).toBe(4);

    await firstValueFrom(service.validateAll(model, 'Shipping'));
    expect(model.validationResults?.some((entry) => entry.propertyName.startsWith('shipping.'))).toBeTrue();
    expect(model.validationResults?.some((entry) => entry.propertyName === 'shipping.city')).toBeFalse();

    model.shipping.line1 = '1 Main St';
    await firstValueFrom(service.validateAll(model, 'Shipping'));
    expect(model.validationResults?.some((entry) => entry.propertyName === 'shipping.city')).toBeTrue();

    await firstValueFrom(service.validateAll(model, 'Billing'));
    expect(model.validationResults?.some((entry) => entry.propertyName.startsWith('billing.'))).toBeFalse();
    model.billing.sameAsShipping = false;
    await firstValueFrom(service.validateAll(model, 'Billing'));
    expect(model.validationResults?.filter((entry) => entry.propertyName.startsWith('billing.')).length).toBe(3);
  });
});

describe('sample form components', () => {
  const componentTypes = [SampleFormComponent, SampleFormMaterialComponent, SampleFormTailwindComponent];

  componentTypes.forEach((type) => {
    describe(type.name, () => {
      let service: ValidationProviderService;
      let component: SampleFormComponent | SampleFormMaterialComponent | SampleFormTailwindComponent;

      beforeEach(() => {
        service = new ValidationProviderService();
        service.register('SampleForm', new SampleFormValidationPolicy());
        component = new type(service);
      });

      it('reports invalid and valid submissions', () => {
        component.onSubmit();
        expect(component.submitMessage).toBe('Please fix validation errors before submitting.');

        Object.assign(component.model, {
          textInput: 'Ada', emailInput: 'ada@example.com', passwordInput: 'password', numberInput: 50,
          dateInput: '2025-01-01', checkboxInput: true, radioGroup: 'one', selectInput: 'one',
          textareaInput: 'Long enough comment'
        });
        component.onSubmit();
        expect(component.submitMessage).toBe('Form submitted successfully!');
      });

      it('clears values, groups, validation state, and messages', () => {
        component.model.textInput = 'dirty';
        component.submitMessage = 'dirty';
        service.formGroup['main'] = ['textInput'];
        const resetSpy = spyOn(service, 'resetFormGroups').and.callThrough();
        const clearSpy = spyOn(service, 'clearValidationState').and.callThrough();
        const notifySpy = spyOn(service, 'notifyValidationRefresh').and.callThrough();

        component.onClear();

        expect(component.model.textInput).toBe('');
        expect(component.submitMessage).toBe('');
        expect(resetSpy).toHaveBeenCalled();
        expect(clearSpy).toHaveBeenCalledWith(component.model, ['SampleForm']);
        if (type !== SampleFormComponent) {
          expect(notifySpy).toHaveBeenCalled();
        }
      });
    });
  });
});

describe('complex form components', () => {
  const componentTypes = [ComplexFormComponent, ComplexFormMaterialComponent, ComplexFormTailwindComponent];

  function configuredService(): ValidationProviderService {
    const service = new ValidationProviderService();
    service.register('PersonalInfo', new PersonalInfoValidationPolicy());
    service.register('ShippingAddress', new ShippingAddressValidationPolicy());
    service.register('BillingAddress', new BillingAddressValidationPolicy());
    service.registerFormGroupPolicy('personalInfo', 'PersonalInfo');
    service.registerFormGroupPolicy('shippingInfo', 'ShippingAddress');
    service.registerFormGroupPolicy('billingInfo', 'BillingAddress');
    service.registerPolicyGroup('checkout', {
      policies: ['PersonalInfo', 'ShippingAddress', 'BillingAddress'],
      formGroups: ['personalInfo', 'shippingInfo', 'billingInfo']
    });
    return service;
  }

  componentTypes.forEach((type) => {
    describe(type.name, () => {
      let service: ValidationProviderService;
      let component: ComplexFormComponent | ComplexFormMaterialComponent | ComplexFormTailwindComponent;

      beforeEach(() => {
        service = configuredService();
        component = new type(service);
      });

      it('updates conditional billing state and emits a refresh', () => {
        component.model.billing.sameAsShipping = false;
        const evaluateSpy = spyOn(service, 'evaluateFormGroup').and.callThrough();
        const notifySpy = spyOn(service, 'notifyValidationRefresh').and.callThrough();

        component.onSameAsShippingChange();

        expect(evaluateSpy).toHaveBeenCalledWith(component.model, 'billingInfo', 'BillingAddress');
        expect(notifySpy).toHaveBeenCalledWith(component.model);
      });

      it('reports invalid and valid multi-policy submissions', () => {
        component.onSubmit();
        expect(component.submitMessage).toBe('Please fix validation errors in all sections before submitting.');

        Object.assign(component.model.personal, {
          firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '212-555-1212'
        });
        Object.assign(component.model.shipping, {
          line1: '1 Main St', city: 'New York', state: 'NY', zip: '10001', country: 'US'
        });
        component.model.billing.sameAsShipping = true;
        component.onSubmit();
        expect(component.submitMessage).toBe('All forms submitted successfully!');
      });

      it('clears nested models, validation groups, and messages', () => {
        component.model.personal.firstName = 'dirty';
        component.model.shipping.city = 'dirty';
        component.model.billing.sameAsShipping = false;
        component.submitMessage = 'dirty';
        const clearSpy = spyOn(service, 'clearValidationState').and.callThrough();
        const notifySpy = spyOn(service, 'notifyValidationRefresh').and.callThrough();

        component.onClear();

        expect(component.model.personal.firstName).toBe('');
        expect(component.model.shipping.city).toBe('');
        expect(component.model.billing.sameAsShipping).toBeTrue();
        expect(component.submitMessage).toBe('');
        expect(clearSpy).toHaveBeenCalledWith(component.model, component.policies);
        if (type !== ComplexFormComponent) {
          expect(notifySpy).toHaveBeenCalled();
        }
      });
    });
  });
});
