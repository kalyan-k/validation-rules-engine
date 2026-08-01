import { Renderer2 } from '@angular/core';
import { ControlType, RequiredResult, ValidationResult } from '@validation-rules-engine/core';
import { AbstractValidationDisplayStrategy } from '../display/abstract-validation-display.strategy';
import {
  DEFAULT_ERROR_ELEMENT_TAG,
  DEFAULT_REQUIRED_MARKER,
  POLICY_VALIDATION_DOM
} from '../display/validation-display.constants';
import {
  DEFAULT_REQUIRED_INDICATOR,
  getResolvedClassMap,
  resolveRequiredIndicator
} from '../display/validation-display.config-resolver';
import {
  CompleteValidationDisplayClassMap,
  RequiredIndicatorConfig,
  ValidationDisplayConfig,
  ValidationDisplayContext
} from '../interfaces/validation-display.interface';
import { addClasses, removeClasses } from '../utils/dom.util';

/**
 * Tailwind-specific display strategy (example preset).
 * Keeps checkbox/radio error placement and invalid styling isolated from Bootstrap/Material.
 */
export class TailwindValidationDisplayStrategy extends AbstractValidationDisplayStrategy {
  private readonly classes: CompleteValidationDisplayClassMap;
  private readonly requiredIndicator: RequiredIndicatorConfig;
  private readonly errorElementTag: string;

  constructor(config: ValidationDisplayConfig = {}) {
    super();
    this.classes = getResolvedClassMap({ preset: 'tailwind', ...config });
    this.requiredIndicator = resolveRequiredIndicator(
      { preset: 'tailwind', ...config },
      DEFAULT_REQUIRED_INDICATOR
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
    return this.findErrorContainer(this.getDisplayRoot(context), this.containerId(context));
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

    const root = this.getDisplayRoot(context);
    if (!root) {
      return;
    }

    const containerId = this.containerId(context);
    const existingContainers = this.findAllErrorContainers(root, containerId);
    const container = existingContainers[0] ?? this.createErrorContainer(context, renderer);
    if (!container) {
      return;
    }

    existingContainers.slice(1).forEach((duplicate) => {
      if (duplicate.parentElement) {
        renderer.removeChild(duplicate.parentElement, duplicate);
      }
    });

    const nextMessages = errors.map((entry) => entry.error.message).join('\u0000');
    const currentMessages = Array.from(container.querySelectorAll('[role="alert"]'))
      .map((node) => node.textContent ?? '')
      .join('\u0000');

    if (nextMessages === currentMessages) {
      this.applyInvalidState(context, renderer);
      return;
    }

    this.clearErrorMessages(container, renderer);

    errors.forEach((validationError) => {
      const errorElement = renderer.createElement(this.errorElementTag);
      addClasses(renderer, errorElement, this.classes.error);
      renderer.setAttribute(errorElement, 'role', 'alert');
      renderer.appendChild(errorElement, renderer.createText(validationError.error.message));
      renderer.appendChild(container, errorElement);
    });

    this.applyInvalidState(context, renderer);
  }

  clearErrors(context: ValidationDisplayContext, renderer: Renderer2): void {
    const root = this.getDisplayRoot(context);
    const containerId = this.containerId(context);

    if (root) {
      this.findAllErrorContainers(root, containerId).forEach((container) => {
        if (container.parentElement) {
          renderer.removeChild(container.parentElement, container);
        }
      });
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

    const existingMarker = label.querySelector(`[${POLICY_VALIDATION_DOM.required}="true"]`);

    if (!requiredResult.isRequired) {
      if (existingMarker) {
        renderer.removeChild(label, existingMarker);
      }
      return;
    }

    if (existingMarker) {
      return;
    }

    const marker = renderer.createElement('span');
    addClasses(renderer, marker, this.requiredIndicator.markerClass ?? this.classes.requiredMarker);
    renderer.setAttribute(marker, POLICY_VALIDATION_DOM.required, 'true');
    renderer.setAttribute(marker, 'aria-hidden', 'true');
    renderer.appendChild(marker, renderer.createText(this.requiredIndicator.marker ?? DEFAULT_REQUIRED_MARKER));
    renderer.appendChild(label, marker);
  }

  private createErrorContainer(context: ValidationDisplayContext, renderer: Renderer2): HTMLElement | null {
    const root = this.getDisplayRoot(context);
    if (!root) {
      return null;
    }

    const container = renderer.createElement('div');
    addClasses(renderer, container, this.classes.errorContainer);
    renderer.setAttribute(container, POLICY_VALIDATION_DOM.tailwindErrorsFor, this.containerId(context));
    renderer.appendChild(root, container);
    return container;
  }

  private clearErrorMessages(container: HTMLElement, renderer: Renderer2): void {
    renderer.setProperty(container, 'innerHTML', '');
  }

  private applyInvalidState(context: ValidationDisplayContext, renderer: Renderer2): void {
    if (context.controlType === 'radio-group') {
      const fieldset = context.hostElement;
      addClasses(renderer, fieldset, this.classes.radioGroupInvalid);
      renderer.setAttribute(fieldset, 'aria-invalid', 'true');
      this.getRadioInputs(context).forEach((radio) => {
        addClasses(renderer, radio, this.classes.invalid);
      });
      return;
    }

    if (context.controlType === 'checkbox') {
      addClasses(renderer, context.hostElement, this.classes.invalid);
      const root = this.getDisplayRoot(context);
      if (root) {
        addClasses(renderer, root, this.classes.radioGroupInvalid);
      }
      renderer.setAttribute(context.hostElement, 'aria-invalid', 'true');
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
      });
      return;
    }

    if (context.controlType === 'checkbox') {
      removeClasses(renderer, context.hostElement, this.classes.invalid);
      const root = this.getDisplayRoot(context);
      if (root) {
        removeClasses(renderer, root, this.classes.radioGroupInvalid);
      }
      renderer.removeAttribute(context.hostElement, 'aria-invalid');
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

    return host.closest(`[${POLICY_VALIDATION_DOM.field}], .tw-field`) as HTMLElement | null
      ?? host.parentElement;
  }

  private containerId(context: ValidationDisplayContext): string {
    return context.propertyPath;
  }

  private findErrorContainer(root: HTMLElement | null, containerId: string): HTMLElement | null {
    if (!root) {
      return null;
    }

    const matches = this.findAllErrorContainers(root, containerId);
    return matches[0] ?? null;
  }

  private findAllErrorContainers(root: HTMLElement, containerId: string): HTMLElement[] {
    return Array.from(root.querySelectorAll(`[${POLICY_VALIDATION_DOM.tailwindErrorsFor}]`))
      .filter((node) => node.getAttribute(POLICY_VALIDATION_DOM.tailwindErrorsFor) === containerId) as HTMLElement[];
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

    const fieldWrapper = host.closest(`[${POLICY_VALIDATION_DOM.field}], .tw-field`) as HTMLElement | null;
    if (fieldWrapper) {
      const twLabel = fieldWrapper.querySelector('.tw-label, .tw-check-label');
      if (twLabel) {
        return twLabel as HTMLElement;
      }
    }

    return null;
  }
}
