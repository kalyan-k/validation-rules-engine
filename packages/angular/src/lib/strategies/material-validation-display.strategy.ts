import { Renderer2 } from '@angular/core';
import { ControlType, RequiredResult, ValidationResult } from '@validation-rules-engine/core';
import { AbstractValidationDisplayStrategy } from '../display/abstract-validation-display.strategy';
import { MATERIAL_DISPLAY_CLASSES, POLICY_VALIDATION_DOM } from '../display/validation-display.constants';
import {
  ValidationDisplayConfig,
  ValidationDisplayContext
} from '../interfaces/validation-display.interface';
import { addClasses, findAllElementsByAttribute, findElementByAttribute } from '../utils/dom.util';

const STANDALONE_ERROR_ATTR = POLICY_VALIDATION_DOM.materialErrorsFor;

/**
 * Display strategy for Angular Material (MDC-based, v15+).
 * Form-field controls use mat-error; checkbox/radio use standalone containers in wrapper divs.
 */
export class MaterialValidationDisplayStrategy extends AbstractValidationDisplayStrategy {
  private readonly checkboxErrorClass: string;
  private readonly radioErrorClass: string;
  private readonly standaloneErrorClass: string;

  constructor(config: ValidationDisplayConfig = {}) {
    super();
    this.checkboxErrorClass = MATERIAL_DISPLAY_CLASSES.checkboxErrorContainer;
    this.radioErrorClass = MATERIAL_DISPLAY_CLASSES.radioErrorContainer;
    this.standaloneErrorClass = config.classes?.error ?? 'policy-validation-mat-field-error';
  }
  detectControlType(element: HTMLElement): ControlType {
    const tag = element.tagName.toUpperCase();

    if (tag === 'MAT-SELECT') {
      return 'select';
    }
    if (tag === 'MAT-CHECKBOX') {
      return 'checkbox';
    }
    if (tag === 'MAT-RADIO-GROUP') {
      return 'radio';
    }
    if (tag === 'MAT-RADIO-BUTTON') {
      return 'radio';
    }
    if (tag === 'FIELDSET') {
      return 'radio-group';
    }
    if (element.closest('mat-select')) {
      return 'select';
    }
    if (element.closest('mat-checkbox')) {
      return 'checkbox';
    }
    if (element.closest('mat-radio-group')) {
      return 'radio';
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
    if (context.controlType === 'checkbox') {
      return this.ensureStandaloneErrorContainer(context, this.checkboxErrorClass, renderer);
    }

    if (context.controlType === 'radio') {
      return this.ensureStandaloneErrorContainer(context, this.radioErrorClass, renderer);
    }

    const parent = this.findMatFormField(context);
    if (!parent) {
      return null;
    }

    return this.ensureFormFieldErrorWrapper(parent, renderer);
  }

  getErrorContainer(context: ValidationDisplayContext): HTMLElement | null {
    if (context.controlType === 'checkbox' || context.controlType === 'radio') {
      const root = this.getStandaloneDisplayRoot(context);
      if (!root) {
        return null;
      }

      return findElementByAttribute(root, STANDALONE_ERROR_ATTR, context.propertyPath);
    }

    const parent = this.findMatFormField(context);
    if (!parent) {
      return null;
    }

    return (
      parent.querySelector('.mat-mdc-form-field-error-wrapper')
      ?? parent.querySelector('.ng-trigger-transitionMessages')
      ?? parent.querySelector('.ui-validation-transitionMessages')
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

    if (context.controlType === 'checkbox' || context.controlType === 'radio') {
      this.removeDuplicateStandaloneContainers(context, renderer);
    }

    const container = this.ensureErrorContainer(context, renderer);
    const invalidTarget = this.getInvalidTarget(context);
    if (!container || !invalidTarget) {
      return;
    }

    this.clearErrorMessages(container, renderer, context.controlType);

    errors.forEach((validationError) => {
      const errorElement = this.createErrorElement(context.controlType, renderer);
      renderer.appendChild(errorElement, renderer.createText(validationError.error.message));
      renderer.appendChild(container, errorElement);
    });

    this.applyInvalidState(invalidTarget, context.controlType, renderer);
  }

  clearErrors(context: ValidationDisplayContext, renderer: Renderer2): void {
    const invalidTarget = this.getInvalidTarget(context);
    if (!invalidTarget) {
      return;
    }

    if (context.controlType === 'checkbox' || context.controlType === 'radio') {
      this.removeAllStandaloneErrorContainers(context, renderer);
    } else {
      const container = this.getErrorContainer(context);
      if (container) {
        this.clearErrorMessages(container, renderer, context.controlType);
      }
    }

    this.clearInvalidState(invalidTarget, context.controlType, renderer);
  }

  renderRequiredIndicator(
    context: ValidationDisplayContext,
    requiredResult: RequiredResult,
    renderer: Renderer2
  ): void {
    const parent = this.getInvalidTarget(context);
    if (!parent) {
      return;
    }

    const labelElements = this.getLabelElements(context, parent);
    labelElements.forEach((labelElement) => {
      labelElement.querySelectorAll('.mat-placeholder-required, [data-policy-validation-required]').forEach((marker) => {
        renderer.removeChild(labelElement, marker);
      });

      if (requiredResult.isRequired) {
        const marker = renderer.createElement('span');
        renderer.addClass(marker, 'mat-placeholder-required');
        renderer.addClass(marker, 'mat-form-field-required-marker');
        renderer.addClass(marker, 'mat-mdc-form-field-required-marker');
        renderer.setAttribute(marker, 'data-policy-validation-required', 'true');
        renderer.setAttribute(marker, 'aria-hidden', 'true');
        renderer.appendChild(marker, renderer.createText(' *'));
        renderer.appendChild(labelElement, marker);
        renderer.addClass(labelElement, 'label-required');
      } else if (labelElement.classList.contains('label-required')) {
        renderer.removeClass(labelElement, 'label-required');
      }
    });
  }

  private ensureStandaloneErrorContainer(
    context: ValidationDisplayContext,
    containerClass: string,
    renderer: Renderer2
  ): HTMLElement | null {
    const root = this.getStandaloneDisplayRoot(context);
    if (!root) {
      return null;
    }

    let container = findElementByAttribute(root, STANDALONE_ERROR_ATTR, context.propertyPath);
    if (!container) {
      container = renderer.createElement('div') as HTMLElement;
      renderer.addClass(container, containerClass);
      renderer.setAttribute(container, STANDALONE_ERROR_ATTR, context.propertyPath);
      renderer.appendChild(root, container);
    }

    return container;
  }

  private ensureFormFieldErrorWrapper(parent: HTMLElement, renderer: Renderer2): HTMLElement {
    const existing = parent.querySelector('.mat-mdc-form-field-error-wrapper') as HTMLElement | null;
    if (existing) {
      return existing;
    }

    const legacy = parent.querySelector('.ng-trigger-transitionMessages, .ui-validation-transitionMessages') as HTMLElement | null;
    if (legacy) {
      return legacy;
    }

    let subscript = parent.querySelector('.mat-mdc-form-field-subscript-wrapper') as HTMLElement | null;
    if (!subscript) {
      subscript = renderer.createElement('div');
      renderer.addClass(subscript, 'mat-mdc-form-field-subscript-wrapper');
      renderer.addClass(subscript, 'mat-mdc-form-field-bottom-align');
      renderer.setStyle(subscript, 'display', 'block');
      renderer.appendChild(parent, subscript);
    }

    const wrapper = renderer.createElement('div');
    renderer.addClass(wrapper, 'mat-mdc-form-field-error-wrapper');
    renderer.appendChild(subscript, wrapper);
    return wrapper;
  }

  private getStandaloneDisplayRoot(context: ValidationDisplayContext): HTMLElement | null {
    const host = context.hostElement;

    if (context.controlType === 'checkbox') {
      const checkbox = this.findMatCheckbox(context);
      return checkbox?.closest('.mat-checkbox-field, [data-policy-validation-field]') as HTMLElement | null
        ?? checkbox?.parentElement
        ?? null;
    }

    if (context.controlType === 'radio') {
      const radioGroup = this.findMatRadioGroup(context);
      return radioGroup?.closest('.mat-radio-block, [data-policy-validation-field]') as HTMLElement | null
        ?? radioGroup?.parentElement
        ?? null;
    }

    return host.parentElement;
  }

  private getInvalidTarget(context: ValidationDisplayContext): HTMLElement | null {
    if (context.controlType === 'checkbox') {
      return this.findMatCheckbox(context);
    }

    if (context.controlType === 'radio') {
      return this.findMatRadioGroup(context);
    }

    return this.findMatFormField(context);
  }

  private findMatFormField(context: ValidationDisplayContext): HTMLElement | null {
    let node: HTMLElement | null = context.hostElement;

    for (let i = 0; i < 8 && node; i++) {
      if (node.tagName.toUpperCase() === 'MAT-FORM-FIELD' || node.classList.contains('mat-mdc-form-field')) {
        return node;
      }
      node = node.parentElement;
    }

    return null;
  }

  private findMatCheckbox(context: ValidationDisplayContext): HTMLElement | null {
    const host = context.hostElement;
    if (host.tagName.toUpperCase() === 'MAT-CHECKBOX') {
      return host;
    }

    return host.closest('mat-checkbox') as HTMLElement | null;
  }

  private findMatRadioGroup(context: ValidationDisplayContext): HTMLElement | null {
    const host = context.hostElement;
    if (host.tagName.toUpperCase() === 'MAT-RADIO-GROUP') {
      return host;
    }

    return host.closest('mat-radio-group') as HTMLElement | null;
  }

  private clearErrorMessages(
    container: HTMLElement,
    renderer: Renderer2,
    controlType: ControlType
  ): void {
    if (controlType === 'checkbox' || controlType === 'radio') {
      renderer.setProperty(container, 'innerHTML', '');
      return;
    }

    Array.from(container.querySelectorAll('mat-error')).forEach((node) => {
      if (node.parentElement === container) {
        renderer.removeChild(container, node);
      }
    });
  }

  private removeDuplicateStandaloneContainers(
    context: ValidationDisplayContext,
    renderer: Renderer2
  ): void {
    const containers = this.findStandaloneErrorContainers(context);
    containers.slice(1).forEach((container) => {
      if (container.parentElement) {
        renderer.removeChild(container.parentElement, container);
      }
    });
  }

  private removeAllStandaloneErrorContainers(
    context: ValidationDisplayContext,
    renderer: Renderer2
  ): void {
    this.findStandaloneErrorContainers(context).forEach((container) => {
      if (container.parentElement) {
        renderer.removeChild(container.parentElement, container);
      }
    });
  }

  private findStandaloneErrorContainers(context: ValidationDisplayContext): HTMLElement[] {
    const root = this.getStandaloneDisplayRoot(context);
    if (!root) {
      return [];
    }

    return findAllElementsByAttribute(root, STANDALONE_ERROR_ATTR, context.propertyPath);
  }

  private applyInvalidState(parent: HTMLElement, controlType: ControlType, renderer: Renderer2): void {
    this.getInvalidClasses(controlType).forEach((cls) => renderer.addClass(parent, cls));
    renderer.setAttribute(parent, 'aria-invalid', 'true');

    if (controlType === 'radio') {
      const wrapper = parent.closest('.mat-radio-block, [data-policy-validation-field]') as HTMLElement | null;
      if (wrapper) {
        renderer.addClass(wrapper, 'policy-validation-mat-radio-invalid');
      }
    }

    if (controlType === 'checkbox') {
      const wrapper = parent.closest('.mat-checkbox-field, [data-policy-validation-field]') as HTMLElement | null;
      if (wrapper) {
        renderer.addClass(wrapper, 'policy-validation-mat-checkbox-invalid');
      }
    }
  }

  private clearInvalidState(parent: HTMLElement, controlType: ControlType, renderer: Renderer2): void {
    this.getInvalidClasses(controlType).forEach((cls) => renderer.removeClass(parent, cls));
    renderer.removeAttribute(parent, 'aria-invalid');

    if (controlType === 'radio') {
      const wrapper = parent.closest('.mat-radio-block, [data-policy-validation-field]') as HTMLElement | null;
      if (wrapper) {
        renderer.removeClass(wrapper, 'policy-validation-mat-radio-invalid');
      }
    }

    if (controlType === 'checkbox') {
      const wrapper = parent.closest('.mat-checkbox-field, [data-policy-validation-field]') as HTMLElement | null;
      if (wrapper) {
        renderer.removeClass(wrapper, 'policy-validation-mat-checkbox-invalid');
      }
    }
  }

  private getInvalidClasses(controlType: ControlType): string[] {
    switch (controlType) {
      case 'checkbox':
        return ['mat-checkbox-invalid', 'mat-mdc-checkbox-invalid'];
      case 'radio':
        return ['mat-radio-invalid', 'mat-mdc-radio-invalid'];
      default:
        return ['mat-form-field-invalid', 'mat-mdc-form-field-invalid'];
    }
  }

  private getLabelElements(context: ValidationDisplayContext, parent: HTMLElement): HTMLElement[] {
    if (context.controlType === 'input' || context.controlType === 'select' || context.controlType === 'textarea') {
      const matLabel = parent.querySelector('mat-label');
      if (matLabel) {
        return [matLabel as HTMLElement];
      }
      const mdcLabel = parent.querySelector('.mat-mdc-floating-label, .mdc-floating-label, .mat-form-field-label');
      return mdcLabel ? [mdcLabel as HTMLElement] : [];
    }

    if (context.controlType === 'checkbox') {
      const label = parent.querySelector('.mdc-label, .mat-mdc-checkbox-label, .mat-checkbox-label');
      return label ? [label as HTMLElement] : [];
    }

    if (context.controlType === 'radio') {
      const root = parent.closest('.mat-radio-block, [data-policy-validation-field]') ?? parent.parentElement;
      const groupLabel = root?.querySelector('.mat-group-label, legend, mat-label');
      if (groupLabel) {
        return [groupLabel as HTMLElement];
      }
    }

    return [];
  }

  private createErrorElement(controlType: ControlType, renderer: Renderer2): HTMLElement {
    if (controlType === 'checkbox' || controlType === 'radio') {
      const errorElement = renderer.createElement('div');
      renderer.addClass(errorElement, 'policy-validation-mat-field-error');
      if (this.standaloneErrorClass !== 'policy-validation-mat-field-error') {
        addClasses(renderer, errorElement, this.standaloneErrorClass);
      }
      renderer.setAttribute(errorElement, POLICY_VALIDATION_DOM.error, 'true');
      renderer.setAttribute(errorElement, 'role', 'alert');
      return errorElement;
    }

    const errorElement = renderer.createElement('mat-error');
    renderer.addClass(errorElement, 'mat-mdc-form-field-error');
    renderer.addClass(errorElement, 'mat-error');
    renderer.setAttribute(errorElement, 'role', 'alert');
    return errorElement;
  }
}
