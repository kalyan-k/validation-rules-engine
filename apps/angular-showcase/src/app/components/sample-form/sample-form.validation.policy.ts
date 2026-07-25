import { ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules/angular';

export class SampleFormValidationPolicy implements ValidationPolicy {
  addValidations(validatorHelper: ValidatorHelper): Validator[] {
    return [
      validatorHelper.validateFor('textInput').isRequired('Text input is required'),
      validatorHelper.validateFor('emailInput').isRequired('Email is required').isEmail('Enter a valid email address'),
      validatorHelper.validateFor('passwordInput')
        .isRequired('Password is required')
        .regEx('Password must be at least 8 characters', '^.{8,}$'),
      validatorHelper.validateFor('numberInput')
        .isRequired('Number is required')
        .isNumber('Enter a valid number')
        .range('Number must be between 1 and 100', 1, 100, 'number'),
      validatorHelper.validateFor('dateInput').isRequired('Date is required').isDate('Enter a valid date'),
      validatorHelper.validateFor('checkboxInput').isChecked('You must accept the terms'),
      validatorHelper.validateFor('radioGroup').isRequired('Please select an option'),
      validatorHelper.validateFor('selectInput').isRequired('Please select a value'),
      validatorHelper.validateFor('textareaInput')
        .isRequired('Comments are required')
        .regEx('Comments must be at least 10 characters', '^.{10,}$')
    ];
  }
}
