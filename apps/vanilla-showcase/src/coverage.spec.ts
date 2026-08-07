import { describe, expect, it, vi } from 'vitest';
import { type ValidationPolicy, type ValidatorHelper } from '@validation-rules-engine/core';
import { ValidationEngine } from './validation/engine';
import type { ValidationTarget } from './validation/types';
import { getPropertyValue, setPropertyValue, fieldId } from './validation/paths';
import { bindNav, clear, el, setHtml, setText } from './ui/render';
import { renderSummary } from './ui/summary';
import { bindField, groupStatusLabel } from './ui/field';
import {
  createPerformanceScenario,
  createPerformanceModel,
  sampleValueFor,
  emptyValueFor,
  normalizeConfig,
  parseIntegerInput
} from './performance/performance-generator';
import { cloneModel, SIMPLE_INITIAL_MODEL } from './models';
import { platformUrl } from './platform-urls';

function policyFor(add: (helper: ValidatorHelper) => ReturnType<ValidatorHelper['validateFor']>[]): ValidationPolicy {
  return { addValidations: add };
}

describe('ValidationEngine unit coverage', () => {
  it('registers case-insensitive policies with balanced duplicate ownership', () => {
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
    await expect(engine.validate(model, ['dynamic'])).rejects.toThrow("Policy named 'dynamic'");
  });

  it('supports function, path, negated, and equality dependencies', async () => {
    const engine = new ValidationEngine();
    engine.registerPolicy('conditional', policyFor((helper) => [
      helper.validateFor('details.functionValue', (model: { enabled: boolean }) => model.enabled).isRequired('function'),
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
    (model as Record<string, unknown>)['enabled'] = false;
    (model as Record<string, unknown>)['disabled'] = true;
    (model as Record<string, unknown>)['kind'] = 'personal';
    expect((await engine.validate(model, ['conditional'])).errors).toEqual([]);
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

  it('reports required paths, refreshes group statuses, and updates evaluated groups on field validate', async () => {
    const engine = new ValidationEngine();
    engine.registerPolicy('required-policy', policyFor((helper) => [
      helper.validateFor('name').isRequired('Name'),
      helper.validateFor('email', "kind === 'work'").isRequired('Email')
    ]));
    engine.registerGroup({
      name: 'identity',
      policies: ['required-policy'],
      formGroups: ['identity'],
      fields: ['name', 'email']
    });
    const model = { name: '', email: '', kind: 'personal' } as ValidationTarget;
    expect(engine.isPathRequired(model, 'name')).toBe(true);
    expect(engine.isPathRequired(model, 'email')).toBe(false);
    (model as Record<string, unknown>)['kind'] = 'work';
    expect(engine.isPathRequired(model, 'email')).toBe(true);

    await engine.validate(model, undefined, { showAllErrors: true });
    expect(model['identity']).toMatchObject({ isEvaluated: true, isInValid: true });
    model['name'] = 'Ada';
    await engine.validateField(model, 'name');
    expect(model['identity']).toMatchObject({ isEvaluated: true, isInValid: true });
    model['email'] = 'ada@example.com';
    await engine.validateField(model, 'email');
    engine.refreshGroupStatuses(model);
    expect(model['identity']).toMatchObject({ isValid: true, isInValid: false, isEvaluated: true });
  });

  it('publishes revisions, touch state, partial clear, and notifications', async () => {
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

  it('supports observable-like async values and ignores stale results', async () => {
    const unsubscribe = vi.fn();
    const resolvers: Array<(value: unknown) => void> = [];
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

    engine.replacePolicy('async', policyFor((helper) => [
      helper.validateFor('code').userDefined('code', (_model, _value, message) => new Promise((resolve) => {
        resolvers.push(resolve);
      }).then((valid) => (valid ? true : { message })))
    ]));
    engine.registerPolicy('async', policyFor((helper) => [
      helper.validateFor('code').userDefined('code', (_model, _value, message) => new Promise((resolve) => {
        resolvers.push(resolve);
      }).then((valid) => (valid ? true : { message })))
    ]));
    const first = engine.validateField(model, 'code', ['async']);
    model['code'] = 'second';
    const second = engine.validateField(model, 'code', ['async']);
    resolvers[1]?.(true);
    await second;
    resolvers[0]?.(false);
    await first;
    expect(engine.getErrors(model)).toEqual([]);
  });

  it('guards empty names and handles non-string dependency values', async () => {
    const engine = new ValidationEngine();
    const policy = policyFor((helper) => [helper.validateFor('name', 1 as unknown as string).isRequired('Name')]);
    expect(() => engine.registerPolicy(' ', policy)).toThrow('cannot be empty');
    expect(() => engine.registerGroup({ name: '', policies: [], formGroups: [] })).toThrow('cannot be empty');
    engine.registerPolicy('numeric', policy);
    expect((await engine.validate({ name: '' } as ValidationTarget, ['numeric'])).errors).toHaveLength(1);
  });
});

describe('paths, render, and helpers', () => {
  it('reads and mutates nested property paths', () => {
    const model: Record<string, unknown> = {};
    setPropertyValue(model, 'a.0.b', 'value');
    expect(getPropertyValue(model, 'a.0.b')).toBe('value');
    setPropertyValue(model, '', 'ignored');
    expect(fieldId('personal.firstName')).toBe('validation-field-personal-firstName');
    expect(getPropertyValue(null, 'a')).toBeUndefined();
  });

  it('creates DOM helpers and renders summaries', () => {
    const host = el('div');
    setHtml(host, '<span>hi</span>');
    expect(host.querySelector('span')?.textContent).toBe('hi');
    setText(host, 'plain');
    expect(host.textContent).toBe('plain');
    clear(host);
    expect(host.childNodes).toHaveLength(0);

    const nav = el('nav');
    const navigate = vi.fn();
    bindNav(nav, [{ path: '/simple', label: 'Simple Form' }], '/simple', navigate);
    expect(nav.querySelector('a')?.getAttribute('aria-current')).toBe('page');
    nav.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(navigate).toHaveBeenCalledWith('/simple');

    renderSummary(host, [{ propertyName: 'name', error: { message: 'Required' } }], { linkErrors: false });
    expect(host.textContent).toContain('Required');
    renderSummary(host, [{ propertyName: 'name', error: { message: 'Jump here' } }]);
    const summaryButton = host.querySelector('.summary-error-link') as HTMLButtonElement;
    expect(summaryButton).toBeTruthy();
    expect(summaryButton.getAttribute('href')).toBeNull();
    const target = el('input', { id: fieldId('name') });
    document.body.append(target);
    const focusSpy = vi.spyOn(target, 'focus').mockImplementation(() => undefined);
    summaryButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
    target.remove();
    renderSummary(host, []);
    expect(host.childNodes).toHaveLength(0);

    expect(groupStatusLabel(undefined)).toBe('Not evaluated');
    expect(groupStatusLabel({ isEvaluated: true, isValid: true })).toBe('Valid');
    expect(groupStatusLabel({ isEvaluated: true, isValid: false })).toBe('Needs attention');
    expect(cloneModel(SIMPLE_INITIAL_MODEL).firstName).toBe('');
  });

  it('binds select, checkbox, radio, and textarea controls', async () => {
    const engine = new ValidationEngine();
    engine.registerPolicy('fields', policyFor((helper) => [
      helper.validateFor('choice').isRequired('Choice required')
    ]));
    const model = {
      choice: '',
      flag: false,
      radio: '',
      notes: ''
    } as ValidationTarget;
    const onFieldValidated = vi.fn();
    const ctx = { engine, getModel: () => model, policyNames: ['fields'], onFieldValidated };
    const select = bindField(ctx, {
      path: 'choice',
      label: 'Choice',
      control: 'select',
      selectOptions: [{ value: 'a', label: 'A' }]
    });
    const checkbox = bindField(ctx, { path: 'flag', label: 'Flag', control: 'checkbox' });
    const radio = bindField(ctx, {
      path: 'radio',
      label: 'Radio',
      control: 'radio',
      radioOptions: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]
    });
    const textarea = bindField(ctx, { path: 'notes', label: 'Notes', control: 'textarea' });

    expect(select.root.querySelector('.required-marker')).toBeTruthy();

    (select.root.querySelector('select') as HTMLSelectElement).value = 'a';
    select.root.querySelector('select')?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(model['choice']).toBe('a');

    checkbox.root.querySelector('input')?.dispatchEvent(new Event('change', { bubbles: true }));
    (checkbox.root.querySelector('input') as HTMLInputElement).checked = true;
    checkbox.root.querySelector('input')?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(model['flag']).toBe(true);

    radio.root.querySelector('input')?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(model['radio']).toBe('a');

    const area = textarea.root.querySelector('textarea') as HTMLTextAreaElement;
    area.value = 'hello';
    area.dispatchEvent(new Event('input', { bubbles: true }));
    expect(model['notes']).toBe('hello');

    model['choice'] = '';
    select.root.querySelector('select')?.dispatchEvent(new Event('blur', { bubbles: true }));
    await vi.waitFor(() => {
      expect(onFieldValidated).toHaveBeenCalledWith('choice');
      expect(engine.getErrors(model, 'choice').length).toBeGreaterThan(0);
    });

    select.syncValue();
    checkbox.syncValue();
    radio.syncValue();
    textarea.syncValue();
    select.refresh();
  });

  it('covers performance helpers and platform urls', () => {
    const scenario = createPerformanceScenario({ sectionCount: 1, controlsPerSection: 8, seed: 7 });
    expect(scenario.metrics.totalControls).toBe(8);
    const valid = createPerformanceModel(scenario, (field) => sampleValueFor(field));
    const empty = createPerformanceModel(scenario, (field) => emptyValueFor(field));
    expect(Object.keys(valid.sections)).toHaveLength(1);
    expect(Object.keys(empty.sections)).toHaveLength(1);
    expect(parseIntegerInput('')).toBe('');
    expect(parseIntegerInput('12')).toBe(12);
    expect(normalizeConfig({ sectionCount: '2' as unknown as number, controlsPerSection: '3' as unknown as number, seed: '4' as unknown as number })).toEqual({
      sectionCount: 2,
      controlsPerSection: 3,
      seed: 4
    });
    window.vrePlatformConfig = { urls: { docs: 'http://docs.test/' } };
    expect(platformUrl('docs', '/x')).toBe('http://docs.test/x');
    delete window.vrePlatformConfig;
  });
});
