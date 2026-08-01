import { Renderer2 } from '@angular/core';
import { ControlType, RequiredResult, ValidationResult } from '@validation-rules-engine/core';
import { AbstractValidationDisplayStrategy } from '../display/abstract-validation-display.strategy';
import {
  DEFAULT_ERROR_ELEMENT_TAG,
  DEFAULT_REQUIRED_MARKER,
  GENERIC_DISPLAY_CLASSES,
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
 * Framework-agnostic display strategy. Uses configurable CSS classes so consumers
 * can map to Bootstrap, Tailwind, Material, or custom styles.
 */
export class GenericValidationDisplayStrategy extends AbstractValidationDisplayStrategy {
  private readonly classes: CompleteValidationDisplayClassMap;
  private readonly requiredIndicator: RequiredIndicatorConfig;
  private readonly errorElementTag: string;

  constructor(config: ValidationDisplayConfig = {}) {
    super();
    this.classes = getResolvedClassMap({ preset: 'generic', ...config });
    this.requiredIndicator = resolveRequiredIndicator(
      { preset: 'generic', ...config },
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
    const root = this.getDisplayRoot(context);
    if (!root) {
      return null;
    }

    return root.querySelector(`[${POLICY_VALIDATION_DOM.errorContainer}="${this.containerId(context)}"]`) as HTMLElement | null;
  }

  renderErrors(
    context: ValidationDisplayContext,
    errors: ValidationResult[],
    renderer: Renderer2
  ): void {
    this.clearErrors(context, renderer);

    if (!errors.length) {
      return;
    }

    const container = this.createErrorContainer(context, renderer);
    if (!container) {
      return;
    }

    errors.forEach((validationError) => {
      const errorElement = renderer.createElement(this.errorElementTag);
      addClasses(renderer, errorElement, `${this.classes.error} ${GENERIC_DISPLAY_CLASSES.error}`);
      renderer.setAttribute(errorElement, POLICY_VALIDATION_DOM.error, 'true');
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

    if (requiredResult.isRequired && this.requiredIndicator.mode !== 'none') {
      const marker = renderer.createElement('span');
      addClasses(renderer, marker, this.requiredIndicator.markerClass ?? this.classes.requiredMarker);
      renderer.setAttribute(marker, POLICY_VALIDATION_DOM.required, 'true');
      renderer.setAttribute(marker, 'aria-hidden', 'true');
      renderer.appendChild(marker, renderer.createText(this.requiredIndicator.marker ?? DEFAULT_REQUIRED_MARKER));
      renderer.appendChild(label, marker);
    }
  }

  private applyInvalidState(context: ValidationDisplayContext, renderer: Renderer2): void {
    if (context.controlType === 'radio' || context.controlType === 'radio-group') {
      this.getRadioInputs(context).forEach((radio) => {
        addClasses(renderer, radio, this.classes.baseInvalid);
        const formCheck = radio.closest('.form-check');
        if (formCheck) {
          addClasses(renderer, formCheck as Element, this.classes.radioGroupInvalid);
        }
      });
      const fieldset = this.getFieldset(context);
      if (fieldset) {
        addClasses(renderer, fieldset, this.classes.radioGroupInvalid);
        renderer.setAttribute(fieldset, 'aria-invalid', 'true');
      }
      return;
    }

    if (context.controlType === 'checkbox') {
      addClasses(renderer, context.hostElement, this.classes.baseInvalid);
      const formCheck = context.hostElement.closest('.form-check');
      if (formCheck) {
        addClasses(renderer, formCheck as Element, this.classes.radioGroupInvalid);
      }
      renderer.setAttribute(context.hostElement, 'aria-invalid', 'true');
      return;
    }

    addClasses(renderer, context.hostElement, `${this.classes.invalid} ${this.classes.baseInvalid}`);
    renderer.setAttribute(context.hostElement, 'aria-invalid', 'true');
  }

  private clearInvalidState(context: ValidationDisplayContext, renderer: Renderer2): void {
    if (context.controlType === 'radio' || context.controlType === 'radio-group') {
      this.getRadioInputs(context).forEach((radio) => {
        removeClasses(renderer, radio, this.classes.baseInvalid);
        removeClasses(renderer, radio, this.classes.invalid);
        const formCheck = radio.closest('.form-check');
        if (formCheck) {
          removeClasses(renderer, formCheck as Element, this.classes.radioGroupInvalid);
        }
      });
      const fieldset = this.getFieldset(context);
      if (fieldset) {
        removeClasses(renderer, fieldset, this.classes.radioGroupInvalid);
        renderer.removeAttribute(fieldset, 'aria-invalid');
      }
      return;
    }

    if (context.controlType === 'checkbox') {
      removeClasses(renderer, context.hostElement, `${this.classes.invalid} ${this.classes.baseInvalid}`);
      const formCheck = context.hostElement.closest('.form-check');
      if (formCheck) {
        removeClasses(renderer, formCheck as Element, this.classes.radioGroupInvalid);
      }
      renderer.removeAttribute(context.hostElement, 'aria-invalid');
      return;
    }

    removeClasses(renderer, context.hostElement, `${this.classes.invalid} ${this.classes.baseInvalid}`);
    renderer.removeAttribute(context.hostElement, 'aria-invalid');
  }

  private createErrorContainer(context: ValidationDisplayContext, renderer: Renderer2): HTMLElement | null {
    const root = this.getDisplayRoot(context);
    if (!root) {
      return null;
    }

    const container = renderer.createElement('div');
    addClasses(renderer, container, this.classes.errorContainer);
    renderer.setAttribute(container, POLICY_VALIDATION_DOM.errorContainer, this.containerId(context));

    if (context.controlType === 'radio' || context.controlType === 'radio-group') {
      renderer.appendChild(root, container);
      return container;
    }

    renderer.insertBefore(root, container, context.hostElement.nextSibling);
    return container;
  }

  private containerId(context: ValidationDisplayContext): string {
    if (context.controlType === 'radio' || context.controlType === 'radio-group') {
      return context.propertyPath;
    }

    const hostId = context.hostElement.getAttribute('id');
    return hostId ?? context.propertyPath;
  }

  private getDisplayRoot(context: ValidationDisplayContext): HTMLElement | null {
    if (context.controlType === 'radio' || context.controlType === 'radio-group') {
      return this.getFieldset(context) ?? context.hostElement.parentElement;
    }

    return context.hostElement.parentElement;
  }

  private getFieldset(context: ValidationDisplayContext): HTMLElement | null {
    if (context.hostElement.tagName.toUpperCase() === 'FIELDSET') {
      return context.hostElement;
    }

    return context.hostElement.closest('fieldset') as HTMLElement | null;
  }

  private getRadioInputs(context: ValidationDisplayContext): HTMLInputElement[] {
    const fieldset = this.getFieldset(context);
    if (fieldset) {
      return Array.from(fieldset.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
    }

    const name = context.hostElement.getAttribute('name');
    if (!name) {
      return [context.hostElement as HTMLInputElement];
    }

    return Array.from(
      context.hostElement.ownerDocument.querySelectorAll(`input[type="radio"][name="${name}"]`)
    ) as HTMLInputElement[];
  }

  private findLabel(context: ValidationDisplayContext): HTMLElement | null {
    const host = context.hostElement;

    if (context.controlType === 'radio' || context.controlType === 'radio-group') {
      const fieldset = this.getFieldset(context);
      if (fieldset) {
        const legend = fieldset.querySelector('legend');
        if (legend) {
          return legend as HTMLElement;
        }
      }
    }

    const id = host.getAttribute('id');
    if (id && context.controlType !== 'radio') {
      const labelByFor = host.ownerDocument.querySelector(`label[for="${id}"]`);
      if (labelByFor) {
        return labelByFor as HTMLElement;
      }
    }

    const parentLabel = host.closest('label');
    if (parentLabel) {
      return parentLabel as HTMLElement;
    }

    const fieldWrapper = host.closest('[data-policy-validation-field], .form-group, .form-check, fieldset, .field, .mb-3, .tw-field');
    if (fieldWrapper) {
      const twLabel = fieldWrapper.querySelector('.tw-label');
      if (twLabel) {
        return twLabel as HTMLElement;
      }
      const legend = fieldWrapper.querySelector('legend');
      if (legend) {
        return legend as HTMLElement;
      }
      const label = fieldWrapper.querySelector('label');
      return label as HTMLElement | null;
    }

    return null;
  }
}
