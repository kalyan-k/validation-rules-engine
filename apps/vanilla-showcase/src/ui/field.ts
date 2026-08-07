import { shouldShowFieldErrors } from '@validation-rules-engine/core';
import type { ValidationResult } from '@validation-rules-engine/core';
import type { ValidationEngine } from '../validation/engine';
import { fieldId, getPropertyValue, setPropertyValue } from '../validation/paths';
import type { ValidationTarget } from '../validation/types';
import { clear, el } from './render';

export interface FieldOptions {
  path: string;
  label: string;
  type?: string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  parse?: (value: unknown) => unknown;
  id?: string;
  selectOptions?: readonly { value: string; label: string }[];
  radioOptions?: readonly { value: string; label: string }[];
  control?: 'input' | 'select' | 'textarea' | 'checkbox' | 'radio';
}

export interface BoundField {
  root: HTMLElement;
  path: string;
  refresh(): void;
  syncValue(): void;
}

export interface FieldBindingContext {
  engine: ValidationEngine;
  getModel(): ValidationTarget;
  policyNames?: string[];
  onStructuralChange?: () => void;
  onFieldValidated?: (path: string) => void;
}

function messageHost(id: string): HTMLElement {
  return el('div', { className: 'validation-message', id });
}

function renderMessages(host: HTMLElement, errors: readonly ValidationResult[]): void {
  clear(host);
  for (const { error } of errors) {
    host.append(el('p', { textContent: error.message }));
  }
}

function visibleErrors(model: ValidationTarget, path: string, engine: ValidationEngine): ValidationResult[] {
  if (!shouldShowFieldErrors(model, path)) return [];
  return engine.getErrors(model, path);
}

function normalizeInputValue(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return '';
}

function setLabelContent(labelEl: HTMLElement, text: string, required: boolean): void {
  clear(labelEl);
  labelEl.append(document.createTextNode(text));
  if (required) {
    labelEl.append(el('span', { className: 'required-marker', 'aria-hidden': 'true' }, ['*']));
  }
}

export function bindField(ctx: FieldBindingContext, options: FieldOptions): BoundField {
  const control = options.control
    ?? (options.type === 'checkbox' ? 'checkbox' : options.radioOptions ? 'radio' : options.selectOptions ? 'select' : 'input');
  const id = options.id ?? fieldId(options.path);
  const messageId = `${id}-messages`;
  const message = messageHost(messageId);
  const model = ctx.getModel();
  const value = getPropertyValue(model, options.path);
  const validateOnBlur = options.validateOnBlur ?? true;

  const applyValue = (raw: unknown): void => {
    const next = options.parse ? options.parse(raw) : raw;
    setPropertyValue(ctx.getModel(), options.path, next);
    ctx.engine.notify(ctx.getModel());
    if (options.validateOnChange) void ctx.engine.validateField(ctx.getModel(), options.path, ctx.policyNames);
  };

  const onBlur = (): void => {
    void (async () => {
      try {
        ctx.engine.touch(ctx.getModel(), options.path);
        if (validateOnBlur) await ctx.engine.validateField(ctx.getModel(), options.path, ctx.policyNames);
        ctx.onFieldValidated?.(options.path);
      } catch {
        // Ignore races when the form unmounts mid-validation.
      }
    })();
  };

  let root: HTMLElement;
  let syncValue: () => void;
  let refresh: () => void;

  if (control === 'checkbox') {
    const input = el('input', {
      id,
      name: options.path,
      type: 'checkbox',
      checked: Boolean(value),
      onChange: (event: Event) => applyValue((event.target as HTMLInputElement).checked),
      onBlur
    }) as HTMLInputElement;
    const label = el('label', { htmlFor: id }, [options.label]);
    root = el('div', { className: 'checkbox-field' }, [
      input,
      label,
      message
    ]);
    syncValue = () => {
      input.checked = Boolean(getPropertyValue(ctx.getModel(), options.path));
    };
    refresh = () => {
      const current = ctx.getModel();
      const required = ctx.engine.isPathRequired(current, options.path, ctx.policyNames);
      setLabelContent(label, options.label, required);
      const errors = visibleErrors(current, options.path, ctx.engine);
      const invalid = errors.length > 0;
      root.classList.toggle('invalid', invalid);
      input.setAttribute('aria-invalid', String(invalid));
      if (invalid) input.setAttribute('aria-describedby', messageId);
      else input.removeAttribute('aria-describedby');
      renderMessages(message, errors);
    };
  } else if (control === 'radio') {
    const optionsHost = el('div', { className: 'radio-field__options' });
    const radios: HTMLInputElement[] = [];
    for (const option of options.radioOptions ?? []) {
      const radioId = `${id}-${option.value}`;
      const radio = el('input', {
        id: radioId,
        name: options.path,
        type: 'radio',
        value: option.value,
        checked: value === option.value,
        onChange: () => applyValue(option.value),
        onBlur
      }) as HTMLInputElement;
      radios.push(radio);
      optionsHost.append(el('label', { htmlFor: radioId }, [radio, el('span', {}, [option.label])]));
    }
    const legend = el('legend', { textContent: options.label });
    root = el('fieldset', { className: 'radio-field' }, [
      legend,
      optionsHost,
      message
    ]);
    syncValue = () => {
      const current = getPropertyValue(ctx.getModel(), options.path);
      for (const radio of radios) radio.checked = radio.value === current;
    };
    refresh = () => {
      const current = ctx.getModel();
      const required = ctx.engine.isPathRequired(current, options.path, ctx.policyNames);
      setLabelContent(legend, options.label, required);
      const errors = visibleErrors(current, options.path, ctx.engine);
      const invalid = errors.length > 0;
      root.classList.toggle('invalid', invalid);
      for (const radio of radios) {
        radio.setAttribute('aria-invalid', String(invalid));
        if (invalid) radio.setAttribute('aria-describedby', messageId);
        else radio.removeAttribute('aria-describedby');
      }
      renderMessages(message, errors);
    };
  } else if (control === 'select') {
    const select = el('select', {
      id,
      name: options.path,
      onChange: (event: Event) => applyValue((event.target as HTMLSelectElement).value),
      onBlur
    }, [
      el('option', { value: '' }, ['Choose one']),
      ...(options.selectOptions ?? []).map((option) =>
        el('option', { value: option.value, selected: value === option.value }, [option.label])
      )
    ]) as HTMLSelectElement;
    select.value = normalizeInputValue(value);
    const label = el('label', { htmlFor: id }, [options.label]);
    root = el('div', { className: 'form-field' }, [
      label,
      select,
      message
    ]);
    syncValue = () => {
      select.value = normalizeInputValue(getPropertyValue(ctx.getModel(), options.path));
    };
    refresh = () => {
      const current = ctx.getModel();
      const required = ctx.engine.isPathRequired(current, options.path, ctx.policyNames);
      setLabelContent(label, options.label, required);
      const errors = visibleErrors(current, options.path, ctx.engine);
      const invalid = errors.length > 0;
      root.classList.toggle('invalid', invalid);
      select.setAttribute('aria-invalid', String(invalid));
      if (invalid) select.setAttribute('aria-describedby', messageId);
      else select.removeAttribute('aria-describedby');
      renderMessages(message, errors);
    };
  } else if (control === 'textarea') {
    const textarea = el('textarea', {
      id,
      name: options.path,
      rows: '3',
      onInput: (event: Event) => applyValue((event.target as HTMLTextAreaElement).value),
      onBlur
    }) as HTMLTextAreaElement;
    textarea.value = normalizeInputValue(value);
    const label = el('label', { htmlFor: id }, [options.label]);
    root = el('div', { className: 'form-field' }, [
      label,
      textarea,
      message
    ]);
    syncValue = () => {
      textarea.value = normalizeInputValue(getPropertyValue(ctx.getModel(), options.path));
    };
    refresh = () => {
      const current = ctx.getModel();
      const required = ctx.engine.isPathRequired(current, options.path, ctx.policyNames);
      setLabelContent(label, options.label, required);
      const errors = visibleErrors(current, options.path, ctx.engine);
      const invalid = errors.length > 0;
      root.classList.toggle('invalid', invalid);
      textarea.setAttribute('aria-invalid', String(invalid));
      if (invalid) textarea.setAttribute('aria-describedby', messageId);
      else textarea.removeAttribute('aria-describedby');
      renderMessages(message, errors);
    };
  } else {
    const input = el('input', {
      id,
      name: options.path,
      type: options.type ?? 'text',
      onInput: (event: Event) => applyValue((event.target as HTMLInputElement).value),
      onBlur
    }) as HTMLInputElement;
    input.value = normalizeInputValue(value);
    const label = el('label', { htmlFor: id }, [options.label]);
    root = el('div', { className: 'form-field' }, [
      label,
      input,
      message
    ]);
    syncValue = () => {
      input.value = normalizeInputValue(getPropertyValue(ctx.getModel(), options.path));
    };
    refresh = () => {
      const current = ctx.getModel();
      const required = ctx.engine.isPathRequired(current, options.path, ctx.policyNames);
      setLabelContent(label, options.label, required);
      const errors = visibleErrors(current, options.path, ctx.engine);
      const invalid = errors.length > 0;
      root.classList.toggle('invalid', invalid);
      input.setAttribute('aria-invalid', String(invalid));
      if (invalid) input.setAttribute('aria-describedby', messageId);
      else input.removeAttribute('aria-describedby');
      renderMessages(message, errors);
    };
  }

  refresh();
  return { root, path: options.path, refresh, syncValue };
}

export function groupStatusLabel(status: { isEvaluated?: boolean; isValid?: boolean; isInValid?: boolean } | undefined): string {
  if (!status?.isEvaluated) return 'Not evaluated';
  return status.isValid ? 'Valid' : 'Needs attention';
}
