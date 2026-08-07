import { ValidationEngine } from '../validation/engine';
import { SIMPLE_INITIAL_MODEL, cloneModel, simpleStatePolicy, type SimpleStateModel } from '../models';
import { platformUrl } from '../platform-urls';
import { bindField, type BoundField, type FieldBindingContext } from '../ui/field';
import { el, pageShell } from '../ui/render';
import { renderSummary } from '../ui/summary';
import type { PageContext } from './home';

const POLICY_NAME = 'managed-simple';
const POLICY_NAMES = [POLICY_NAME];

export function mount(container: HTMLElement, _ctx: PageContext): () => void {
  const engine = new ValidationEngine();
  const unregister = engine.registerPolicy(POLICY_NAME, simpleStatePolicy);
  let model = cloneModel(SIMPLE_INITIAL_MODEL);
  let fields: BoundField[] = [];
  let statusText = 'Complete the form, then submit it.';
  let unsubscribe = (): void => undefined;

  const summaryHost = el('div', { tabIndex: '-1' });
  const status = el('p', { className: 'form-status', role: 'status', textContent: statusText });
  const fieldGrid = el('div', { className: 'field-grid' });

  const getModel = (): SimpleStateModel => model;
  const ctx: FieldBindingContext = { engine, getModel, policyNames: POLICY_NAMES };

  const refresh = (): void => {
    renderSummary(summaryHost, engine.getErrors(model));
    for (const field of fields) field.refresh();
    status.textContent = statusText;
  };

  const rebuildFields = (): void => {
    fieldGrid.replaceChildren();
    fields = [
      bindField(ctx, { path: 'firstName', label: 'First name' }),
      bindField(ctx, { path: 'lastName', label: 'Last name' }),
      bindField(ctx, { path: 'email', label: 'Email', type: 'email', validateOnChange: true }),
      bindField(ctx, { path: 'phone', label: 'Phone', type: 'tel' })
    ];
    for (const field of fields) fieldGrid.append(field.root);
  };

  const form = el('form', { noValidate: true }, [
    fieldGrid,
    el('div', { className: 'form-actions' }, [
      el('button', { className: 'primary', type: 'submit' }, ['Submit contact']),
      el('button', {
        type: 'button',
        onClick: () => {
          engine.clear(model);
          model = cloneModel(SIMPLE_INITIAL_MODEL);
          unsubscribe();
          unsubscribe = engine.subscribe(model, refresh);
          statusText = 'The form was reset.';
          rebuildFields();
          refresh();
        }
      }, ['Reset'])
    ]),
    status
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void engine.validate(model, POLICY_NAMES, { showAllErrors: true }).then((snapshot) => {
      if (snapshot.isValid) {
        statusText = 'Valid submission accepted.';
      } else {
        statusText = 'Submission blocked. Correct the highlighted fields.';
        summaryHost.focus();
      }
      refresh();
    });
  });

  rebuildFields();
  unsubscribe = engine.subscribe(model, refresh);
  refresh();

  const page = pageShell(
    'Simple contact form',
    'The same field, form, submit, reset, message, and summary lifecycle backed by core policies and imperative DOM bindings.',
    el('div', { className: 'showcase-grid' }, [
      el('section', { className: 'form-card' }, [summaryHost, form]),
      el('aside', { className: 'notes-card' }, [
        el('p', { className: 'vr-eyebrow', textContent: 'Consistent contract' }),
        el('h2', { textContent: 'Framework ownership changes. Validation does not.' }),
        el('ul', {}, [
          el('li', { textContent: 'Focused field messages' }),
          el('li', { textContent: 'Validate-on-change email' }),
          el('li', { textContent: 'Accessible summary' }),
          el('li', { textContent: 'Mutable-model reset and submit' })
        ]),
        el('a', { href: platformUrl('docs', '/docs/core-package') }, ['Read the core package guide →'])
      ])
    ])
  );

  container.append(page);
  return () => {
    unsubscribe();
    unregister();
    page.remove();
  };
}
