import { Renderer2, RendererFactory2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ValidationResult } from '@validation-rules-engine/core';
import { POLICY_VALIDATION_DOM } from '../display/validation-display.constants';
import { PrimeNgValidationDisplayStrategy, PRIME_NG_DISPLAY_CLASSES } from '../display/examples/prime-ng-display.example';
import { ValidationDisplayContext } from '../interfaces/validation-display.interface';
import { BootstrapValidationDisplayStrategy } from './bootstrap-validation-display.strategy';
import { DefaultValidationDisplayStrategy } from './default-validation-display.strategy';
import { GenericValidationDisplayStrategy } from './generic-validation-display.strategy';
import { MaterialValidationDisplayStrategy } from './material-validation-display.strategy';
import { TailwindValidationDisplayStrategy } from './tailwind-validation-display.strategy';

describe('validation display strategies', () => {
  let renderer: Renderer2;
  const errors: ValidationResult[] = [
    { propertyName: 'name', error: { message: 'Name is required' } },
    { propertyName: 'name', error: { message: 'Name is too short' } }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    renderer = TestBed.inject(RendererFactory2).createRenderer(null, null);
  });

  afterEach(() => {
    document.querySelectorAll('[data-validation-display-test-root]').forEach((root) => root.remove());
  });

  function context(hostElement: HTMLElement, controlType: ValidationDisplayContext['controlType'], propertyPath = 'name'):
    ValidationDisplayContext {
    return { hostElement, controlType, propertyPath };
  }

  function mount(markup: string): HTMLElement {
    const root = document.createElement('div');
    root.setAttribute('data-validation-display-test-root', 'true');
    root.innerHTML = markup;
    document.body.appendChild(root);
    return root;
  }

  describe('GenericValidationDisplayStrategy', () => {
    it('detects native control types', () => {
      const strategy = new GenericValidationDisplayStrategy();
      const elements = ['fieldset', 'textarea', 'select', 'input', 'input', 'input']
        .map((tag) => document.createElement(tag));
      elements[3].setAttribute('type', 'checkbox');
      elements[4].setAttribute('type', 'radio');

      expect(elements.map((element) => strategy.detectControlType(element))).toEqual([
        'radio-group', 'textarea', 'select', 'checkbox', 'radio', 'input'
      ]);
    });

    it('renders, replaces, and clears input errors and required markers', () => {
      const root = mount('<div class="field"><label for="name">Name</label><input id="name"></div>');
      const input = root.querySelector('input')!;
      const label = root.querySelector('label')!;
      const strategy = new GenericValidationDisplayStrategy({ errorElementTag: 'p' });
      const ctx = context(input, 'input');

      expect(strategy.getErrorContainer(ctx)).toBeNull();
      strategy.renderErrors(ctx, errors, renderer);

      const container = strategy.getErrorContainer(ctx)!;
      expect(container.querySelectorAll('p[role="alert"]').length).toBe(2);
      expect(container.textContent).toContain('Name is required');
      expect(input.classList).toContain('policy-validation-invalid');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(strategy.ensureErrorContainer(ctx, renderer)).toBe(container);

      strategy.renderRequiredIndicator(ctx, { propertyName: 'name', isRequired: true, hasRequiredError: true }, renderer);
      expect(label.querySelector(`[${POLICY_VALIDATION_DOM.required}]`)?.textContent).toBe(' *');
      strategy.renderRequiredIndicator(ctx, { propertyName: 'name', isRequired: false, hasRequiredError: false }, renderer);
      expect(label.querySelector(`[${POLICY_VALIDATION_DOM.required}]`)).toBeNull();

      strategy.renderErrors(ctx, [], renderer);
      expect(strategy.getErrorContainer(ctx)).toBeNull();
      expect(input.hasAttribute('aria-invalid')).toBeFalse();
    });

    it('handles checkbox and radio-group invalid state and label discovery', () => {
      const root = mount(`
        <div class="form-check"><label><input id="agree" type="checkbox"> Agree</label></div>
        <fieldset><legend>Choice</legend>
          <div class="form-check"><input type="radio" name="choice"></div>
          <div class="form-check"><input type="radio" name="choice"></div>
        </fieldset>`);
      const strategy = new GenericValidationDisplayStrategy();
      const checkbox = root.querySelector('#agree') as HTMLInputElement;
      const fieldset = root.querySelector('fieldset')!;
      const checkboxCtx = context(checkbox, 'checkbox', 'agree');
      const groupCtx = context(fieldset, 'radio-group', 'choice');

      strategy.renderErrors(checkboxCtx, errors.slice(0, 1), renderer);
      expect(checkbox.getAttribute('aria-invalid')).toBe('true');
      expect(checkbox.closest('.form-check')?.classList).toContain('policy-validation-radio-group-invalid');
      strategy.clearErrors(checkboxCtx, renderer);
      expect(checkbox.hasAttribute('aria-invalid')).toBeFalse();

      strategy.renderErrors(groupCtx, errors.slice(0, 1), renderer);
      expect(fieldset.getAttribute('aria-invalid')).toBe('true');
      expect(Array.from(fieldset.querySelectorAll('input')).every((radio) => radio.classList.contains('policy-validation-invalid'))).toBeTrue();
      strategy.renderRequiredIndicator(groupCtx, { propertyName: 'choice', isRequired: true, hasRequiredError: true }, renderer);
      expect(fieldset.querySelector('legend')?.textContent).toContain('*');
      strategy.clearErrors(groupCtx, renderer);
      expect(fieldset.hasAttribute('aria-invalid')).toBeFalse();
    });

    it('supports radio inputs by name, custom classes, parent labels, and detached hosts', () => {
      const root = mount('<label><input type="radio" name="shared"> First</label><label><input type="radio" name="shared"> Second</label>');
      const radios = Array.from(root.querySelectorAll('input')) as HTMLInputElement[];
      const strategy = new GenericValidationDisplayStrategy({
        classes: { invalid: 'custom-invalid', baseInvalid: 'base-invalid' },
        requiredIndicator: { mode: 'none' }
      });
      const ctx = context(radios[0], 'radio', 'shared');

      strategy.renderErrors(ctx, errors.slice(0, 1), renderer);
      expect(radios.every((radio) => radio.classList.contains('base-invalid'))).toBeTrue();
      strategy.renderRequiredIndicator(ctx, { propertyName: 'shared', isRequired: true, hasRequiredError: true }, renderer);
      expect(radios[0].closest('label')?.querySelector(`[${POLICY_VALIDATION_DOM.required}]`)).toBeNull();
      strategy.clearErrors(ctx, renderer);

      const detached = document.createElement('input');
      const detachedContext = context(detached, 'input', 'detached');
      expect(strategy.ensureErrorContainer(detachedContext, renderer)).toBeNull();
      strategy.renderErrors(detachedContext, errors, renderer);
      strategy.renderRequiredIndicator(detachedContext, { propertyName: 'detached', isRequired: true, hasRequiredError: true }, renderer);
    });
  });

  describe('BootstrapValidationDisplayStrategy', () => {
    it('detects native controls', () => {
      const strategy = new BootstrapValidationDisplayStrategy();
      const fieldset = document.createElement('fieldset');
      const textarea = document.createElement('textarea');
      const select = document.createElement('select');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      const radio = document.createElement('input');
      radio.type = 'radio';
      expect([fieldset, textarea, select, checkbox, radio, document.createElement('input')]
        .map((element) => strategy.detectControlType(element))).toEqual([
          'radio-group', 'textarea', 'select', 'checkbox', 'radio', 'input'
        ]);
    });

    it('renders current messages once, applies invalid state, and clears them', () => {
      const root = mount('<div class="form-group"><label for="email">Email</label><input id="email"><div data-policy-validation-bootstrap-errors-for="email"><div class="invalid-feedback">Old</div></div></div>');
      const input = root.querySelector('input')!;
      const strategy = new BootstrapValidationDisplayStrategy({ errorElementTag: 'span' });
      const ctx = context(input, 'input', 'email');

      strategy.renderErrors(ctx, errors, renderer);
      expect(strategy.getErrorContainer(ctx)?.querySelectorAll('span.invalid-feedback').length).toBe(2);
      expect(input.classList).toContain('is-invalid');
      strategy.renderErrors(ctx, [], renderer);
      expect(strategy.getErrorContainer(ctx)).toBeNull();
      expect(input.classList).not.toContain('is-invalid');
    });

    it('renders all required-indicator modes and removes stale title/markers', () => {
      const root = mount('<div class="form-group"><label for="field">Field</label><input id="field"></div>');
      const input = root.querySelector('input')!;
      const label = root.querySelector('label')!;
      const required = { propertyName: 'field', isRequired: true, hasRequiredError: false };

      new BootstrapValidationDisplayStrategy().renderRequiredIndicator(context(input, 'input', 'field'), required, renderer);
      expect(label.textContent).toContain('*');

      new BootstrapValidationDisplayStrategy({ requiredIndicator: { mode: 'tooltip', tooltipText: 'Required!' } })
        .renderRequiredIndicator(context(input, 'input', 'field'), required, renderer);
      expect(label.title).toBe('Required!');

      new BootstrapValidationDisplayStrategy({ requiredIndicator: { mode: 'label-class', markerClass: 'required-label' } })
        .renderRequiredIndicator(context(input, 'input', 'field'), required, renderer);
      expect(label.classList).toContain('required-label');

      new BootstrapValidationDisplayStrategy({ requiredIndicator: { mode: 'none' } })
        .renderRequiredIndicator(context(input, 'input', 'field'), required, renderer);
      expect(label.querySelector(`[${POLICY_VALIDATION_DOM.required}]`)).toBeNull();

      new BootstrapValidationDisplayStrategy().renderRequiredIndicator(
        context(input, 'input', 'field'),
        { ...required, isRequired: false },
        renderer
      );
      expect(label.title).toBe('');
    });

    it('handles radio groups and missing display roots and labels', () => {
      const root = mount('<fieldset><legend>Pick</legend><div class="form-check"><input type="radio"></div><div class="form-check"><input type="radio"></div></fieldset>');
      const fieldset = root.querySelector('fieldset')!;
      const strategy = new BootstrapValidationDisplayStrategy();
      const ctx = context(fieldset, 'radio-group', 'choice');

      strategy.renderErrors(ctx, errors.slice(0, 1), renderer);
      expect(fieldset.getAttribute('aria-invalid')).toBe('true');
      expect(fieldset.querySelectorAll('.is-invalid').length).toBe(2);
      strategy.renderRequiredIndicator(ctx, { propertyName: 'choice', isRequired: true, hasRequiredError: false }, renderer);
      expect(fieldset.querySelector('legend')?.textContent).toContain('*');
      strategy.clearErrors(ctx, renderer);

      const detached = document.createElement('input');
      const detachedCtx = context(detached, 'input');
      expect(strategy.ensureErrorContainer(detachedCtx, renderer)).toBeNull();
      strategy.renderErrors(detachedCtx, errors, renderer);
      strategy.renderRequiredIndicator(detachedCtx, { propertyName: 'name', isRequired: true, hasRequiredError: false }, renderer);
    });
  });

  describe('TailwindValidationDisplayStrategy', () => {
    it('detects native controls', () => {
      const strategy = new TailwindValidationDisplayStrategy();
      const tags = ['fieldset', 'textarea', 'select', 'input', 'input', 'input'].map((tag) => document.createElement(tag));
      tags[3].setAttribute('type', 'checkbox');
      tags[4].setAttribute('type', 'radio');
      expect(tags.map((element) => strategy.detectControlType(element))).toEqual([
        'radio-group', 'textarea', 'select', 'checkbox', 'radio', 'input'
      ]);
    });

    it('deduplicates containers, avoids rewriting identical messages, and clears state', () => {
      const root = mount(`<div class="tw-field" data-policy-validation-field>
        <label class="tw-label" for="name">Name</label><input id="name">
        <div data-policy-validation-tailwind-errors-for="name"><div role="alert">Name is required</div><div role="alert">Name is too short</div></div>
        <div data-policy-validation-tailwind-errors-for="name"></div>
      </div>`);
      const input = root.querySelector('input')!;
      const strategy = new TailwindValidationDisplayStrategy();
      const ctx = context(input, 'input');
      const existingFirstMessage = root.querySelector('[role="alert"]');

      strategy.renderErrors(ctx, errors, renderer);
      expect(root.querySelectorAll(`[${POLICY_VALIDATION_DOM.tailwindErrorsFor}]`).length).toBe(1);
      expect(root.querySelector('[role="alert"]')).toBe(existingFirstMessage);
      expect(input.classList).toContain('tw-input-invalid');

      strategy.renderErrors(ctx, errors.slice(0, 1), renderer);
      expect(strategy.getErrorContainer(ctx)?.querySelectorAll('[role="alert"]').length).toBe(1);
      strategy.clearErrors(ctx, renderer);
      expect(strategy.getErrorContainer(ctx)).toBeNull();
      expect(input.hasAttribute('aria-invalid')).toBeFalse();
    });

    it('handles checkbox and radio-group state plus idempotent required markers', () => {
      const root = mount(`<div class="tw-field" data-policy-validation-field><label class="tw-check-label"><input id="agree" type="checkbox">Agree</label></div>
        <fieldset><legend>Pick</legend><input type="radio"><input type="radio"></fieldset>`);
      const strategy = new TailwindValidationDisplayStrategy();
      const checkbox = root.querySelector('#agree') as HTMLInputElement;
      const checkboxCtx = context(checkbox, 'checkbox', 'agree');
      const fieldset = root.querySelector('fieldset')!;
      const groupCtx = context(fieldset, 'radio-group', 'choice');

      strategy.renderErrors(checkboxCtx, errors.slice(0, 1), renderer);
      expect(checkbox.closest('.tw-field')?.classList).toContain('tw-choice-invalid');
      strategy.renderRequiredIndicator(checkboxCtx, { propertyName: 'agree', isRequired: true, hasRequiredError: false }, renderer);
      strategy.renderRequiredIndicator(checkboxCtx, { propertyName: 'agree', isRequired: true, hasRequiredError: false }, renderer);
      expect(root.querySelectorAll(`[${POLICY_VALIDATION_DOM.required}]`).length).toBe(1);
      strategy.renderRequiredIndicator(checkboxCtx, { propertyName: 'agree', isRequired: false, hasRequiredError: false }, renderer);
      expect(root.querySelector(`[${POLICY_VALIDATION_DOM.required}]`)).toBeNull();
      strategy.clearErrors(checkboxCtx, renderer);

      strategy.renderErrors(groupCtx, errors.slice(0, 1), renderer);
      expect(fieldset.querySelectorAll('.tw-input-invalid').length).toBe(2);
      strategy.clearErrors(groupCtx, renderer);
    });

    it('returns null for detached controls', () => {
      const strategy = new TailwindValidationDisplayStrategy();
      const ctx = context(document.createElement('input'), 'input');
      expect(strategy.ensureErrorContainer(ctx, renderer)).toBeNull();
      strategy.renderErrors(ctx, errors, renderer);
      strategy.renderRequiredIndicator(ctx, { propertyName: 'name', isRequired: true, hasRequiredError: false }, renderer);
    });
  });

  describe('MaterialValidationDisplayStrategy', () => {
    it('detects Material hosts, descendants, and native controls', () => {
      const strategy = new MaterialValidationDisplayStrategy();
      const materialRoot = mount('<mat-select><input id="select-child"></mat-select><mat-checkbox><input id="check-child"></mat-checkbox><mat-radio-group><input id="radio-child"></mat-radio-group>');
      const hosts = ['mat-select', 'mat-checkbox', 'mat-radio-group'].map((tag) => document.createElement(tag));
      const radioButton = document.createElement('mat-radio-button');
      const fieldset = document.createElement('fieldset');
      const textarea = document.createElement('textarea');
      const select = document.createElement('select');
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
      const radio = document.createElement('input'); radio.type = 'radio';

      expect([
        ...hosts,
        radioButton,
        fieldset,
        materialRoot.querySelector('#select-child')!,
        materialRoot.querySelector('#check-child')!,
        materialRoot.querySelector('#radio-child')!,
        textarea,
        select,
        checkbox,
        radio,
        document.createElement('input')
      ].map((element) => strategy.detectControlType(element as HTMLElement))).toEqual([
        'select', 'checkbox', 'radio', 'radio', 'radio-group', 'select', 'checkbox', 'radio',
        'textarea', 'select', 'checkbox', 'radio', 'input'
      ]);
    });

    it('creates a Material form-field error wrapper, renders mat-error, and clears it', () => {
      const root = mount('<mat-form-field class="mat-mdc-form-field"><mat-label>Name</mat-label><input id="name"></mat-form-field>');
      const formField = root.querySelector('mat-form-field')!;
      const input = root.querySelector('input')!;
      const strategy = new MaterialValidationDisplayStrategy();
      const ctx = context(input, 'input');

      strategy.renderErrors(ctx, errors, renderer);
      expect(formField.querySelector('.mat-mdc-form-field-subscript-wrapper')).not.toBeNull();
      expect(strategy.getErrorContainer(ctx)?.querySelectorAll('mat-error').length).toBe(2);
      expect(formField.classList).toContain('mat-mdc-form-field-invalid');
      strategy.renderRequiredIndicator(ctx, { propertyName: 'name', isRequired: true, hasRequiredError: true }, renderer);
      expect(formField.querySelector('mat-label')?.classList).toContain('label-required');
      expect(formField.querySelector('.mat-placeholder-required')?.textContent).toBe(' *');
      strategy.renderRequiredIndicator(ctx, { propertyName: 'name', isRequired: false, hasRequiredError: false }, renderer);
      expect(formField.querySelector('mat-label')?.classList).not.toContain('label-required');
      strategy.clearErrors(ctx, renderer);
      expect(strategy.getErrorContainer(ctx)?.querySelector('mat-error')).toBeNull();
      expect(formField.hasAttribute('aria-invalid')).toBeFalse();
    });

    it('reuses modern and legacy form-field wrappers', () => {
      const modernRoot = mount('<mat-form-field><div class="mat-mdc-form-field-error-wrapper"></div><input></mat-form-field>');
      const legacyRoot = mount('<mat-form-field><div class="ng-trigger-transitionMessages"></div><input></mat-form-field>');
      const strategy = new MaterialValidationDisplayStrategy();
      const modernCtx = context(modernRoot.querySelector('input')!, 'input');
      const legacyCtx = context(legacyRoot.querySelector('input')!, 'input');
      expect(strategy.ensureErrorContainer(modernCtx, renderer)).toBe(modernRoot.querySelector<HTMLElement>('.mat-mdc-form-field-error-wrapper'));
      expect(strategy.ensureErrorContainer(legacyCtx, renderer)).toBe(legacyRoot.querySelector<HTMLElement>('.ng-trigger-transitionMessages'));
    });

    it('renders standalone checkbox errors, deduplicates containers, labels required state, and clears wrappers', () => {
      const root = mount(`<div class="mat-checkbox-field" data-policy-validation-field>
        <mat-checkbox><span class="mdc-label">Agree</span></mat-checkbox>
        <div data-policy-validation-mat-errors-for="agree"></div>
        <div data-policy-validation-mat-errors-for="agree"></div>
      </div>`);
      const checkbox = root.querySelector<HTMLElement>('mat-checkbox')!;
      const strategy = new MaterialValidationDisplayStrategy({ classes: { error: 'custom-error' } });
      const ctx = context(checkbox, 'checkbox', 'agree');

      strategy.renderErrors(ctx, errors.slice(0, 1), renderer);
      expect(root.querySelectorAll(`[${POLICY_VALIDATION_DOM.materialErrorsFor}]`).length).toBe(1);
      expect(root.querySelector('[role="alert"]')?.classList).toContain('custom-error');
      expect(checkbox.classList).toContain('mat-mdc-checkbox-invalid');
      expect(root.querySelector('.mat-checkbox-field')?.classList).toContain('policy-validation-mat-checkbox-invalid');
      strategy.renderRequiredIndicator(ctx, { propertyName: 'agree', isRequired: true, hasRequiredError: true }, renderer);
      expect(root.querySelector('.mdc-label')?.textContent).toContain('*');
      strategy.clearErrors(ctx, renderer);
      expect(root.querySelector(`[${POLICY_VALIDATION_DOM.materialErrorsFor}]`)).toBeNull();
    });

    it('renders standalone radio errors and group labels', () => {
      const root = mount(`<div class="mat-radio-block" data-policy-validation-field><legend class="mat-group-label">Choice</legend>
        <mat-radio-group></mat-radio-group></div>`);
      const group = root.querySelector<HTMLElement>('mat-radio-group')!;
      const strategy = new MaterialValidationDisplayStrategy();
      const ctx = context(group, 'radio', 'choice');

      strategy.renderErrors(ctx, errors.slice(0, 1), renderer);
      expect(group.classList).toContain('mat-radio-invalid');
      expect(root.querySelector('.mat-radio-block')?.classList).toContain('policy-validation-mat-radio-invalid');
      strategy.renderRequiredIndicator(ctx, { propertyName: 'choice', isRequired: true, hasRequiredError: true }, renderer);
      expect(root.querySelector('.mat-group-label')?.textContent).toContain('*');
      strategy.clearErrors(ctx, renderer);
      expect(group.hasAttribute('aria-invalid')).toBeFalse();
    });

    it('does nothing when no matching Material target exists', () => {
      const strategy = new MaterialValidationDisplayStrategy();
      const ctx = context(document.createElement('input'), 'input');
      expect(strategy.ensureErrorContainer(ctx, renderer)).toBeNull();
      expect(strategy.getErrorContainer(ctx)).toBeNull();
      strategy.renderErrors(ctx, errors, renderer);
      strategy.renderErrors(ctx, [], renderer);
      strategy.clearErrors(ctx, renderer);
      strategy.renderRequiredIndicator(ctx, { propertyName: 'name', isRequired: true, hasRequiredError: true }, renderer);
    });
  });

  describe('Default and example strategies', () => {
    it('routes generic and Material elements to the matching strategy', () => {
      const root = mount('<div><label for="plain">Plain</label><input id="plain"></div><mat-form-field><mat-label>Mat</mat-label><input id="mat"></mat-form-field>');
      const plain = root.querySelector('#plain') as HTMLElement;
      const material = root.querySelector('#mat') as HTMLElement;
      const auto = new DefaultValidationDisplayStrategy();

      expect(auto.detectControlType(plain)).toBe('input');
      auto.renderErrors(context(plain, 'input', 'plain'), errors.slice(0, 1), renderer);
      expect(plain.classList).toContain('policy-validation-invalid');

      auto.renderErrors(context(material, 'input', 'mat'), errors.slice(0, 1), renderer);
      expect(material.closest('mat-form-field')?.classList).toContain('mat-mdc-form-field-invalid');
      auto.renderRequiredIndicator(context(material, 'input', 'mat'), { propertyName: 'mat', isRequired: true, hasRequiredError: true }, renderer);
      expect(material.closest('mat-form-field')?.textContent).toContain('*');
      expect(auto.getErrorContainer(context(material, 'input', 'mat'))).not.toBeNull();
      expect(auto.ensureErrorContainer(context(material, 'input', 'mat'), renderer)).not.toBeNull();
      auto.clearErrors(context(material, 'input', 'mat'), renderer);
    });

    it('honors forced Material mode and detects Material ancestors within the search limit', () => {
      const forcedRoot = mount('<mat-form-field><mat-label>Forced</mat-label><input></mat-form-field>');
      const forced = new DefaultValidationDisplayStrategy({ framework: 'material' });
      const input = forcedRoot.querySelector('input')!;
      forced.renderErrors(context(input, 'input'), errors.slice(0, 1), renderer);
      expect(input.closest('mat-form-field')?.classList).toContain('mat-form-field-invalid');

      const nested = mount('<div class="mat-form-field"><div><div><input></div></div></div>');
      expect(new DefaultValidationDisplayStrategy().detectControlType(nested.querySelector('input')!)).toBe('input');
    });

    it('exposes a usable immutable PrimeNG example class map', () => {
      const strategy = new PrimeNgValidationDisplayStrategy();
      const root = mount('<div><label for="prime">Prime</label><input id="prime"></div>');
      const input = root.querySelector('input')!;

      strategy.renderErrors(context(input, 'input', 'prime'), errors.slice(0, 1), renderer);

      expect(strategy.classMap).toBe(PRIME_NG_DISPLAY_CLASSES);
      expect(Object.isFrozen(PRIME_NG_DISPLAY_CLASSES)).toBeTrue();
      expect(input.classList).toContain('p-invalid');
    });
  });
});
