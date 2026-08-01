import { Renderer2 } from '@angular/core';
import { ControlType, RequiredResult, ValidationResult } from '@validation-rules-engine/core';
import { AbstractValidationDisplayStrategy } from '../abstract-validation-display.strategy';
import {
  CompleteValidationDisplayClassMap,
  defineValidationDisplayClasses,
  ValidationDisplayContext
} from '../../interfaces/validation-display.interface';
import { GenericValidationDisplayStrategy } from '../../strategies/generic-validation-display.strategy';

/**
 * Example: PrimeNG-style preset built by a consumer.
 * Copy this pattern for ng-bootstrap, Taiga UI, or any custom toolkit.
 */
export const PRIME_NG_DISPLAY_CLASSES = defineValidationDisplayClasses({
  invalid: 'p-invalid',
  error: 'p-error',
  errorContainer: 'p-error-container',
  requiredMarker: 'p-required-marker',
  baseInvalid: 'policy-validation-invalid',
  radioGroupInvalid: 'p-radiogroup-invalid'
});

/**
 * Minimal custom strategy: reuse generic DOM logic with a typed class map.
 * Extend {@link AbstractValidationDisplayStrategy} directly when DOM structure differs
 * (see {@link MaterialValidationDisplayStrategy}).
 */
export class PrimeNgValidationDisplayStrategy extends GenericValidationDisplayStrategy {
  readonly classMap: CompleteValidationDisplayClassMap = PRIME_NG_DISPLAY_CLASSES;

  constructor() {
    super({ preset: 'generic', classes: PRIME_NG_DISPLAY_CLASSES });
  }
}

/**
 * Fully custom strategy skeleton. TypeScript reports errors until every abstract method is implemented.
 */
export abstract class ConsumerValidationDisplayStrategy extends AbstractValidationDisplayStrategy {
  abstract override detectControlType(element: HTMLElement): ControlType;
  abstract override ensureErrorContainer(
    context: ValidationDisplayContext,
    renderer: Renderer2
  ): HTMLElement | null;
  abstract override getErrorContainer(context: ValidationDisplayContext): HTMLElement | null;
  abstract override renderErrors(
    context: ValidationDisplayContext,
    errors: ValidationResult[],
    renderer: Renderer2
  ): void;
  abstract override clearErrors(context: ValidationDisplayContext, renderer: Renderer2): void;
  abstract override renderRequiredIndicator(
    context: ValidationDisplayContext,
    requiredResult: RequiredResult,
    renderer: Renderer2
  ): void;
}
