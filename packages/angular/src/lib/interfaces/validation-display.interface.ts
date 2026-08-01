import { Renderer2 } from '@angular/core';
import { ControlType, RequiredResult, ValidationResult } from '@validation-rules-engine/core';

export interface ValidationDisplayContext {
  hostElement: HTMLElement;
  controlType: ControlType;
  propertyPath: string;
}

/**
 * Presentation hook contract. Validation engine (policies, events, model meta) stays
 * framework-agnostic; consumers implement or configure this layer for their UI toolkit.
 */
export interface ValidationDisplayStrategy {
  detectControlType(element: HTMLElement): ControlType;
  ensureErrorContainer(context: ValidationDisplayContext, renderer: Renderer2): HTMLElement | null;
  getErrorContainer(context: ValidationDisplayContext): HTMLElement | null;
  renderErrors(
    context: ValidationDisplayContext,
    errors: ValidationResult[],
    renderer: Renderer2
  ): void;
  clearErrors(context: ValidationDisplayContext, renderer: Renderer2): void;
  renderRequiredIndicator(
    context: ValidationDisplayContext,
    requiredResult: RequiredResult,
    renderer: Renderer2
  ): void;
}

/** Required CSS class map for class-map based strategies. Missing keys fail at compile time. */
export interface ValidationDisplayClassMap {
  /** Applied to the host control when invalid */
  invalid: string;
  /** Applied to each rendered error message element */
  error: string;
  /** Applied to the error message container wrapper */
  errorContainer: string;
  /** Applied to the required-field marker element */
  requiredMarker: string;
  /** Framework-agnostic invalid marker always applied alongside `invalid` */
  baseInvalid: string;
  /** Applied to radio groups / checkbox wrappers when invalid */
  radioGroupInvalid: string;
}

export type CompleteValidationDisplayClassMap = Required<ValidationDisplayClassMap>;

/**
 * Define a complete class map for a custom UI framework. TypeScript enforces every key.
 *
 * @example
 * export const PRIME_NG_CLASSES = defineValidationDisplayClasses({
 *   invalid: 'p-invalid',
 *   error: 'p-error',
 *   errorContainer: 'p-error-container',
 *   requiredMarker: 'p-required',
 *   baseInvalid: 'policy-validation-invalid',
 *   radioGroupInvalid: 'p-radiogroup-invalid'
 * });
 */
export function defineValidationDisplayClasses<T extends CompleteValidationDisplayClassMap>(
  classes: T
): Readonly<T> {
  return Object.freeze(classes);
}

export type RequiredIndicatorMode = 'inline-suffix' | 'tooltip' | 'label-class' | 'none';

export interface RequiredIndicatorConfig {
  mode: RequiredIndicatorMode;
  /** Text for inline-suffix mode (default: ' *') */
  marker?: string;
  /** CSS classes for the marker element or label (label-class mode) */
  markerClass?: string;
  /** Title attribute when mode is tooltip (e.g. Bootstrap default "Required field") */
  tooltipText?: string;
}

export type ValidationDisplayPresetId = 'bootstrap' | 'material' | 'tailwind' | 'generic' | 'auto';

export interface ValidationDisplayConfig {
  /**
   * Built-in preset strategy. Built-in presets are examples; override `classes` to customize.
   */
  preset?: ValidationDisplayPresetId;
  /** Partial overrides merged onto the preset default class map */
  classes?: Partial<CompleteValidationDisplayClassMap>;
  /** How required fields are indicated in the UI */
  requiredIndicator?: RequiredIndicatorConfig;

  /** @deprecated Prefer `classes.invalid` or `preset: 'bootstrap'` */
  invalidClass?: string;
  /** @deprecated Prefer `classes.error` */
  errorClass?: string;
  /** HTML tag used for error messages (default: div) */
  errorElementTag?: string;
  /** @deprecated Prefer `requiredIndicator.marker` */
  requiredMarker?: string;
  /** @deprecated Prefer `requiredIndicator.markerClass` or `classes.requiredMarker` */
  requiredMarkerClass?: string;
  /** Override the default display strategy entirely (full custom implementation) */
  strategy?: ValidationDisplayStrategy;
  /**
   * @deprecated Prefer `preset: 'material'` or `preset: 'auto'`
   * Legacy auto-detection: material vs generic.
   */
  framework?: 'material' | 'auto';
  /** @deprecated Prefer `classes.errorContainer` */
  errorContainerClass?: string;
}

export type ValidationDisplaySetupOptions = ValidationDisplayConfig;
