import type { ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/core';

export const personalPolicy: ValidationPolicy = {
  addValidations(helper: ValidatorHelper): Validator[] {
    return [
      helper.validateFor('personal.firstName').isRequired('First name is required.'),
      helper.validateFor('personal.lastName').isRequired('Last name is required.'),
      helper.validateFor('personal.preferredContact').isRequired('Choose a preferred contact method.'),
      helper.validateFor('personal.secondaryEmail', (model: { personal: { hasSecondary: boolean } }) => model.personal.hasSecondary)
        .isRequired('Secondary email is required while the section is enabled.')
        .isEmail('Enter a valid secondary email.')
    ];
  }
};

export function createAddressPolicy(addressCount: number): ValidationPolicy {
  return {
    addValidations(helper: ValidatorHelper): Validator[] {
      return Array.from({ length: addressCount }, (_, index) => [
        helper.validateFor(`addresses.${index}.street`).isRequired(`Address ${index + 1}: street is required.`),
        helper.validateFor(`addresses.${index}.city`).isRequired(`Address ${index + 1}: city is required.`),
        helper.validateFor(`addresses.${index}.postalCode`).isRequired(`Address ${index + 1}: postal code is required.`),
        helper.validateFor(`addresses.${index}.country`).isRequired(`Address ${index + 1}: country is required.`)
      ]).flat();
    }
  };
}

export function createContactPolicy(contactCount: number): ValidationPolicy {
  return {
    addValidations(helper: ValidatorHelper): Validator[] {
      return Array.from({ length: contactCount }, (_, index) => [
        helper.validateFor(`contacts.${index}.type`).isRequired(`Contact ${index + 1}: choose a type.`),
        helper.validateFor(`contacts.${index}.value`, `contacts.${index}.type === 'email'`)
          .isRequired(`Contact ${index + 1}: enter an email.`)
          .isEmail(`Contact ${index + 1}: enter a valid email.`),
        helper.validateFor(`contacts.${index}.value`, `contacts.${index}.type === 'phone'`)
          .isRequired(`Contact ${index + 1}: enter a phone number.`)
          .isPhone(`Contact ${index + 1}: enter a valid phone number.`)
      ]).flat();
    }
  };
}
