import { useMemo, useState, type ReactNode } from 'react';
import {
  ValidationMessage,
  ValidationSummary,
  useValidationField,
  type FormGroupStatus
} from '@validation-rules/react';
import { FormField } from '../../components/form-field';
import { createAddressPolicy, createContactPolicy, personalPolicy } from '../../policies/complex-policies';
import {
  COMPLEX_INITIAL_MODEL,
  COMPLEX_SAMPLE_MODEL,
  type ComplexStateModel
} from '../models';
import { cloneModel, type StrategyDefinition } from '../types';
import { useManagedValidationForm } from '../use-managed-validation-form';
import { StatePageFrame } from './page-frame';

export function StateComplexPage({ strategy, navigate }: { strategy: StrategyDefinition; navigate(path: string): void }) {
  const [status, setStatus] = useState('Use section validation or save the complete profile.');
  const [shape, setShape] = useState({ addresses: 1, contacts: 1 });
  const policies = useMemo(() => [
    { name: 'managed-personal', policy: personalPolicy },
    { name: 'managed-addresses', policy: createAddressPolicy(shape.addresses) },
    { name: 'managed-contacts', policy: createContactPolicy(shape.contacts) }
  ], [shape]);
  const groups = useMemo(() => [
    {
      name: 'managedPersonalGroup',
      policies: ['managed-personal'],
      formGroups: ['personal'],
      fields: ['personal.firstName', 'personal.lastName', 'personal.preferredContact', 'personal.secondaryEmail']
    },
    {
      name: 'managedAddressGroup',
      policies: ['managed-addresses'],
      formGroups: ['addresses'],
      fields: Array.from({ length: shape.addresses }, (_, index) =>
        ['street', 'city', 'postalCode', 'country'].map((field) => `addresses.${index}.${field}`)
      ).flat()
    },
    {
      name: 'managedContactGroup',
      policies: ['managed-contacts'],
      formGroups: ['contacts'],
      fields: Array.from({ length: shape.contacts }, (_, index) => [`contacts.${index}.type`, `contacts.${index}.value`]).flat()
    }
  ], [shape]);
  const form = useManagedValidationForm<ComplexStateModel>({
    initialModel: COMPLEX_INITIAL_MODEL,
    policies,
    policyNames: ['managed-personal', 'managed-addresses', 'managed-contacts'],
    groups
  });
  const preferredContact = useValidationField(form, 'personal.preferredContact');
  const secondary = useValidationField(form, 'personal.hasSecondary');

  const addAddress = () => {
    const addresses = [...form.model.addresses, { street: '', city: '', postalCode: '', country: '' }];
    form.setModel({ ...form.model, addresses });
    setShape((current) => ({ ...current, addresses: addresses.length }));
  };
  const removeAddress = (index: number) => {
    const addresses = form.model.addresses.filter((_, candidate) => candidate !== index);
    form.setModel({ ...form.model, addresses });
    setShape((current) => ({ ...current, addresses: addresses.length }));
  };
  const addContact = () => {
    const contacts = [...form.model.contacts, { type: 'email', value: '' }];
    form.setModel({ ...form.model, contacts });
    setShape((current) => ({ ...current, contacts: contacts.length }));
  };
  const removeContact = (index: number) => {
    const contacts = form.model.contacts.filter((_, candidate) => candidate !== index);
    form.setModel({ ...form.model, contacts });
    setShape((current) => ({ ...current, contacts: contacts.length }));
  };
  const populate = () => {
    form.setModel(cloneModel(COMPLEX_SAMPLE_MODEL));
    setShape({ addresses: 2, contacts: 2 });
    setStatus('Sample enterprise profile loaded.');
  };
  const reset = () => {
    form.reset(cloneModel(COMPLEX_INITIAL_MODEL));
    setShape({ addresses: 1, contacts: 1 });
    setStatus('Profile reset.');
  };

  return (
    <StatePageFrame
      strategy={strategy}
      page="complex"
      pageLabel="Complex Form"
      title="Complex enterprise profile"
      description="Nested objects, dynamic collections, conditional fields, multiple policies, and independently validated groups."
      navigate={navigate}
      actions={<div className="vr-action-bar">
        <button type="button" onClick={populate}>Populate sample data</button>
        <button type="button" onClick={reset}>Reset</button>
        <button type="button" onClick={() => void form.validate({ showAllErrors: true })}>Validate all programmatically</button>
      </div>}
    >
      <ValidationSummary className="validation-summary" errors={form.errors} />
      <form noValidate onSubmit={form.handleSubmit(
        async () => setStatus('Profile saved successfully.'),
        async () => setStatus('Save blocked. Review the validation summary.')
      )}>
        <ManagedFormSection
          title="Personal information"
          status={form.model['managedPersonalGroup'] as FormGroupStatus | undefined}
          onValidate={() => void form.validateGroup('managedPersonalGroup')}
        >
          <div className="field-grid">
            <FormField form={form} path="personal.firstName" label="First name" />
            <FormField form={form} path="personal.lastName" label="Last name" />
            <div className={`form-field${preferredContact.invalid ? ' invalid' : ''}`}>
              <label htmlFor={preferredContact.id}>Preferred contact</label>
              <select {...preferredContact.inputProps}><option value="">Choose one</option><option value="email">Email</option><option value="phone">Phone</option></select>
              <ValidationMessage className="validation-message" id={preferredContact.messageId} errors={preferredContact.visibleErrors} />
            </div>
          </div>
          <div className="checkbox-field"><input type="checkbox" {...secondary.checkboxProps} /><label htmlFor={secondary.id}>Add a secondary email</label></div>
          {form.model.personal.hasSecondary ? <FormField form={form} path="personal.secondaryEmail" label="Secondary email" type="email" validateOnChange /> : null}
        </ManagedFormSection>

        <ManagedFormSection
          title="Addresses"
          status={form.model['managedAddressGroup'] as FormGroupStatus | undefined}
          onValidate={() => void form.validateGroup('managedAddressGroup')}
        >
          {form.model.addresses.map((_, index) => (
            <fieldset className="repeatable-card" key={`address-${index}`}>
              <legend>Address {index + 1}</legend>
              <div className="field-grid">
                <FormField form={form} path={`addresses.${index}.street`} label="Street" />
                <FormField form={form} path={`addresses.${index}.city`} label="City" />
                <FormField form={form} path={`addresses.${index}.postalCode`} label="Postal code" />
                <FormField form={form} path={`addresses.${index}.country`} label="Country" />
              </div>
              {form.model.addresses.length > 1 ? <button type="button" onClick={() => removeAddress(index)}>Remove address</button> : null}
            </fieldset>
          ))}
          <button type="button" onClick={addAddress}>Add address</button>
        </ManagedFormSection>

        <ManagedFormSection
          title="Contact methods"
          status={form.model['managedContactGroup'] as FormGroupStatus | undefined}
          onValidate={() => void form.validateGroup('managedContactGroup')}
        >
          {form.model.contacts.map((_, index) => (
            <fieldset className="repeatable-card" key={`contact-${index}`}>
              <legend>Contact {index + 1}</legend>
              <div className="field-grid">
                <FormField form={form} path={`contacts.${index}.type`} label="Type (email or phone)" />
                <FormField form={form} path={`contacts.${index}.value`} label="Value" />
              </div>
              {form.model.contacts.length > 1 ? <button type="button" onClick={() => removeContact(index)}>Remove contact</button> : null}
            </fieldset>
          ))}
          <button type="button" onClick={addContact}>Add contact method</button>
        </ManagedFormSection>

        <div className="form-actions"><button className="primary" type="submit">Save profile</button><button type="button" onClick={reset}>Reset profile</button></div>
        <p className="form-status" role="status">{status}</p>
      </form>
    </StatePageFrame>
  );
}

function ManagedFormSection({
  title,
  status,
  onValidate,
  children
}: {
  title: string;
  status?: FormGroupStatus;
  onValidate(): void;
  children: ReactNode;
}) {
  const label = !status?.isEvaluated ? 'Not evaluated' : status.isValid ? 'Valid' : 'Needs attention';
  return (
    <section className="form-section">
      <header>
        <div><h2>{title}</h2><span className={`group-status ${status?.isValid ? 'valid' : status?.isInValid ? 'invalid' : ''}`}>{label}</span></div>
        <button type="button" onClick={onValidate}>Validate section</button>
      </header>
      {children}
    </section>
  );
}
