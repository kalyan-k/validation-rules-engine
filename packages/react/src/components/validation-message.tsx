import type { HTMLAttributes } from 'react';
import type { ValidationResult } from '@validation-rules-engine/core';

export interface ValidationMessageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  errors: readonly ValidationResult[];
  id?: string;
  live?: 'off' | 'polite' | 'assertive';
}

export function ValidationMessage({ errors, id, live = 'polite', ...props }: ValidationMessageProps) {
  if (errors.length === 0) return null;
  return (
    <div {...props} id={id} aria-live={live}>
      {errors.map(({ propertyName, error }, index) => (
        <p key={`${propertyName}-${error.message}-${index}`}>{error.message}</p>
      ))}
    </div>
  );
}
