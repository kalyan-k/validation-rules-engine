import type { FormGroupStatus } from '@validation-rules-engine/core';
import {
  COMPLEX_INITIAL_MODEL,
  COMPLEX_SAMPLE_MODEL,
  cloneModel,
  type ComplexStateModel
} from '../models';
import { createAddressPolicy, createContactPolicy, personalPolicy } from '../policies/complex-policies';
import { ValidationEngine } from '../validation/engine';
import type { ValidationGroupRegistration } from '../validation/types';
import { bindField, groupStatusLabel, type BoundField, type FieldBindingContext } from '../ui/field';
import { el, pageShell } from '../ui/render';
import { renderSummary } from '../ui/summary';
import type { PageContext } from './home';

const POLICY_NAMES = ['managed-personal', 'managed-addresses', 'managed-contacts'];

export function mount(container: HTMLElement, _ctx: PageContext): () => void {
  const engine = new ValidationEngine();
  let model = cloneModel(COMPLEX_INITIAL_MODEL);
  let shape = { addresses: 1, contacts: 1 };
  let statusText = 'Use section validation or save the complete profile.';
  let fields: BoundField[] = [];
  let unsubscribe = (): void => undefined;
  const cleanups: Array<() => void> = [];

  const summaryHost = el('div');
  const status = el('p', { className: 'form-status', role: 'status' });
  const personalBody = el('div');
  const addressesBody = el('div');
  const contactsBody = el('div');
  const personalStatus = el('span', { className: 'group-status' });
  const addressStatus = el('span', { className: 'group-status' });
  const contactStatus = el('span', { className: 'group-status' });

  const getModel = (): ComplexStateModel => model;
  const ctx: FieldBindingContext = {
    engine,
    getModel,
    policyNames: POLICY_NAMES,
    onStructuralChange: () => remountSections(),
    onFieldValidated: () => refreshStatusBadges()
  };

  const registerPoliciesAndGroups = (): void => {
    while (cleanups.length) cleanups.pop()?.();
    cleanups.push(engine.registerPolicy('managed-personal', personalPolicy));
    cleanups.push(engine.registerPolicy('managed-addresses', createAddressPolicy(shape.addresses)));
    cleanups.push(engine.registerPolicy('managed-contacts', createContactPolicy(shape.contacts)));
    for (const group of buildGroups(shape)) {
      cleanups.push(engine.registerGroup(group));
    }
  };

  const refreshStatusBadges = (): void => {
    updateGroupBadge(personalStatus, model.managedPersonalGroup as FormGroupStatus | undefined);
    updateGroupBadge(addressStatus, model.managedAddressGroup as FormGroupStatus | undefined);
    updateGroupBadge(contactStatus, model.managedContactGroup as FormGroupStatus | undefined);
  };

  const refresh = (): void => {
    renderSummary(summaryHost, engine.getErrors(model));
    for (const field of fields) field.refresh();
    status.textContent = statusText;
    refreshStatusBadges();
  };

  const remountSections = (): void => {
    registerPoliciesAndGroups();
    fields = [];
    personalBody.replaceChildren();
    addressesBody.replaceChildren();
    contactsBody.replaceChildren();

    const personalGrid = el('div', { className: 'field-grid' });
    const firstName = bindField(ctx, { path: 'personal.firstName', label: 'First name' });
    const lastName = bindField(ctx, { path: 'personal.lastName', label: 'Last name' });
    const preferred = bindField(ctx, {
      path: 'personal.preferredContact',
      label: 'Preferred contact',
      control: 'select',
      selectOptions: [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' }
      ]
    });
    fields.push(firstName, lastName, preferred);
    personalGrid.append(firstName.root, lastName.root, preferred.root);
    personalBody.append(personalGrid);

    const secondary = bindField(ctx, {
      path: 'personal.hasSecondary',
      label: 'Add a secondary email',
      control: 'checkbox'
    });
    fields.push(secondary);
    personalBody.append(secondary.root);

    if (model.personal.hasSecondary) {
      const secondaryEmail = bindField(ctx, {
        path: 'personal.secondaryEmail',
        label: 'Secondary email',
        type: 'email',
        validateOnChange: true
      });
      fields.push(secondaryEmail);
      personalBody.append(secondaryEmail.root);
    }

    // Re-bind checkbox to remount when toggled
    const checkbox = secondary.root.querySelector('input');
    checkbox?.addEventListener('change', () => {
      remountSections();
      refresh();
    });

    model.addresses.forEach((_, index) => {
      const fieldset = el('fieldset', { className: 'repeatable-card' }, [
        el('legend', { textContent: `Address ${index + 1}` })
      ]);
      const grid = el('div', { className: 'field-grid' });
      for (const [path, label] of [
        [`addresses.${index}.street`, 'Street'],
        [`addresses.${index}.city`, 'City'],
        [`addresses.${index}.postalCode`, 'Postal code'],
        [`addresses.${index}.country`, 'Country']
      ] as const) {
        const field = bindField(ctx, { path, label });
        fields.push(field);
        grid.append(field.root);
      }
      fieldset.append(grid);
      if (model.addresses.length > 1) {
        fieldset.append(el('button', {
          type: 'button',
          onClick: () => {
            model.addresses = model.addresses.filter((_, candidate) => candidate !== index);
            shape = { ...shape, addresses: model.addresses.length };
            remountSections();
            refresh();
          }
        }, ['Remove address']));
      }
      addressesBody.append(fieldset);
    });
    addressesBody.append(el('button', {
      type: 'button',
      onClick: () => {
        model.addresses = [...model.addresses, { street: '', city: '', postalCode: '', country: '' }];
        shape = { ...shape, addresses: model.addresses.length };
        remountSections();
        refresh();
      }
    }, ['Add address']));

    model.contacts.forEach((_, index) => {
      const fieldset = el('fieldset', { className: 'repeatable-card' }, [
        el('legend', { textContent: `Contact ${index + 1}` })
      ]);
      const grid = el('div', { className: 'field-grid' });
      const typeField = bindField(ctx, {
        path: `contacts.${index}.type`,
        label: 'Type',
        control: 'select',
        selectOptions: [
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Phone' }
        ]
      });
      const valueField = bindField(ctx, { path: `contacts.${index}.value`, label: 'Value' });
      fields.push(typeField, valueField);
      grid.append(typeField.root, valueField.root);
      fieldset.append(grid);
      if (model.contacts.length > 1) {
        fieldset.append(el('button', {
          type: 'button',
          onClick: () => {
            model.contacts = model.contacts.filter((_, candidate) => candidate !== index);
            shape = { ...shape, contacts: model.contacts.length };
            remountSections();
            refresh();
          }
        }, ['Remove contact']));
      }
      contactsBody.append(fieldset);
    });
    contactsBody.append(el('button', {
      type: 'button',
      onClick: () => {
        model.contacts = [...model.contacts, { type: 'email', value: '' }];
        shape = { ...shape, contacts: model.contacts.length };
        remountSections();
        refresh();
      }
    }, ['Add contact method']));
  };

  const resetProfile = (): void => {
    engine.clear(model);
    model = cloneModel(COMPLEX_INITIAL_MODEL);
    shape = { addresses: 1, contacts: 1 };
    unsubscribe();
    unsubscribe = engine.subscribe(model, refresh);
    statusText = 'Profile reset.';
    remountSections();
    refresh();
  };

  const form = el('form', { noValidate: true }, [
    createSection('Personal information', personalStatus, () => {
      void engine.validateGroup(model, 'managedPersonalGroup').then(() => refresh());
    }, personalBody),
    createSection('Addresses', addressStatus, () => {
      void engine.validateGroup(model, 'managedAddressGroup').then(() => refresh());
    }, addressesBody),
    createSection('Contact methods', contactStatus, () => {
      void engine.validateGroup(model, 'managedContactGroup').then(() => refresh());
    }, contactsBody),
    el('div', { className: 'form-actions' }, [
      el('button', { className: 'primary', type: 'submit' }, ['Save profile']),
      el('button', { type: 'button', onClick: resetProfile }, ['Reset profile'])
    ]),
    status
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void engine.validate(model, POLICY_NAMES, { showAllErrors: true }).then((snapshot) => {
      statusText = snapshot.isValid
        ? 'Profile saved successfully.'
        : 'Save blocked. Review the validation summary.';
      refresh();
    });
  });

  remountSections();
  unsubscribe = engine.subscribe(model, refresh);
  refresh();

  const page = pageShell(
    'Complex enterprise profile',
    'Nested objects, dynamic collections, conditional fields, multiple policies, and independently validated groups.',
    el('div', {}, [
      el('div', { className: 'vr-action-bar' }, [
        el('button', {
          type: 'button',
          onClick: () => {
            engine.clear(model);
            model = cloneModel(COMPLEX_SAMPLE_MODEL);
            shape = { addresses: 2, contacts: 2 };
            unsubscribe();
            unsubscribe = engine.subscribe(model, refresh);
            statusText = 'Sample enterprise profile loaded.';
            remountSections();
            refresh();
          }
        }, ['Populate sample data']),
        el('button', { type: 'button', onClick: resetProfile }, ['Reset']),
        el('button', {
          type: 'button',
          onClick: () => {
            void engine.validate(model, POLICY_NAMES, { showAllErrors: true }).then(() => refresh());
          }
        }, ['Validate all programmatically'])
      ]),
      summaryHost,
      form
    ])
  );

  container.append(page);
  return () => {
    unsubscribe();
    while (cleanups.length) cleanups.pop()?.();
    page.remove();
  };
}

function buildGroups(shape: { addresses: number; contacts: number }): ValidationGroupRegistration[] {
  return [
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
  ];
}

function createSection(
  title: string,
  statusEl: HTMLElement,
  onValidate: () => void,
  body: HTMLElement
): HTMLElement {
  statusEl.textContent = 'Not evaluated';
  return el('section', { className: 'form-section' }, [
    el('header', {}, [
      el('div', {}, [
        el('h2', { textContent: title }),
        statusEl
      ]),
      el('button', { type: 'button', onClick: onValidate }, ['Validate section'])
    ]),
    body
  ]);
}

function updateGroupBadge(node: HTMLElement, status: FormGroupStatus | undefined): void {
  node.textContent = groupStatusLabel(status);
  node.className = `group-status${status?.isValid ? ' valid' : status?.isInValid ? ' invalid' : ''}`;
}
