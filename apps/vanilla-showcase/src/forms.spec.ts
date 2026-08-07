import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import { ValidationEngine } from './validation/engine';
import { simpleStatePolicy } from './models';

function renderApp(): { root: HTMLElement; cleanup: () => void } {
  const root = document.createElement('div');
  document.body.append(root);
  const cleanup = createApp(root);
  return {
    root,
    cleanup: () => {
      cleanup();
      root.remove();
    }
  };
}

function clickLink(name: string): void {
  const link = [...document.querySelectorAll('a')].find((node) => node.textContent?.trim() === name);
  expect(link).toBeTruthy();
  link!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function clickButton(name: string, container: ParentNode = document): void {
  const button = [...container.querySelectorAll('button')].find((node) => node.textContent?.trim() === name);
  expect(button, `button "${name}"`).toBeTruthy();
  button!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function getByLabel(label: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const labelNode = [...document.querySelectorAll('label')].find((node) => {
    const text = node.textContent?.replace(/\*/g, '').trim();
    return text === label;
  });
  expect(labelNode, `label "${label}"`).toBeTruthy();
  const id = labelNode!.getAttribute('for');
  const control = id
    ? document.getElementById(id)
    : labelNode!.querySelector('input, select, textarea');
  expect(control, `control for "${label}"`).toBeTruthy();
  return control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
}

function setInputValue(label: string, value: string): void {
  const control = getByLabel(label);
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    control.value = value;
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function statusText(): string {
  return document.querySelector('.form-status[role="status"]')?.textContent?.trim() ?? '';
}

describe('Vanilla showcase forms', () => {
  it('blocks an invalid simple submission and accepts a valid one, then resets', async () => {
    const { cleanup } = renderApp();
    clickLink('Simple Form');

    const form = document.querySelector('form');
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(statusText()).toBe('Submission blocked. Correct the highlighted fields.');
    });
    expect(document.querySelector('[role="alert"]')).toBeTruthy();
    expect(getByLabel('First name').getAttribute('aria-invalid')).toBe('true');

    setInputValue('First name', 'Avery');
    setInputValue('Last name', 'Patel');
    setInputValue('Email', 'avery@example.com');
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(statusText()).toBe('Valid submission accepted.');
    });

    clickButton('Reset');
    expect((getByLabel('First name') as HTMLInputElement).value).toBe('');
    expect(statusText()).toBe('The form was reset.');
    cleanup();
  });

  it('validates a complex section and saves after populate', async () => {
    const { cleanup } = renderApp();
    clickLink('Complex Form');

    const personalSection = [...document.querySelectorAll('.form-section')].find((section) =>
      section.querySelector('h2')?.textContent === 'Personal information'
    );
    expect(personalSection).toBeTruthy();
    clickButton('Validate section', personalSection!);
    await vi.waitFor(() => {
      expect(personalSection!.querySelector('.group-status')?.textContent).toBe('Needs attention');
    });

    clickButton('Populate sample data');
    expect(statusText()).toBe('Sample enterprise profile loaded.');

    const form = document.querySelector('form');
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(statusText()).toBe('Profile saved successfully.');
    });
    cleanup();
  });

  it('generates a performance form and validates all controls', async () => {
    const { cleanup } = renderApp();
    clickLink('Performance Form');

    setInputValue('Number of Sections', '2');
    setInputValue('Controls per Section', '3');
    clickButton('Generate form');
    await vi.waitFor(() => {
      expect(statusText()).toBe('Generated 6 controls across 2 sections.');
    });

    clickButton('Validate all');
    await vi.waitFor(() => {
      expect(statusText()).toMatch(/\d+ errors? found\./);
    });
    const metricValues = [...document.querySelectorAll('.metric-grid strong')].map((node) => node.textContent?.trim());
    expect(metricValues[0]).toMatch(/ms$/);
    expect(Number(metricValues[1])).toBeGreaterThan(0);
    expect(document.querySelector('[role="alert"]')).toBeTruthy();
    cleanup();
  });

  it('registers a policy, validates a field, and clears engine state', async () => {
    const engine = new ValidationEngine();
    const unregister = engine.registerPolicy('simple', simpleStatePolicy);
    expect(engine.hasPolicy('simple')).toBe(true);

    const model = { firstName: '', lastName: '', email: '', phone: '' };
    await engine.validateField(model, 'firstName', ['simple']);
    expect(engine.getErrors(model, 'firstName').length).toBeGreaterThan(0);

    engine.clear(model);
    expect(engine.getErrors(model)).toHaveLength(0);
    unregister();
    expect(engine.hasPolicy('simple')).toBe(false);
  });

  it('manages complex dynamic sections and conditional secondary email', async () => {
    const { cleanup } = renderApp();
    clickLink('Complex Form');

    clickButton('Add address');
    expect([...document.querySelectorAll('legend')].some((node) => node.textContent === 'Address 2')).toBe(true);

    const secondary = getByLabel('Add a secondary email') as HTMLInputElement;
    secondary.checked = true;
    secondary.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Secondary email');
    });

    clickButton('Add contact method');
    expect([...document.querySelectorAll('legend')].some((node) => node.textContent === 'Contact 2')).toBe(true);

    const typeSelect = getByLabel('Type');
    expect(typeSelect.tagName).toBe('SELECT');
    setInputValue('Type', 'email');
    setInputValue('Value', 'not-an-email');
    getByLabel('Value').dispatchEvent(new Event('blur', { bubbles: true }));
    await vi.waitFor(() => {
      expect(getByLabel('Value').getAttribute('aria-invalid')).toBe('true');
    });

    clickButton('Remove address');
    clickButton('Remove contact');

    clickButton('Validate all programmatically');
    await vi.waitFor(() => {
      expect(document.querySelector('[role="alert"]')).toBeTruthy();
    });

    const summaryLink = document.querySelector('.summary-error-link') as HTMLButtonElement | null;
    expect(summaryLink).toBeTruthy();
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => undefined);
    summaryLink!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();

    clickButton('Reset');
    expect(statusText()).toBe('Profile reset.');
    cleanup();
  });

  it('validates on blur by default and shows required markers', async () => {
    const { cleanup } = renderApp();
    clickLink('Simple Form');

    const firstName = getByLabel('First name');
    expect(document.querySelector('.required-marker')).toBeTruthy();
    firstName.dispatchEvent(new Event('blur', { bubbles: true }));
    await vi.waitFor(() => {
      expect(firstName.getAttribute('aria-invalid')).toBe('true');
    });
    cleanup();
  });

  it('shows performance group badges after validate all', async () => {
    const { cleanup } = renderApp();
    clickLink('Performance Form');

    setInputValue('Number of Sections', '1');
    setInputValue('Controls per Section', '2');
    clickButton('Generate form');
    await vi.waitFor(() => {
      expect(statusText()).toBe('Generated 2 controls across 1 sections.');
    });

    expect([...document.querySelectorAll('.performance-section .group-status')].every(
      (node) => node.textContent === 'Not evaluated'
    )).toBe(true);

    clickButton('Validate all');
    await vi.waitFor(() => {
      expect(statusText()).toMatch(/\d+ errors? found\./);
    });
    expect([...document.querySelectorAll('.performance-section .group-status')].some(
      (node) => node.textContent === 'Needs attention'
    )).toBe(true);
    cleanup();
  });

  it('populates and resets the performance form', async () => {
    const { cleanup } = renderApp();
    clickLink('Performance Form');

    clickButton('Populate valid data');
    await vi.waitFor(() => {
      expect(statusText()).toBe('Valid sample data populated.');
    });

    clickButton('Populate invalid data');
    expect(statusText()).toBe('Invalid sample data populated.');

    const form = document.querySelector('form');
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(document.querySelector('[role="alert"]') || statusText().includes('error')).toBeTruthy();
    });

    clickButton('Validate group');
    clickButton('Reset');
    expect(statusText()).toBe('Performance form reset.');
    cleanup();
  });
});
