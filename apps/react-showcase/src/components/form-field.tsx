import { ValidationMessage, useValidationField, type UseValidationFormResult, type ValidationTarget } from '@validation-rules/react';

interface FormFieldProps<TModel extends ValidationTarget> {
  form: UseValidationFormResult<TModel>;
  path: string;
  label: string;
  type?: string;
  autoComplete?: string;
  validateOnChange?: boolean;
  parse?: (value: unknown) => unknown;
}

export function FormField<TModel extends ValidationTarget>({
  form,
  path,
  label,
  type = 'text',
  autoComplete,
  validateOnChange,
  parse
}: FormFieldProps<TModel>) {
  const field = useValidationField(form, path, { validateOnChange, parse });
  return (
    <div className={`form-field${field.invalid ? ' invalid' : ''}`}>
      <label htmlFor={field.id}>{label}</label>
      <input type={type} autoComplete={autoComplete} {...field.inputProps} />
      <ValidationMessage className="validation-message" id={field.messageId} errors={field.visibleErrors} />
    </div>
  );
}
