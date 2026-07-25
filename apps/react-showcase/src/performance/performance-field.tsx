import {
  ValidationMessage,
  useValidationField,
  type UseValidationFormResult
} from '@validation-rules/react';
import type { PerformanceFieldDefinition, PerformanceStateModel } from './performance-generator';

interface PerformanceFieldProps {
  form: UseValidationFormResult<PerformanceStateModel>;
  field: PerformanceFieldDefinition;
}

export function PerformanceField({ form, field }: PerformanceFieldProps) {
  const validation = useValidationField(form, field.path, {
    id: `validation-field-${field.elementId}`,
    parse: field.type === 'number' ? parseNumberInput : undefined
  });
  const invalidClass = validation.invalid ? ' invalid' : '';

  if (field.type === 'checkbox') {
    return (
      <div className={`checkbox-field${invalidClass}`}>
        <input type="checkbox" {...validation.checkboxProps} />
        <label htmlFor={validation.id}>{field.label}</label>
        <ValidationMessage className="validation-message" id={validation.messageId} errors={validation.visibleErrors} />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className={`form-field${invalidClass}`}>
        <label htmlFor={validation.id}>{field.label}</label>
        <select {...validation.inputProps}>
          <option value="">Choose one</option>
          {field.selectOptions?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ValidationMessage className="validation-message" id={validation.messageId} errors={validation.visibleErrors} />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className={`form-field${invalidClass}`}>
        <label htmlFor={validation.id}>{field.label}</label>
        <textarea rows={3} {...validation.inputProps} />
        <ValidationMessage className="validation-message" id={validation.messageId} errors={validation.visibleErrors} />
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <fieldset className={`radio-field${invalidClass}`}>
        <legend>{field.label}</legend>
        <div className="radio-field__options">
          {field.radioOptions?.map((option) => {
            const id = `${validation.id}-${option.value}`;
            return (
              <label key={option.value} htmlFor={id}>
                <input
                  id={id}
                  name={validation.name}
                  type="radio"
                  value={option.value}
                  checked={validation.value === option.value}
                  aria-invalid={validation.invalid}
                  aria-describedby={validation.invalid ? validation.messageId : undefined}
                  onChange={() => void form.setFieldValue(field.path, option.value)}
                  onBlur={() => form.touchField(field.path)}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        <ValidationMessage className="validation-message" id={validation.messageId} errors={validation.visibleErrors} />
      </fieldset>
    );
  }

  return (
    <div className={`form-field${invalidClass}`}>
      <label htmlFor={validation.id}>{field.label}</label>
      <input type={field.type} {...validation.inputProps} />
      <ValidationMessage className="validation-message" id={validation.messageId} errors={validation.visibleErrors} />
    </div>
  );
}

function parseNumberInput(value: unknown): number | '' {
  return value === '' ? '' : Number(value);
}
