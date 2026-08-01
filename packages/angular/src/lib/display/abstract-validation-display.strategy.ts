import { Renderer2 } from '@angular/core';
import { ControlType, RequiredResult, ValidationResult } from '@validation-rules-engine/core';
import {
  ValidationDisplayContext,
  ValidationDisplayStrategy
} from '../interfaces/validation-display.interface';

/**
 * Base class for custom display strategies. Extend this to get compile-time errors
 * when any required hook is not implemented.
 */
export abstract class AbstractValidationDisplayStrategy implements ValidationDisplayStrategy {
  abstract detectControlType(element: HTMLElement): ControlType;

  abstract ensureErrorContainer(
    context: ValidationDisplayContext,
    renderer: Renderer2
  ): HTMLElement | null;

  abstract getErrorContainer(context: ValidationDisplayContext): HTMLElement | null;

  abstract renderErrors(
    context: ValidationDisplayContext,
    errors: ValidationResult[],
    renderer: Renderer2
  ): void;

  abstract clearErrors(context: ValidationDisplayContext, renderer: Renderer2): void;

  abstract renderRequiredIndicator(
    context: ValidationDisplayContext,
    requiredResult: RequiredResult,
    renderer: Renderer2
  ): void;
}
