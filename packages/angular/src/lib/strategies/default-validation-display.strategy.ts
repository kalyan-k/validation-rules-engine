import { Renderer2 } from '@angular/core';
import { ControlType, RequiredResult, ValidationResult } from '@validation-rules-engine/core';
import { AbstractValidationDisplayStrategy } from '../display/abstract-validation-display.strategy';
import {
  ValidationDisplayConfig,
  ValidationDisplayContext,
  ValidationDisplayStrategy
} from '../interfaces/validation-display.interface';
import { GenericValidationDisplayStrategy } from './generic-validation-display.strategy';
import { MaterialValidationDisplayStrategy } from './material-validation-display.strategy';

export class DefaultValidationDisplayStrategy extends AbstractValidationDisplayStrategy {
  private readonly genericStrategy: GenericValidationDisplayStrategy;
  private readonly materialStrategy: MaterialValidationDisplayStrategy;
  private readonly framework: 'material' | 'auto';

  constructor(config: ValidationDisplayConfig = {}) {
    super();
    this.framework = config.framework === 'material' || config.preset === 'material' ? 'material' : 'auto';
    this.genericStrategy = new GenericValidationDisplayStrategy(config);
    this.materialStrategy = new MaterialValidationDisplayStrategy(config);
  }

  detectControlType(element: HTMLElement): ControlType {
    return this.resolveStrategy(element).detectControlType(element);
  }

  ensureErrorContainer(context: ValidationDisplayContext, renderer: Renderer2): HTMLElement | null {
    return this.resolveStrategy(context.hostElement).ensureErrorContainer(context, renderer);
  }

  getErrorContainer(context: ValidationDisplayContext): HTMLElement | null {
    return this.resolveStrategy(context.hostElement).getErrorContainer(context);
  }

  renderErrors(
    context: ValidationDisplayContext,
    errors: ValidationResult[],
    renderer: Renderer2
  ): void {
    this.resolveStrategy(context.hostElement).renderErrors(context, errors, renderer);
  }

  clearErrors(context: ValidationDisplayContext, renderer: Renderer2): void {
    this.resolveStrategy(context.hostElement).clearErrors(context, renderer);
  }

  renderRequiredIndicator(
    context: ValidationDisplayContext,
    requiredResult: RequiredResult,
    renderer: Renderer2
  ): void {
    this.resolveStrategy(context.hostElement).renderRequiredIndicator(context, requiredResult, renderer);
  }

  private resolveStrategy(element: HTMLElement): ValidationDisplayStrategy {
    if (this.framework === 'material' || this.isMaterialElement(element)) {
      return this.materialStrategy;
    }
    return this.genericStrategy;
  }

  private isMaterialElement(element: HTMLElement): boolean {
    let node: HTMLElement | null = element;
    for (let i = 0; i < 6 && node; i++) {
      const nodeName = node.nodeName.toUpperCase();
      if (
        nodeName.startsWith('MAT-') ||
        node.classList.contains('mat-form-field') ||
        node.classList.contains('mat-checkbox') ||
        node.classList.contains('mat-radio-group')
      ) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }
}
