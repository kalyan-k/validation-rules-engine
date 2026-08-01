import { useMemo, type ChangeEvent, type FocusEvent } from 'react';
import { getValidationMeta, shouldShowFieldErrors } from '@validation-rules-engine/core';
import { useValidationRulesContext } from '../context/validation-rules-context';
import type { ValidationFieldOptions, ValidationTarget } from '../types';
import { fieldId, getPropertyValue } from '../utilities/paths';
import type { UseValidationFormResult } from './use-validation-form';

type InputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export interface ValidationFieldResult {
  name: string;
  id: string;
  messageId: string;
  value: unknown;
  errors: ReturnType<UseValidationFormResult<ValidationTarget>['getFieldErrors']>;
  visibleErrors: ReturnType<UseValidationFormResult<ValidationTarget>['getFieldErrors']>;
  touched: boolean;
  dirty: boolean;
  invalid: boolean;
  inputProps: {
    id: string;
    name: string;
    value: string | number | readonly string[];
    onChange(event: ChangeEvent<InputElement>): void;
    onBlur(event: FocusEvent<InputElement>): void;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
  };
  checkboxProps: {
    id: string;
    name: string;
    checked: boolean;
    onChange(event: ChangeEvent<HTMLInputElement>): void;
    onBlur(event: FocusEvent<HTMLInputElement>): void;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
  };
  validate(): Promise<unknown>;
  clear(): void;
}

export function useValidationField<TModel extends ValidationTarget, TValue = unknown>(
  form: UseValidationFormResult<TModel>,
  propertyPath: string,
  options: ValidationFieldOptions<TValue> = {}
): ValidationFieldResult {
  const { configuration } = useValidationRulesContext();
  const id = options.id ?? fieldId(propertyPath);
  const messageId = options.messageId ?? `${id}-messages`;
  const validateOnChange = options.validateOnChange ?? configuration.validateOnChange;
  const validateOnBlur = options.validateOnBlur ?? configuration.validateOnBlur;
  const errors = form.getFieldErrors(propertyPath);
  const touched = !!getValidationMeta(form.model).touchedFields[propertyPath];
  const visibleErrors = shouldShowFieldErrors(form.model, propertyPath) ? errors : [];
  const value = getPropertyValue(form.model, propertyPath);
  const invalid = visibleErrors.length > 0;

  return useMemo(() => {
    const update = (rawValue: unknown): void => {
      const nextValue = options.parse ? options.parse(rawValue) : rawValue;
      void form.setFieldValue(propertyPath, nextValue, validateOnChange);
    };
    const blur = (): void => {
      form.touchField(propertyPath);
      if (validateOnBlur) void form.validateField(propertyPath);
    };
    const describedBy = invalid ? messageId : undefined;
    return {
      name: propertyPath,
      id,
      messageId,
      value,
      errors,
      visibleErrors,
      touched,
      dirty: form.dirtyFields.has(propertyPath),
      invalid,
      inputProps: {
        id,
        name: propertyPath,
        value: normalizeInputValue(value),
        onChange: (event: ChangeEvent<InputElement>) => update(event.target.value),
        onBlur: (_event: FocusEvent<InputElement>) => blur(),
        'aria-invalid': invalid,
        ...(describedBy ? { 'aria-describedby': describedBy } : {})
      },
      checkboxProps: {
        id,
        name: propertyPath,
        checked: Boolean(value),
        onChange: (event: ChangeEvent<HTMLInputElement>) => update(event.target.checked),
        onBlur: (_event: FocusEvent<HTMLInputElement>) => blur(),
        'aria-invalid': invalid,
        ...(describedBy ? { 'aria-describedby': describedBy } : {})
      },
      validate: () => form.validateField(propertyPath),
      clear: () => form.clear([propertyPath])
    };
  }, [errors, form, id, invalid, messageId, options, propertyPath, touched, validateOnBlur, validateOnChange, value, visibleErrors]);
}

function normalizeInputValue(value: unknown): string | number | readonly string[] {
  if (typeof value === 'number' || typeof value === 'string' || Array.isArray(value)) {
    return value as string | number | readonly string[];
  }
  return '';
}
