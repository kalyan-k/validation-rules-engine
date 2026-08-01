import { describe, expect, it, vi } from 'vitest';
import { type ValidationPolicy, type ValidatorHelper } from '@validation-rules-engine/core';
import { ValidationEngine } from './validation-engine';
import type { ValidationTarget } from '../types';

function policyFor(add: (helper: ValidatorHelper) => ReturnType<ValidatorHelper['validateFor']>[]): ValidationPolicy {
  return { addValidations: add };
}

describe('ValidationEngine', () => {
  it('registers case-insensitive policies with balanced duplicate ownership', async () => {
    const engine = new ValidationEngine();
    const policy = policyFor((helper) => [helper.validateFor('name').isRequired('Name required')]);
    const releaseOne = engine.registerPolicy('Profile', policy);
    const releaseTwo = engine.registerPolicy('PROFILE', policy);
    expect(engine.hasPolicy('profile')).toBe(true);
    releaseOne();
    releaseOne();
    expect(engine.hasPolicy('Profile')).toBe(true);
    releaseTwo();
    expect(engine.hasPolicy('profile')).toBe(false);
  });

  it('replaces and forcibly unregisters a dynamic policy', async () => {
    const engine = new ValidationEngine();
    engine.registerPolicy('dynamic', policyFor((helper) => [helper.validateFor('name').isRequired('Old')]));
    engine.replacePolicy('dynamic', policyFor((helper) => [helper.validateFor('name').isRequired('New')]));
    const model = { name: '' } as ValidationTarget;
    expect((await engine.validate(model, ['dynamic'])).errors[0]?.error.message).toBe('New');
    engine.unregisterPolicy('dynamic');
    expect(() => engine.hasPolicy('dynamic')).not.toThrow();
    await expect(engine.validate(model, ['dynamic'])).rejects.toThrow("Policy named 'dynamic'");
  });

  it('validates nested fields, optional rules, required results, and deduplicates errors', async () => {
    const engine = new ValidationEngine();
    engine.registerPolicy('profile', policyFor((helper) => [
      helper.validateFor('person.email').isRequired('Email required').isEmail('Invalid email'),
      helper.validateFor('person.email').isRequired('Email required'),
      helper.validateFor('phone').isPhone('Invalid phone')
    ]));
    const model = { person: { email: '' }, phone: '' } as unknown as ValidationTarget;
    const snapshot = await engine.validate(model, ['profile']);
    expect(snapshot.errors.map(({ error }) => error.message)).toEqual(['Email required']);
    expect(snapshot.requiredResults).toContainEqual({ propertyName: 'person.email', isRequired: true, hasRequiredError: true });
    expect(snapshot.isValid).toBe(false);
    expect(engine.getErrors(model, 'phone')).toEqual([]);
  });

  it('supports function, path, negated, and equality dependencies', async () => {
    const engine = new ValidationEngine();
    engine.registerPolicy('conditional', policyFor((helper) => [
      helper.validateFor('details.functionValue', (model: any) => model.enabled).isRequired('function'),
      helper.validateFor('details.pathValue', 'enabled').isRequired('path'),
      helper.validateFor('details.negatedValue', '!disabled').isRequired('negated'),
      helper.validateFor('details.equalValue', "kind === 'business'").isRequired('equal'),
      helper.validateFor('details.notEqualValue', 'kind != personal').isRequired('not equal')
    ]));
    const model = {
      enabled: true,
      disabled: false,
      kind: 'business',
      details: { functionValue: '', pathValue: '', negatedValue: '', equalValue: '', notEqualValue: '' }
    } as unknown as ValidationTarget;
    const errors = (await engine.validate(model, ['conditional'])).errors;
    expect(errors.map(({ error }) => error.message)).toEqual(['function', 'path', 'negated', 'equal', 'not equal']);
    (model as any)['enabled'] = false;
    (model as any)['disabled'] = true;
    (model as any)['kind'] = 'personal';
    expect((await engine.validate(model, ['conditional'])).errors).toEqual([]);
  });

  it('validates fields independently and preserves errors from other properties', async () => {
    const engine = new ValidationEngine();
    engine.registerPolicy('fields', policyFor((helper) => [
      helper.validateFor('first').isRequired('First'),
      helper.validateFor('second').isRequired('Second')
    ]));
    const model = { first: '', second: '' } as ValidationTarget;
    await engine.validate(model, ['fields']);
    model['first'] = 'ok';
    const snapshot = await engine.validateField(model, 'first', ['fields']);
    expect(snapshot.errors).toEqual([{ propertyName: 'second', error: { message: 'Second' } }]);
    await engine.validateField(model, 'unknown', ['fields']);
    expect(snapshot.errors).toHaveLength(1);
  });

  it('registers, validates, clears, and rejects validation groups', async () => {
    const engine = new ValidationEngine();
    engine.registerPolicy('group-policy', policyFor((helper) => [
      helper.validateFor('a').isRequired('A'),
      helper.validateFor('b').isRequired('B')
    ]));
    const release = engine.registerGroup({ name: 'section', policies: ['group-policy'], formGroups: ['section'], fields: ['a'] });
    const model = { a: '', b: '' } as ValidationTarget;
    const snapshot = await engine.validateGroup(model, 'section');
    expect(snapshot.errors).toEqual([{ propertyName: 'a', error: { message: 'A' } }]);
    expect(model['section']).toMatchObject({ isValid: false, isInValid: true, isEvaluated: true });
    model['a'] = 'ok';
    await engine.validate(model, undefined, { group: 'section' });
    expect(model['section']).toMatchObject({ isValid: true, isInValid: false });
    release();
    engine.unregisterGroup('missing');
    await expect(engine.validateGroup(model, 'section')).rejects.toThrow("Validation group 'section'");
  });

  it('publishes revisions, touch state, partial clear, full clear, and notifications', async () => {
    const engine = new ValidationEngine();
    engine.registerPolicy('clear', policyFor((helper) => [helper.validateFor('name').isRequired('Name')]));
    const model = { name: '' } as ValidationTarget;
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(model, listener);
    engine.touch(model, 'name');
    await engine.validate(model, ['clear'], { showAllErrors: true });
    expect(engine.getRevision(model)).toBeGreaterThanOrEqual(2);
    engine.clear(model, ['name']);
    expect(engine.getSnapshot(model).errors).toEqual([]);
    engine.notify(model);
    engine.clear(model);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    const count = listener.mock.calls.length;
    engine.notify(model);
    expect(listener).toHaveBeenCalledTimes(count);
  });

  it('ignores stale promise results for the same field', async () => {
    const resolvers: Array<(value: unknown) => void> = [];
    const engine = new ValidationEngine();
    engine.registerPolicy('async', policyFor((helper) => [
      helper.validateFor('code').userDefined('code', (_model, _value, message) => new Promise((resolve) => {
        resolvers.push(resolve);
      }).then((valid) => valid ? true : { message }))
    ]));
    const model = { code: 'first' } as ValidationTarget;
    const first = engine.validateField(model, 'code', ['async']);
    model['code'] = 'second';
    const second = engine.validateField(model, 'code', ['async']);
    resolvers[1]?.(true);
    await second;
    resolvers[0]?.(false);
    await first;
    expect(engine.getErrors(model)).toEqual([]);
  });

  it('supports observable-like async values and propagates rule failures', async () => {
    const unsubscribe = vi.fn();
    const engine = new ValidationEngine();
    engine.registerPolicy('observable', policyFor((helper) => [
      helper.validateFor('code').userDefined('code', (_model, _value, message) => ({
        subscribe(observer: { next(value: unknown): void }) {
          queueMicrotask(() => observer.next({ message }));
          return { unsubscribe };
        }
      }))
    ]));
    const model = { code: 'x' } as ValidationTarget;
    expect((await engine.validate(model, ['observable'])).errors[0]?.error.message).toBe('code');
    expect(unsubscribe).toHaveBeenCalled();

    engine.replacePolicy('observable', policyFor((helper) => [
      helper.validateFor('code').userDefined('code', () => Promise.reject(new Error('network')))
    ]));
    await expect(engine.validate(model, ['observable'])).rejects.toThrow('network');
  });

  it('guards empty names and handles non-string dependency values', async () => {
    const engine = new ValidationEngine();
    const policy = policyFor((helper) => [helper.validateFor('name', 1).isRequired('Name')]);
    expect(() => engine.registerPolicy(' ', policy)).toThrow('cannot be empty');
    expect(() => engine.registerGroup({ name: '', policies: [], formGroups: [] })).toThrow('cannot be empty');
    engine.registerPolicy('numeric', policy);
    expect((await engine.validate({ name: '' } as ValidationTarget, ['numeric'])).errors).toHaveLength(1);
  });
});
