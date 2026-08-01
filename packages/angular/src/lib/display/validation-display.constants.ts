import { CompleteValidationDisplayClassMap } from '../interfaces/validation-display.interface';

/** DOM attributes used by Validation Rules Engine display strategies (stable contract for custom implementations). */
export const POLICY_VALIDATION_DOM = {
  error: 'data-policy-validation-error',
  errorContainer: 'data-policy-validation-error-container',
  required: 'data-policy-validation-required',
  field: 'data-policy-validation-field',
  bootstrapErrorsFor: 'data-policy-validation-bootstrap-errors-for',
  tailwindErrorsFor: 'data-policy-validation-tailwind-errors-for',
  materialErrorsFor: 'data-policy-validation-mat-errors-for'
} as const;

export const GENERIC_DISPLAY_CLASSES = {
  invalid: 'policy-validation-invalid',
  error: 'policy-validation-error',
  errorContainer: 'policy-validation-error-container',
  requiredMarker: 'policy-validation-required-marker',
  baseInvalid: 'policy-validation-invalid',
  radioGroupInvalid: 'policy-validation-radio-group-invalid'
} as const satisfies CompleteValidationDisplayClassMap;

export const BOOTSTRAP_DISPLAY_CLASSES = {
  invalid: 'is-invalid',
  error: 'policy-validation-bootstrap-field-error',
  errorContainer: 'policy-validation-bootstrap-error-container',
  requiredMarker: 'policy-validation-required-marker text-danger',
  baseInvalid: 'is-invalid',
  radioGroupInvalid: 'policy-validation-radio-group-invalid'
} as const satisfies CompleteValidationDisplayClassMap;

export const TAILWIND_DISPLAY_CLASSES = {
  invalid: 'tw-input-invalid',
  error: 'tw-field-error',
  errorContainer: 'tw-error-container',
  requiredMarker: 'tw-required-marker',
  baseInvalid: 'tw-input-invalid',
  radioGroupInvalid: 'tw-choice-invalid'
} as const satisfies CompleteValidationDisplayClassMap;

export const MATERIAL_DISPLAY_CLASSES = {
  invalid: 'policy-validation-mat-invalid',
  error: 'mat-error policy-validation-mat-field-error',
  errorContainer: 'mat-mdc-form-field-error-wrapper',
  requiredMarker: 'policy-validation-mat-required-marker',
  baseInvalid: 'policy-validation-mat-invalid',
  radioGroupInvalid: 'policy-validation-mat-radio-group-invalid',
  checkboxErrorContainer: 'policy-validation-mat-checkbox-errors',
  radioErrorContainer: 'policy-validation-mat-radio-errors'
} as const;

export const DEFAULT_REQUIRED_MARKER = ' *';

export const DEFAULT_ERROR_ELEMENT_TAG = 'div';
