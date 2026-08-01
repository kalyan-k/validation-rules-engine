import type { HTMLAttributes } from 'react';
import type { ValidationResult } from '@validation-rules-engine/core';
import { fieldId } from '../utilities/paths';

export interface ValidationSummaryProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  errors: readonly ValidationResult[];
  heading?: string;
  linkErrors?: boolean;
}

export function ValidationSummary({
  errors,
  heading = 'Please correct the following errors',
  linkErrors = true,
  ...props
}: ValidationSummaryProps) {
  if (errors.length === 0) return null;
  return (
    <section {...props} role="alert" aria-labelledby="validation-summary-heading">
      <h2 id="validation-summary-heading">{heading}</h2>
      <ul>
        {errors.map(({ propertyName, error }, index) => (
          <li key={`${propertyName}-${error.message}-${index}`}>
            {linkErrors ? <a href={`#${fieldId(propertyName)}`}>{error.message}</a> : error.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
