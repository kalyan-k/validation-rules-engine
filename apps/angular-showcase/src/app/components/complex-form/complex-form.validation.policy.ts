import { ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules/angular';

export class PersonalInfoValidationPolicy implements ValidationPolicy {
  addValidations(validatorHelper: ValidatorHelper): Validator[] {
    return [
      validatorHelper.validateFor('personal.firstName').isRequired('First name is required'),
      validatorHelper.validateFor('personal.lastName').isRequired('Last name is required'),
      validatorHelper.validateFor('personal.email').isRequired('Email is required').isEmail('Enter a valid email'),
      validatorHelper.validateFor('personal.phone').isRequired('Phone is required').isPhone('Enter a valid US phone number')
    ];
  }
}

export class ShippingAddressValidationPolicy implements ValidationPolicy {
  addValidations(validatorHelper: ValidatorHelper): Validator[] {
    return [
      validatorHelper.validateFor('shipping.line1').isRequired('Street address is required'),
      validatorHelper.validateFor('shipping.city', 'shipping.line1.length > 0').isRequired('City is required'),
      validatorHelper.validateFor('shipping.state', 'shipping.line1.length > 0').isRequired('State is required'),
      validatorHelper.validateFor('shipping.zip', 'shipping.line1.length > 0')
        .isRequired('ZIP code is required')
        .isZipCode('Enter a valid US ZIP code'),
      validatorHelper.validateFor('shipping.country', 'shipping.line1.length > 0').isRequired('Country is required')
    ];
  }
}

export class BillingAddressValidationPolicy implements ValidationPolicy {
  addValidations(validatorHelper: ValidatorHelper): Validator[] {
    return [
      validatorHelper.validateFor('billing.line1', '!billing.sameAsShipping')
        .isRequired('Billing street address is required'),
      validatorHelper.validateFor('billing.city', '!billing.sameAsShipping')
        .isRequired('Billing city is required'),
      validatorHelper.validateFor('billing.zip', '!billing.sameAsShipping')
        .isRequired('Billing ZIP is required')
        .isZipCode('Enter a valid US ZIP code')
    ];
  }
}
