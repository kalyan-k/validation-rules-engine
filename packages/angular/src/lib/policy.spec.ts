import { firstValueFrom, Subject } from 'rxjs';
import { getValidationMeta, markFieldTouched, Validator, ValidatorHelper } from '@validation-rules-engine/core';
import { Policy } from './policy';

describe('Policy', () => {
  const helper = new ValidatorHelper();

  function policyWith(...validators: Validator[]): Policy {
    const policy = new Policy();
    policy.setPolicyVariables('Example', validators);
    return policy;
  }

  it('validates all registered fields, collects failures, and removes success sentinels', async () => {
    const policy = policyWith(
      helper.validateFor('name').isRequired('Name required'),
      helper.validateFor('email').isEmail('Email invalid')
    );
    const model: any = { name: '', email: 'person@example.com' };

    const results = await firstValueFrom(policy.validate(model));

    expect(results).toEqual([{ propertyName: 'name', error: { message: 'Name required' } }]);
    expect(model.validationResults).toEqual(results);
  });

  it('validates one property and clears only that property previous errors', async () => {
    const policy = policyWith(helper.validateFor('name').isRequired('Name required'));
    const model: any = {
      name: 'Ada',
      validationResults: [
        { propertyName: 'name', error: { message: 'old' } },
        { propertyName: 'other', error: { message: 'keep' } }
      ]
    };

    await firstValueFrom(policy.validate(model, 'name'));

    expect(model.validationResults).toEqual([{ propertyName: 'other', error: { message: 'keep' } }]);
  });

  it('clears only this policy fields during full validation and preserves other-policy errors', async () => {
    const policy = policyWith(helper.validateFor('name').isRequired('Name required'));
    const model: any = {
      name: 'Ada',
      validationResults: [
        { propertyName: 'name', error: { message: 'old' } },
        { propertyName: 'other', error: { message: 'keep' } }
      ]
    };

    await firstValueFrom(policy.validate(model));

    expect(model.validationResults).toEqual([{ propertyName: 'other', error: { message: 'keep' } }]);
  });

  it('deletes empty validation state and handles an unknown property selection', async () => {
    const policy = policyWith(helper.validateFor('name').isRequired('Name required'));
    const model: any = { name: 'Ada', validationResults: [] };

    expect(await firstValueFrom(policy.validate(model, 'unknown'))).toBeUndefined();
    expect(model.validationResults).toBeUndefined();

    expect(await firstValueFrom(policy.validate(model))).toBeUndefined();
    expect(model.validationResults).toBeUndefined();
  });

  it('skips optional empty values but runs optional rules for zero and non-empty values', async () => {
    const policy = policyWith(
      helper.validateFor('optionalEmail').isEmail('Email invalid'),
      helper.validateFor('quantity').isNumber('Number invalid')
    );
    const model: any = { optionalEmail: '', quantity: 0 };

    expect(await firstValueFrom(policy.validate(model))).toBeUndefined();

    model.optionalEmail = 'bad';
    expect(await firstValueFrom(policy.validate(model))).toEqual([
      { propertyName: 'optionalEmail', error: { message: 'Email invalid' } }
    ]);
  });

  it('resolves nested paths and string dependencies', async () => {
    const policy = policyWith(
      helper.validateFor('billing.city', '!billing.sameAsShipping').isRequired('City required')
    );
    const model: any = { billing: { sameAsShipping: true, city: '' } };

    expect(await firstValueFrom(policy.validate(model))).toBeUndefined();

    model.billing.sameAsShipping = false;
    expect(await firstValueFrom(policy.validate(model))).toEqual([
      { propertyName: 'billing.city', error: { message: 'City required' } }
    ]);
  });

  it('skips optional chained rules for empty values after a dependency is satisfied', async () => {
    const policy = policyWith(
      helper.validateFor('billing.zip', '!billing.sameAsShipping')
        .isRequired('ZIP required')
        .isZipCode('ZIP invalid')
    );
    const model: any = { billing: { sameAsShipping: false, zip: '' } };

    expect(await firstValueFrom(policy.validate(model))).toEqual([
      { propertyName: 'billing.zip', error: { message: 'ZIP required' } }
    ]);
  });

  it('supports functional dependencies and missing nested values', async () => {
    const dependency = jasmine.createSpy('dependency').and.callFake((model: any) => model.enabled);
    const policy = policyWith(
      helper.validateFor('profile.name', dependency).isRequired('Name required')
    );
    const model: any = { enabled: false };

    expect(await firstValueFrom(policy.validate(model))).toBeUndefined();
    model.enabled = true;
    expect(await firstValueFrom(policy.validate(model))).toEqual([
      { propertyName: 'profile.name', error: { message: 'Name required' } }
    ]);
    expect(dependency).toHaveBeenCalled();
  });

  it('waits for Subject-based rules and ignores duplicate asynchronous errors', async () => {
    const result = new Subject<any>();
    const validator = helper.validateFor('username').userDefined('Taken', () => result);
    const policy = policyWith(validator);
    const model: any = {
      username: 'ada',
      validationResults: [
        { propertyName: 'username' },
        { propertyName: 'username', error: { message: 'Different error' } },
        { propertyName: 'username', error: { message: 'Taken' } }
      ]
    };

    const completion = firstValueFrom(policy.validate(model));
    result.next({ message: 'Taken' });
    result.complete();

    expect(await completion).toEqual(model.validationResults);
  });

  it('records required state, updates existing entries, and limits property checks', async () => {
    const policy = policyWith(
      helper.validateFor('first').isRequired('First required').isEmail('First invalid'),
      helper.validateFor('second').isRequired('Second required')
    );
    const model: any = {
      first: '',
      second: '',
      requiredResults: [{ propertyName: 'first', isRequired: false, hasRequiredError: false }]
    };

    await firstValueFrom(policy.checkModelRequired(model, 'first'));
    expect(model.requiredResults).toEqual([
      { propertyName: 'first', isRequired: true, hasRequiredError: true }
    ]);

    await firstValueFrom(policy.checkModelRequired(model, 'first'));
    expect(model.requiredResults).toEqual([
      { propertyName: 'first', isRequired: true, hasRequiredError: true }
    ]);

    model.first = 'value';
    await firstValueFrom(policy.checkModelRequired(model));
    expect(model.requiredResults).toContain(jasmine.objectContaining({
      propertyName: 'first', isRequired: true, hasRequiredError: false
    }));
    expect(model.requiredResults).toContain(jasmine.objectContaining({
      propertyName: 'second', isRequired: true, hasRequiredError: true
    }));
  });

  it('removes empty required state when no required rule exists', async () => {
    const policy = policyWith(helper.validateFor('email').isEmail('invalid'));
    const model: any = { email: '' };

    expect(await firstValueFrom(policy.checkModelRequired(model))).toBeUndefined();
    expect(model.requiredResults).toBeUndefined();
  });

  it('updates conditional required markers as dependencies change', () => {
    const policy = policyWith(
      helper.validateFor('billing.city', '!billing.sameAsShipping').isRequired('City required'),
      helper.validateFor('note').isEmail('Invalid')
    );
    const model: any = { billing: { sameAsShipping: false, city: '' }, note: '' };

    policy.updateConditionalRequiredFields(model);
    expect(model.requiredResults).toEqual([
      { propertyName: 'billing.city', isRequired: true, hasRequiredError: false }
    ]);

    model.requiredResults[0].hasRequiredError = true;
    model.billing.sameAsShipping = true;
    policy.updateConditionalRequiredFields(model, 'billing.city');
    expect(model.requiredResults[0]).toEqual({
      propertyName: 'billing.city', isRequired: false, hasRequiredError: false
    });

    policy.initializeRequiredFields(model);
    policy.updateConditionalRequiredFields(model, 'other');
    expect(model.requiredResults[0].isRequired).toBeFalse();
  });

  it('returns unique active property paths', () => {
    const policy = policyWith(
      helper.validateFor('name').isRequired('required'),
      helper.validateFor('name').isEmail('invalid'),
      helper.validateFor('billing.city', '!billing.sameAsShipping').isRequired('required')
    );

    expect(policy.getActivePropertyPaths({ billing: { sameAsShipping: true } })).toEqual(['name']);
    expect(policy.getActivePropertyPaths({ billing: { sameAsShipping: false } })).toEqual(['name', 'billing.city']);
  });

  it('evaluates form groups using active policy paths, touched state, and show-all state', () => {
    const policy = policyWith(helper.validateFor('name').isRequired('Name required'));
    const model: any = {
      name: '',
      validationResults: [{ propertyName: 'name', error: { message: 'Name required' } }]
    };

    policy.evaluateFormGroup(model, 'main', ['ignored'], true);
    expect(model.main).toEqual(jasmine.objectContaining({ isEvaluated: false, isInValid: false }));

    markFieldTouched(model, 'name');
    policy.evaluateFormGroup(model, 'main', [], true);
    expect(model.main).toEqual(jasmine.objectContaining({
      isEvaluated: true,
      isValid: false,
      isInValid: true,
      errors: model.validationResults
    }));

    model.validationResults = [];
    policy.evaluateFormGroup(model, 'main', [], true);
    expect(model.main).toEqual(jasmine.objectContaining({ isEvaluated: true, isValid: true }));

    getValidationMeta(model).showAllErrors = true;
    policy.evaluateFormGroup(model, 'main', [], false);
    expect(model.main.isEvaluated).toBeFalse();
  });

  it('uses registered paths when a policy has no active paths and handles empty groups', () => {
    const inactivePolicy = policyWith(
      helper.validateFor('city', () => false).isRequired('City required')
    );
    const model: any = {
      validationResults: [{ propertyName: 'fallback', error: { message: 'Fallback error' } }]
    };
    markFieldTouched(model, 'fallback');

    inactivePolicy.evaluateFormGroup(model, 'fallbackGroup', ['fallback', 'fallback']);
    expect(model.fallbackGroup).toEqual(jasmine.objectContaining({ isEvaluated: true, isInValid: true }));

    inactivePolicy.evaluateFormGroup({}, 'empty', [], true);
    const emptyModel: any = {};
    inactivePolicy.evaluateFormGroup(emptyModel, 'empty');
    expect(emptyModel.empty).toEqual({
      isValid: true,
      isInValid: false,
      isEvaluated: true,
      errors: []
    });
  });

  it('checks every supplied form group', () => {
    const policy = policyWith(helper.validateFor('name').isRequired('Name required'));
    const model: any = {};

    policy.checkFormGroupValid(model, { first: ['name'], second: undefined }, false);

    expect(model.first.isEvaluated).toBeFalse();
    expect(model.second.isEvaluated).toBeFalse();
  });
});
