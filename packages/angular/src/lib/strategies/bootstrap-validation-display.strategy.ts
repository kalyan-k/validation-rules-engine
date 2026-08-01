import { Renderer2 } from '@angular/core';
import { ControlType, RequiredResult, ValidationResult } from '@validation-rules-engine/core';
import { AbstractValidationDisplayStrategy } from '../display/abstract-validation-display.strategy';
import {
  POLICY_VALIDATION_DOM,
  BOOTSTRAP_DISPLAY_CLASSES,
  DEFAULT_ERROR_ELEMENT_TAG
} from '../display/validation-display.constants';
import {
  getResolvedClassMap,
  resolveRequiredIndicator,
  BOOTSTRAP_REQUIRED_INDICATOR
} from '../display/validation-display.config-resolver';
import {
  CompleteValidationDisplayClassMap,
  RequiredIndicatorConfig,
  ValidationDisplayConfig,
  ValidationDisplayContext
} from '../interfaces/validation-display.interface';
import { addClasses, findElementByAttribute, removeClasses } from '../utils/dom.util';

export class BootstrapValidationDisplayStrategy extends AbstractValidationDisplayStrategy {
  private readonly classes: CompleteValidationDisplayClassMap;
  private readonly requiredIndicator: RequiredIndicatorConfig;
  private readonly errorElementTag: string;

  constructor(config: ValidationDisplayConfig = {}) {
    super();
    this.classes = getResolvedClassMap({ preset: 'bootstrap', ...config });
    this.requiredIndicator = resolveRequiredIndicator(
      { preset: 'bootstrap', ...config },
      BOOTSTRAP_REQUIRED_INDICATOR
    );
    this.errorElementTag = config.errorElementTag ?? DEFAULT_ERROR_ELEMENT_TAG;
  }

  detectControlType(element: HTMLElement): ControlType {
    const tag = element.tagName.toUpperCase();

    if (tag === 'FIELDSET') {
      return 'radio-group';
    }

    const type = (element.getAttribute('type') || '').toLowerCase();

    if (tag === 'TEXTAREA') {
      return 'textarea';
    }
    if (tag === 'SELECT') {
      return 'select';
    }
    if (type === 'checkbox') {
      return 'checkbox';
    }
    if (type === 'radio') {
      return 'radio';
    }
    return 'input';
  }

  ensureErrorContainer(context: ValidationDisplayContext, renderer: Renderer2): HTMLElement | null {
    return this.getErrorContainer(context) ?? this.createErrorContainer(context, renderer);
  }

  getErrorContainer(context: ValidationDisplayContext): HTMLElement | null {
    const root = this.getDisplayRoot(context);
    if (!root) {
      return null;
    }

    return findElementByAttribute(
      root,
      POLICY_VALIDATION_DOM.bootstrapErrorsFor,
      this.containerId(context)
    );
  }

  renderErrors(
    context: ValidationDisplayContext,
    errors: ValidationResult[],
    renderer: Renderer2
  ): void {
    if (!errors.length) {
      this.clearErrors(context, renderer);
      return;
    }

    const container = this.ensureErrorContainer(context, renderer);
    if (!container) {
      return;
    }

    this.clearErrorMessages(container, renderer);

    errors.forEach((validationError) => {
      const errorElement = renderer.createElement(this.errorElementTag);
      addClasses(renderer, errorElement, `${this.classes.error} invalid-feedback d-block`);
      renderer.setAttribute(errorElement, 'role', 'alert');
      renderer.appendChild(errorElement, renderer.createText(validationError.error.message));
      renderer.appendChild(container, errorElement);
    });

    this.applyInvalidState(context, renderer);
  }

  clearErrors(context: ValidationDisplayContext, renderer: Renderer2): void {
    const container = this.getErrorContainer(context);
    if (container?.parentElement) {
      renderer.removeChild(container.parentElement, container);
    }

    this.clearInvalidState(context, renderer);
  }

  renderRequiredIndicator(
    context: ValidationDisplayContext,
    requiredResult: RequiredResult,
    renderer: Renderer2
  ): void {
    const label = this.findLabel(context);
    if (!label) {
      return;
    }

    label.querySelectorAll(`[${POLICY_VALIDATION_DOM.required}="true"]`).forEach((marker) => {
      renderer.removeChild(label, marker);
    });

    renderer.removeAttribute(label, 'title');

    if (!requiredResult.isRequired) {
      return;
    }

    if (this.requiredIndicator.mode === 'tooltip') {
      renderer.setAttribute(label, 'title', this.requiredIndicator.tooltipText ?? 'Required field');
      return;
    }

    if (this.requiredIndicator.mode === 'label-class') {
      addClasses(renderer, label, this.requiredIndicator.markerClass ?? this.classes.requiredMarker);
      return;
    }

    if (this.requiredIndicator.mode === 'none') {
      return;
    }

    const marker = renderer.createElement('span');
    addClasses(renderer, marker, this.requiredIndicator.markerClass ?? this.classes.requiredMarker);
    renderer.setAttribute(marker, POLICY_VALIDATION_DOM.required, 'true');
    renderer.appendChild(marker, renderer.createText(this.requiredIndicator.marker ?? ' *'));
    renderer.appendChild(label, marker);
  }

  private createErrorContainer(context: ValidationDisplayContext, renderer: Renderer2): HTMLElement | null {
    const root = this.getDisplayRoot(context);
    if (!root) {
      return null;
    }

    const container = renderer.createElement('div');
    addClasses(renderer, container, this.classes.errorContainer);
    renderer.setAttribute(container, POLICY_VALIDATION_DOM.bootstrapErrorsFor, this.containerId(context));
    renderer.appendChild(root, container);
    return container;
  }

  private clearErrorMessages(container: HTMLElement, renderer: Renderer2): void {
    container.querySelectorAll(`.${BOOTSTRAP_DISPLAY_CLASSES.error}, .invalid-feedback`).forEach((node) => {
      renderer.removeChild(container, node);
    });
  }

  private applyInvalidState(context: ValidationDisplayContext, renderer: Renderer2): void {
    if (context.controlType === 'radio-group') {
      const fieldset = context.hostElement;
      addClasses(renderer, fieldset, this.classes.radioGroupInvalid);
      renderer.setAttribute(fieldset, 'aria-invalid', 'true');
      this.getRadioInputs(context).forEach((radio) => {
        addClasses(renderer, radio, this.classes.invalid);
        const formCheck = radio.closest('.form-check');
        if (formCheck) {
          addClasses(renderer, formCheck as Element, this.classes.radioGroupInvalid);
        }
      });
      return;
    }

    addClasses(renderer, context.hostElement, this.classes.invalid);
    renderer.setAttribute(context.hostElement, 'aria-invalid', 'true');
  }

  private clearInvalidState(context: ValidationDisplayContext, renderer: Renderer2): void {
    if (context.controlType === 'radio-group') {
      const fieldset = context.hostElement;
      removeClasses(renderer, fieldset, this.classes.radioGroupInvalid);
      renderer.removeAttribute(fieldset, 'aria-invalid');
      this.getRadioInputs(context).forEach((radio) => {
        removeClasses(renderer, radio, this.classes.invalid);
        const formCheck = radio.closest('.form-check');
        if (formCheck) {
          removeClasses(renderer, formCheck as Element, this.classes.radioGroupInvalid);
        }
      });
      return;
    }

    removeClasses(renderer, context.hostElement, this.classes.invalid);
    renderer.removeAttribute(context.hostElement, 'aria-invalid');
  }

  private getDisplayRoot(context: ValidationDisplayContext): HTMLElement | null {
    const host = context.hostElement;

    if (context.controlType === 'radio-group') {
      return host;
    }

    return host.closest('.form-group, .form-check, [data-policy-validation-field]') as HTMLElement | null
      ?? host.parentElement;
  }

  private containerId(context: ValidationDisplayContext): string {
    return context.propertyPath;
  }

  private getRadioInputs(context: ValidationDisplayContext): HTMLInputElement[] {
    if (context.hostElement.tagName.toUpperCase() === 'FIELDSET') {
      return Array.from(
        context.hostElement.querySelectorAll('input[type="radio"]')
      ) as HTMLInputElement[];
    }

    return [];
  }

  private findLabel(context: ValidationDisplayContext): HTMLElement | null {
    const host = context.hostElement;

    if (context.controlType === 'radio-group') {
      return host.querySelector('legend') as HTMLElement | null;
    }

    const id = host.getAttribute('id');
    if (id) {
      const labelByFor = host.ownerDocument.querySelector(`label[for="${id}"]`);
      if (labelByFor) {
        return labelByFor as HTMLElement;
      }
    }

    const parentLabel = host.closest('label');
    if (parentLabel) {
      return parentLabel as HTMLElement;
    }

    const formGroup = host.closest('.form-group, .form-check');
    if (formGroup) {
      return formGroup.querySelector('label') as HTMLElement | null;
    }

    return null;
  }
}
