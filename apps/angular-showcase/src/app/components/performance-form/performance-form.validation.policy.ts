import { ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules/angular';
import { PerformanceFieldDef } from '../../models/performance-form.model';

export class PerformanceConfigValidationPolicy implements ValidationPolicy {
  addValidations(validatorHelper: ValidatorHelper): Validator[] {
    return [
      validatorHelper.validateFor('config.sectionCount')
        .isRequired('Number of sections is required')
        .isNumber('Enter a valid number')
        .range('Sections must be between 1 and 50', 1, 50, 'number'),
      validatorHelper.validateFor('config.controlsPerSection')
        .isRequired('Controls per section is required')
        .isNumber('Enter a valid number')
        .range('Controls per section must be between 1 and 200', 1, 200, 'number')
    ];
  }
}

export class PerformanceSectionValidationPolicy implements ValidationPolicy {
  constructor(private readonly fields: PerformanceFieldDef[]) {}

  addValidations(validatorHelper: ValidatorHelper): Validator[] {
    const validators: Validator[] = [];

    this.fields.forEach((field) => {
      const dependency = field.dependsOn;
      const label = field.label;

      switch (field.type) {
        case 'text':
          validators.push(
            (dependency
              ? validatorHelper.validateFor(field.propertyPath, dependency)
              : validatorHelper.validateFor(field.propertyPath)
            ).isRequired(`${label} is required`)
          );
          break;
        case 'email':
          validators.push(
            validatorHelper.validateFor(field.propertyPath)
              .isRequired(`${label} is required`)
              .isEmail('Enter a valid email address')
          );
          break;
        case 'number':
          validators.push(
            validatorHelper.validateFor(field.propertyPath)
              .isRequired(`${label} is required`)
              .isNumber('Enter a valid number')
          );
          break;
        case 'date':
          validators.push(
            validatorHelper.validateFor(field.propertyPath)
              .isRequired(`${label} is required`)
              .isDate('Enter a valid date')
          );
          break;
        case 'checkbox':
          validators.push(
            validatorHelper.validateFor(field.propertyPath).isChecked(`${label} must be checked`)
          );
          break;
        case 'select':
          validators.push(
            validatorHelper.validateFor(field.propertyPath).isRequired(`Please select a ${label.toLowerCase()}`)
          );
          break;
        case 'textarea':
          validators.push(
            (dependency
              ? validatorHelper.validateFor(field.propertyPath, dependency)
              : validatorHelper.validateFor(field.propertyPath)
            ).isRequired(`${label} is required`)
          );
          break;
        case 'radio':
          validators.push(
            validatorHelper.validateFor(field.propertyPath).isRequired(`Please select a ${label.toLowerCase()}`)
          );
          break;
      }
    });

    return validators;
  }
}
