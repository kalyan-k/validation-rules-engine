import type { ValidationResult } from '@validation-rules-engine/core';
import { fieldId } from '../validation/paths';
import { clear, el } from './render';

function focusField(propertyName: string): void {
  const target = document.getElementById(fieldId(propertyName));
  target?.focus();
  target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
}

export function renderSummary(
  host: HTMLElement,
  errors: readonly ValidationResult[],
  options: { heading?: string; className?: string; linkErrors?: boolean } = {}
): void {
  clear(host);
  if (errors.length === 0) return;

  const heading = options.heading ?? 'Please correct the following errors';
  const className = options.className ?? 'validation-summary';
  const linkErrors = options.linkErrors ?? true;

  const section = el('section', {
    className,
    role: 'alert',
    'aria-labelledby': 'validation-summary-heading'
  }, [
    el('h2', { id: 'validation-summary-heading', textContent: heading }),
    el('ul', {}, errors.map(({ propertyName, error }, index) =>
      el('li', { key: `${propertyName}-${index}` }, [
        linkErrors
          ? el('button', {
            type: 'button',
            className: 'summary-error-link',
            onClick: (event: Event) => {
              event.preventDefault();
              focusField(propertyName);
            }
          }, [error.message])
          : error.message
      ])
    ))
  ]);
  host.append(section);
}
