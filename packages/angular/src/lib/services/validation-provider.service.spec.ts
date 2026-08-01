import { firstValueFrom } from 'rxjs';
import { getValidationMeta, markFieldTouched, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/core';
import { ValidationProviderService } from './validation-provider.service';

class RequiredPolicy implements ValidationPolicy {
  constructor(private readonly propertyName: string, private readonly message = 'Required') {}

  addValidations(helper: ValidatorHelper): Validator[] {
    return [helper.validateFor(this.propertyName).isRequired(this.message)];
  }
}

describe('ValidationProviderService', () => {
  let service: ValidationProviderService;

  beforeEach(() => {
    service = new ValidationProviderService();
  });

  it('registers policies case-insensitively and skips duplicates', () => {
    const first = new RequiredPolicy('name');
    const duplicate = new RequiredPolicy('email');
    const consoleSpy = spyOn(console, 'log');

    service.register('Example', first);
    const original = service.policies['example.Policy'];
    service.register('EXAMPLE', duplicate);

    expect(service.hasPolicy('example')).toBeTrue();
    expect(service.policies['example.Policy']).toBe(original);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('replaces, unregisters, and reports missing policies', () => {
    service.register('Example', new RequiredPolicy('name'));
    service.replacePolicy('EXAMPLE', new RequiredPolicy('email'));

    expect(service.policies['example.Policy'][0].propertyName).toBe('email');
    service.unregisterPolicy('example');
    expect(service.hasPolicy('Example')).toBeFalse();
    expect(() => service.getPolicy('missing')).toThrowError("Policy named 'missing' has not been registered");
  });

  it('returns a policy facade with validation and grouping operations', async () => {
    service.register('Example', new RequiredPolicy('name', 'Name required'));
    const facade = service.getPolicy('example');
    const model: any = { name: '' };

    expect(Object.keys(facade).sort()).toEqual([
      'checkFormValid',
      'checkModelRequired',
      'evaluateFormGroup',
      'getActivePropertyPaths',
      'initializeRequiredFields',
      'updateConditionalRequiredFields',
      'validate'
    ]);
    await firstValueFrom(facade.validate(model));
    await firstValueFrom(facade.checkModelRequired(model));
    facade.initializeRequiredFields(model);
    facade.checkFormValid(model, { main: ['name'] });
    expect(facade.getActivePropertyPaths(model)).toEqual(['name']);
    expect(model.validationResults[0].error.message).toBe('Name required');
  });

  it('registers and unregisters form-group and policy-group mappings', () => {
    service.registerFormGroupPolicy('main', 'Example');
    service.registerPolicyGroup('checkout', { policies: ['Example'], formGroups: ['main'] });

    expect(service.formGroupPolicies['main']).toBe('Example');
    expect(service.policyGroups['checkout'].formGroups).toEqual(['main']);

    service.unregisterFormGroupPolicy('main');
    service.unregisterPolicyGroup('checkout');
    expect(service.formGroupPolicies['main']).toBeUndefined();
    expect(service.policyGroups['checkout']).toBeUndefined();
  });

  it('notifies only subscribers bound to the exact model and supports unsubscribe', () => {
    const firstModel = {};
    const secondModel = {};
    const observer = jasmine.createSpy('observer');
    const subscription = service.onValidationRefresh(firstModel).subscribe(observer);

    service.notifyValidationRefresh(secondModel);
    service.notifyValidationRefresh(firstModel);
    expect(observer).toHaveBeenCalledOnceWith(firstModel);

    subscription.unsubscribe();
    service.notifyValidationRefresh(firstModel);
    expect(observer).toHaveBeenCalledTimes(1);
  });

  it('validates all, exposes errors, required state, groups, and refresh notification', async () => {
    service.register('Example', new RequiredPolicy('name', 'Name required'));
    service.registerFormGroupPolicy('main', 'Example');
    service.formGroup['main'] = ['name'];
    const model: any = { name: '' };
    markFieldTouched(model, 'name');
    const refreshed = jasmine.createSpy('refreshed');
    service.onValidationRefresh(model).subscribe(refreshed);

    await firstValueFrom(service.validateAll(model, 'Example', {
      showAllErrors: true,
      evaluateGroups: true
    }));

    expect(getValidationMeta(model).showAllErrors).toBeTrue();
    expect(model.validationResults).toEqual([
      { propertyName: 'name', error: { message: 'Name required' } }
    ]);
    expect(model.requiredResults[0]).toEqual(jasmine.objectContaining({
      propertyName: 'name', isRequired: true, hasRequiredError: true
    }));
    expect(model.main).toEqual(jasmine.objectContaining({ isEvaluated: true, isInValid: true }));
    expect(refreshed).toHaveBeenCalled();
  });

  it('uses validateAll defaults without forcing show-all or group evaluation', async () => {
    service.register('Example', new RequiredPolicy('name'));
    const model: any = { name: 'Ada' };

    await firstValueFrom(service.validateAll(model, 'Example'));

    expect(getValidationMeta(model).showAllErrors).toBeFalse();
    expect(model.main).toBeUndefined();
  });

  it('evaluates a mapped form group and ignores missing mappings or policies', () => {
    const model: any = { name: '', validationResults: [{ propertyName: 'name', error: { message: 'bad' } }] };
    service.evaluateFormGroup(model, 'unknown');
    expect(model.unknown).toBeUndefined();

    service.registerFormGroupPolicy('main', 'Missing');
    service.evaluateFormGroup(model, 'main');
    expect(model.main).toBeUndefined();

    service.register('Example', new RequiredPolicy('name'));
    service.registerFormGroupPolicy('main', 'Example');
    service.formGroup['main'] = ['name'];
    service.evaluateFormGroup(model, 'main');
    expect(model.main).toEqual(jasmine.objectContaining({ isInValid: false, isEvaluated: false }));

    service.evaluateFormGroup(model, 'main', 'Example');
    expect(model.main).toBeDefined();

    service.evaluateFormGroup(model, 'unregistered', 'Example');
    expect(model.unregistered).toBeDefined();
  });

  it('evaluates all groups belonging to one policy', () => {
    service.register('Example', new RequiredPolicy('name'));
    service.registerFormGroupPolicy('first', 'Example');
    service.registerFormGroupPolicy('second', 'Other');
    service.formGroup['first'] = ['name'];
    const model: any = { name: '' };

    service.evaluatePolicyFormGroups(model, 'Example', false);

    expect(model.first).toBeDefined();
    expect(model.second).toBeUndefined();
    expect(model.first.isEvaluated).toBeFalse();

    service.evaluatePolicyFormGroups(model, 'Example');
    expect(model.first.isEvaluated).toBeFalse();
  });

  it('evaluates multiple policies sequentially and updates a policy group', async () => {
    service.register('Personal', new RequiredPolicy('personal.name', 'Personal required'));
    service.register('Shipping', new RequiredPolicy('shipping.city', 'Shipping required'));
    service.registerFormGroupPolicy('personalGroup', 'Personal');
    service.registerFormGroupPolicy('shippingGroup', 'Shipping');
    service.registerPolicyGroup('checkout', {
      policies: ['Personal', 'Shipping'],
      formGroups: ['personalGroup', 'shippingGroup']
    });
    const model: any = { personal: { name: '' }, shipping: { city: '' } };

    await firstValueFrom(service.evaluatePolicies(model, ['Personal', 'Shipping'], 'checkout'));

    expect(model.validationResults.length).toBe(2);
    expect(model.personalGroup.isEvaluated).toBeTrue();
    expect(model.shippingGroup.isEvaluated).toBeTrue();
    expect(model.checkout).toEqual(jasmine.objectContaining({
      isValid: false, isInValid: true, isEvaluated: true
    }));
  });

  it('updates policy groups using registered paths when no form-group policy mapping exists', () => {
    service.formGroup['legacy'] = ['legacy.path'];
    service.registerPolicyGroup('legacyGroup', { policies: [], formGroups: ['legacy'] });
    const model: any = {
      legacy: { isEvaluated: true },
      validationResults: [{ propertyName: 'legacy.path', error: { message: 'legacy error' } }]
    };

    service.updatePolicyGroupStatus(model, 'legacyGroup');

    expect(model.legacyGroup).toEqual(jasmine.objectContaining({
      isValid: false,
      isInValid: true,
      isEvaluated: true,
      errors: model.validationResults
    }));
    service.updatePolicyGroupStatus(model, 'missing');
    expect(model.missing).toBeUndefined();
  });

  it('falls back safely when a mapped policy has no active or registered paths', () => {
    service.register('Inactive', {
      addValidations: (helper: ValidatorHelper) => [
        helper.validateFor('conditional', () => false).isRequired('Required')
      ]
    });
    service.registerFormGroupPolicy('inactive', 'Inactive');
    service.registerPolicyGroup('inactivePage', { policies: ['Inactive'], formGroups: ['inactive'] });
    const model: any = {
      inactive: { isEvaluated: true },
      validationResults: [{ propertyName: 'unrelated', error: { message: 'Unrelated' } }]
    };

    service.updatePolicyGroupStatus(model, 'inactivePage');

    expect(model.inactivePage).toEqual({
      isValid: true,
      isInValid: false,
      isEvaluated: true,
      errors: []
    });
  });

  it('uses show-all to mark a policy group evaluated even when a section is pending', () => {
    service.registerPolicyGroup('page', { policies: [], formGroups: ['pending'] });
    const model: any = {};
    getValidationMeta(model).showAllErrors = true;

    service.updatePolicyGroupStatus(model, 'page');

    expect(model.page).toEqual({
      isValid: true,
      isInValid: false,
      isEvaluated: true,
      errors: []
    });
  });

  it('resets form-group registrations and clears all validation state', () => {
    service.register('Example', new RequiredPolicy('name'));
    service.formGroup['main'] = ['name'];
    service.registerFormGroupPolicy('mapped', 'Example');
    service.registerPolicyGroup('page', { policies: ['Example'], formGroups: ['mapped'] });
    const model: any = {
      name: '',
      validationResults: [{ propertyName: 'name', error: { message: 'bad' } }],
      requiredResults: [],
      main: {},
      mapped: {},
      page: {}
    };
    getValidationMeta(model).showAllErrors = true;
    const refreshed = jasmine.createSpy('refreshed');
    service.onValidationRefresh(model).subscribe(refreshed);

    service.clearValidationState(model, ['Example', 'Missing']);

    expect(model.validationResults).toBeUndefined();
    expect(model.main).toBeUndefined();
    expect(model.mapped).toBeUndefined();
    expect(model.page).toBeUndefined();
    expect(getValidationMeta(model).showAllErrors).toBeFalse();
    expect(model.requiredResults[0]).toEqual(jasmine.objectContaining({ propertyName: 'name' }));
    expect(refreshed).toHaveBeenCalled();

    service.resetFormGroups();
    expect(service.formGroup).toEqual({});
  });
});
