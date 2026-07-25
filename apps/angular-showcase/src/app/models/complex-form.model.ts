export interface IPersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface IAddressInfo {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface IBillingInfo {
  sameAsShipping: boolean;
  line1: string;
  city: string;
  zip: string;
}

export class PersonalInfo implements IPersonalInfo {
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
}

export class AddressInfo implements IAddressInfo {
  line1 = '';
  line2 = '';
  city = '';
  state = '';
  zip = '';
  country = '';
}

export class BillingInfo implements IBillingInfo {
  sameAsShipping = true;
  line1 = '';
  city = '';
  zip = '';
}

export class ComplexFormModel {
  personal: PersonalInfo;
  shipping: AddressInfo;
  billing: BillingInfo;
  personalInfo?: { isValid: boolean; isInValid: boolean; isEvaluated?: boolean };
  shippingInfo?: { isValid: boolean; isInValid: boolean; isEvaluated?: boolean };
  billingInfo?: { isValid: boolean; isInValid: boolean; isEvaluated?: boolean };
  checkout?: { isValid: boolean; isInValid: boolean; isEvaluated?: boolean };
  validationResults?: Array<{ propertyName: string; error: { message: string } }>;

  constructor() {
    this.personal = new PersonalInfo();
    this.shipping = new AddressInfo();
    this.billing = new BillingInfo();
  }
}
