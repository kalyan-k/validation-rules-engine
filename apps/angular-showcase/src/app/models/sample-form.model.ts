export interface ISampleForm {
  textInput: string;
  emailInput: string;
  passwordInput: string;
  numberInput: string;
  dateInput: string;
  checkboxInput: boolean;
  radioGroup: string;
  selectInput: string;
  textareaInput: string;
}

export class SampleForm implements ISampleForm {
  textInput = '';
  emailInput = '';
  passwordInput = '';
  numberInput = '';
  dateInput = '';
  checkboxInput = false;
  radioGroup = '';
  selectInput = '';
  textareaInput = '';
  mainForm?: { isValid: boolean; isInValid: boolean };
  validationResults?: Array<{ propertyName: string; error: { message: string } }>;
}
