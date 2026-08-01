import { StrictMode, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ValidationPolicy, ValidatorHelper } from '@validation-rules-engine/core';
import { ValidationMessage } from '../components/validation-message';
import { ValidationSummary } from '../components/validation-summary';
import { ValidationRulesProvider, useValidationRulesContext } from '../context/validation-rules-context';
import { ValidationEngine } from '../engine/validation-engine';
import { renderWithValidation } from '../testing/render-with-validation';
import type { ValidationTarget } from '../types';
import { useValidationField } from './use-validation-field';
import { useValidationForm } from './use-validation-form';
import { useValidationRules } from './use-validation-rules';

const policy: ValidationPolicy = {
  addValidations(helper: ValidatorHelper) {
    return [
      helper.validateFor('email').isRequired('Email required').isEmail('Email invalid'),
      helper.validateFor('age').isRequired('Age required').isNumber('Age invalid'),
      helper.validateFor('terms').isChecked('Terms required')
    ];
  }
};
const policies = [{ name: 'account', policy }];
const policyNames = ['account'];
type Model = ValidationTarget & { email: string; age: number | string; terms: boolean };

function AccountForm({ onValid = vi.fn(), onInvalid = vi.fn() }: {
  onValid?: (model: Model) => void;
  onInvalid?: (model: Model) => void;
}) {
  const form = useValidationForm<Model>({
    initialModel: { email: '', age: '', terms: false },
    policies,
    policyNames
  });
  const email = useValidationField(form, 'email', { validateOnChange: true });
  const age = useValidationField(form, 'age', { parse: Number });
  const terms = useValidationField(form, 'terms');
  return (
    <form onSubmit={form.handleSubmit(async (model) => onValid(model), async (model) => onInvalid(model))} noValidate>
      <ValidationSummary data-testid="summary" errors={form.errors} />
      <label htmlFor={email.id}>Email</label>
      <input type="email" {...email.inputProps} />
      <ValidationMessage data-testid="email-errors" id={email.messageId} errors={email.visibleErrors} />
      <label htmlFor={age.id}>Age</label>
      <input type="number" {...age.inputProps} />
      <ValidationMessage id={age.messageId} errors={age.visibleErrors} />
      <input type="checkbox" {...terms.checkboxProps} />
      <label htmlFor={terms.id}>Terms</label>
      <ValidationMessage id={terms.messageId} errors={terms.visibleErrors} />
      <output data-testid="dirty">{[...form.dirtyFields].join(',')}</output>
      <button type="button" onClick={() => form.reset()}>Reset</button>
      <button type="submit">Save</button>
    </form>
  );
}

describe('React validation hooks and components', () => {
  it('throws a clear missing-provider error', () => {
    function Probe() { useValidationRulesContext(); return null; }
    expect(() => render(<Probe />)).toThrow('must be used within a ValidationRulesProvider');
  });

  it('exposes an injected engine and merged provider configuration', () => {
    const engine = new ValidationEngine();
    function Probe() {
      const context = useValidationRulesContext();
      return <output>{String(context.engine === engine)}:{String(context.configuration.validateOnBlur)}:{String(context.configuration.validateOnChange)}</output>;
    }
    render(<ValidationRulesProvider engine={engine} configuration={{ validateOnBlur: false, validateOnChange: true }}><Probe /></ValidationRulesProvider>);
    expect(screen.getByText('true:false:true')).toBeTruthy();
  });

  it('validates change, blur, submit, controlled parsing, checkbox, and reset', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    renderWithValidation(<AccountForm onValid={onValid} onInvalid={onInvalid} />);

    await user.type(screen.getByLabelText('Email'), 'bad');
    expect(await screen.findByText('Email invalid')).toBeTruthy();
    await user.tab();
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByTestId('dirty').textContent).toContain('email');

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.type(screen.getByLabelText('Age'), '42');
    await user.click(screen.getByLabelText('Terms'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onValid).toHaveBeenCalledOnce());
    expect(onValid.mock.calls[0]?.[0]).toMatchObject({ email: 'person@example.com', age: 42, terms: true });
    expect(onInvalid).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Terms') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByTestId('dirty').textContent).toBe('');
  });

  it('calls invalid submit and renders linked and unlinked summaries', async () => {
    const user = userEvent.setup();
    const onInvalid = vi.fn();
    renderWithValidation(<AccountForm onInvalid={onInvalid} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onInvalid).toHaveBeenCalledOnce());
    expect(screen.getByTestId('summary').querySelector('a')?.getAttribute('href')).toBe('#validation-field-email');

    const { rerender } = render(
      <ValidationSummary errors={[{ propertyName: 'x', error: { message: 'Broken' } }]} linkErrors={false} />
    );
    expect(screen.getByText('Broken').closest('a')).toBeNull();
    rerender(<ValidationSummary errors={[]} />);
    expect(screen.queryByText('Broken')).toBeNull();
  });

  it('supports custom controls, explicit field validate, and field clear', async () => {
    function CustomForm() {
      const form = useValidationForm({ initialModel: { email: '' }, policies, policyNames });
      const field = useValidationField(form, 'email', { id: 'custom-email', messageId: 'custom-message', validateOnBlur: false });
      return <div>
        <button type="button" onClick={() => void form.setFieldValue('email', 'bad', true)}>Set custom</button>
        <button type="button" onClick={() => void field.validate()}>Validate field</button>
        <button type="button" onClick={field.clear}>Clear field</button>
        <output>{String(field.invalid)}:{field.id}:{field.messageId}:{String(field.value)}</output>
        <ValidationMessage errors={field.visibleErrors} live="assertive" />
      </div>;
    }
    const user = userEvent.setup();
    renderWithValidation(<CustomForm />);
    await user.click(screen.getByRole('button', { name: 'Set custom' }));
    await user.click(screen.getByRole('button', { name: 'Validate field' }));
    expect(screen.getByText(/false:custom-email:custom-message:bad/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Clear field' }));
    expect(screen.queryByText('Email invalid')).toBeNull();
  });

  it('provides low-level validation, groups, touch, and clear methods', async () => {
    const result: { current?: ReturnType<typeof useValidationRules> } = {};
    const model = { email: '' } as ValidationTarget;
    const groups = [{ name: 'accountGroup', policies: policyNames, formGroups: ['account'], fields: ['email'] }];
    function Probe() {
      result.current = useValidationRules({ model, policies, policyNames, groups });
      return <output>{result.current.errors.length}</output>;
    }
    renderWithValidation(<Probe />);
    await result.current?.validateGroup('accountGroup');
    expect(result.current?.getFieldErrors('email')).toHaveLength(1);
    result.current?.touch('email');
    result.current?.clear(['email']);
    expect(result.current?.getFieldErrors('email')).toEqual([]);
  });

  it('balances policy lifecycle in Strict Mode and across multiple forms', async () => {
    const engine = new ValidationEngine();
    function Harness() {
      useValidationRules({ model: { email: '' }, policies, policyNames });
      return null;
    }
    const view = render(
      <StrictMode><ValidationRulesProvider engine={engine}><Harness /><Harness /></ValidationRulesProvider></StrictMode>
    );
    expect(engine.hasPolicy('account')).toBe(true);
    view.unmount();
    expect(engine.hasPolicy('account')).toBe(false);
  });

  it('supports independent nested providers and models', async () => {
    function ValueForm({ label }: { label: string }) {
      const form = useValidationForm({ initialModel: { email: '' }, policies, policyNames });
      return <button onClick={() => void form.validate()}>{label}:{form.errors.length}</button>;
    }
    const user = userEvent.setup();
    render(<>
      <ValidationRulesProvider><ValueForm label="one" /></ValidationRulesProvider>
      <ValidationRulesProvider><ValueForm label="two" /></ValidationRulesProvider>
    </>);
    await user.click(screen.getByRole('button', { name: 'one:0' }));
    expect(await screen.findByRole('button', { name: 'one:3' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'two:0' })).toBeTruthy();
  });

  it('is safe to import and render through the server renderer', () => {
    function ServerProbe() {
      const { configuration } = useValidationRulesContext();
      return <span>{String(configuration.validateOnBlur)}</span>;
    }
    expect(renderToString(<ValidationRulesProvider><ServerProbe /></ValidationRulesProvider>)).toContain('true');
  });

  it('combines native blur handlers without requiring a browser design system', async () => {
    renderWithValidation(<AccountForm />);
    fireEvent.blur(screen.getByLabelText('Email'));
    await waitFor(() => expect(screen.getByTestId('email-errors').textContent).toContain('Email required'));
    expect(screen.getByTestId('email-errors').getAttribute('aria-live')).toBe('polite');
  });
});
