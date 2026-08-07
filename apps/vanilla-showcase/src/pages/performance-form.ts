import type { FormGroupStatus } from '@validation-rules-engine/core';
import { ValidationEngine } from '../validation/engine';
import {
  DEFAULT_PERFORMANCE_CONFIG,
  VANILLA_PERFORMANCE_CONFIG_GROUP,
  createPerformanceModel,
  createPerformanceScenario,
  normalizeConfig,
  parseIntegerInput,
  sampleValueFor,
  type PerformanceFieldDefinition,
  type PerformanceScenario,
  type PerformanceStateModel
} from '../performance/performance-generator';
import { platformUrl } from '../platform-urls';
import { bindField, groupStatusLabel, type BoundField, type FieldBindingContext } from '../ui/field';
import { el } from '../ui/render';
import { renderSummary } from '../ui/summary';
import type { PageContext } from './home';

export function mount(container: HTMLElement, _ctx: PageContext): () => void {
  const engine = new ValidationEngine();
  let scenario = createPerformanceScenario();
  let model = scenario.model;
  let renderCount = 0;
  let metrics = { duration: 0, validations: 0, label: 'No validation run yet.' };
  let fields: BoundField[] = [];
  let unsubscribe = (): void => undefined;
  const cleanups: Array<() => void> = [];
  const sectionStatuses = new Map<string, HTMLElement>();

  const summaryHost = el('div');
  const status = el('p', { className: 'form-status', role: 'status' });
  const configGrid = el('div', { className: 'performance-config-grid' });
  const estimate = el('p', { className: 'form-status' });
  const metricsGrid = el('section', { className: 'metric-grid', 'aria-label': 'Live performance metrics' });
  const sectionsHost = el('div');
  const descriptionLead = el('p', { className: 'lead' });
  let page: HTMLElement;

  const getModel = (): PerformanceStateModel => model;
  const refreshStatusBadges = (): void => {
    for (const [groupName, badge] of sectionStatuses) {
      updateGroupBadge(badge, model[groupName] as FormGroupStatus | undefined);
    }
  };
  const ctx: FieldBindingContext = {
    engine,
    getModel,
    get policyNames() {
      return scenario.policyNames;
    },
    onFieldValidated: () => refreshStatusBadges()
  };

  const registerScenario = (next: PerformanceScenario): void => {
    while (cleanups.length) cleanups.pop()?.();
    for (const { name, policy } of next.policies) {
      cleanups.push(engine.registerPolicy(name, policy));
    }
    for (const group of next.groups) {
      cleanups.push(engine.registerGroup(group));
    }
  };

  const describeScenario = (): string =>
    `${scenario.metrics.totalControls} generated controls, ${scenario.metrics.totalSections} sections, seeded control types, and live render and validation measurements.`;

  const updateMetricsDom = (): void => {
    metricsGrid.replaceChildren(
      metric('Last validate-all', `${metrics.duration.toFixed(2)} ms`),
      metric('Validation runs', String(metrics.validations)),
      metric('Page renders', String(renderCount)),
      metric('Current errors', String(engine.getErrors(model).length))
    );
    status.textContent = metrics.label;
    estimate.textContent = `Estimated ${scenario.metrics.totalControls.toLocaleString()} validated controls. Generate to rebuild sections from the current values.`;
    descriptionLead.textContent = describeScenario();
  };

  const refresh = (): void => {
    renderCount += 1;
    renderSummary(summaryHost, engine.getErrors(model).slice(0, 12), {
      className: 'validation-summary compact-summary',
      heading: 'First validation errors'
    });
    for (const field of fields) field.refresh();
    refreshStatusBadges();
    updateMetricsDom();
  };

  const rebuildConfigFields = (): void => {
    configGrid.replaceChildren();
    const configFields = [
      bindField(ctx, {
        path: 'config.sectionCount',
        label: 'Number of Sections',
        type: 'number',
        parse: parseIntegerInput
      }),
      bindField(ctx, {
        path: 'config.controlsPerSection',
        label: 'Controls per Section',
        type: 'number',
        parse: parseIntegerInput
      }),
      bindField(ctx, {
        path: 'config.seed',
        label: 'Random Seed',
        type: 'number',
        parse: parseIntegerInput
      })
    ];
    fields = [...configFields, ...fields.filter((field) => !field.path.startsWith('config.'))];
    for (const field of configFields) configGrid.append(field.root);
  };

  const rebuildSections = (): void => {
    sectionsHost.replaceChildren();
    sectionStatuses.clear();
    const sectionFields: BoundField[] = [];
    scenario.sections.forEach((section, groupIndex) => {
      const fieldsHost = el('div', { className: 'performance-fields' });
      for (const definition of section.fields) {
        const field = bindPerformanceField(ctx, definition);
        sectionFields.push(field);
        fieldsHost.append(field.root);
      }
      const groupStatus = el('span', { className: 'group-status', textContent: 'Not evaluated' });
      sectionStatuses.set(section.groupName, groupStatus);
      sectionsHost.append(el('section', { className: 'form-section performance-section' }, [
        el('header', {}, [
          el('div', {}, [
            el('p', { className: 'vr-eyebrow', textContent: `Group ${groupIndex + 1}` }),
            el('h2', { textContent: section.title }),
            groupStatus
          ]),
          el('button', {
            type: 'button',
            onClick: () => {
              void engine.validateGroup(model, section.groupName).then(() => refresh());
            }
          }, ['Validate group'])
        ]),
        fieldsHost
      ]));
    });
    fields = [
      ...fields.filter((field) => field.path.startsWith('config.')),
      ...sectionFields
    ];
  };

  const applyScenario = (next: PerformanceScenario, label?: string): void => {
    engine.clear(model);
    scenario = next;
    model = next.model;
    registerScenario(next);
    unsubscribe();
    unsubscribe = engine.subscribe(model, refresh);
    if (label) metrics = { duration: 0, validations: 0, label };
    rebuildConfigFields();
    rebuildSections();
    refresh();
  };

  const generate = async (): Promise<void> => {
    const snapshot = await engine.validateGroup(model, VANILLA_PERFORMANCE_CONFIG_GROUP);
    if (!snapshot.isValid) {
      metrics = { ...metrics, label: 'Fix configuration errors before generating the performance form.' };
      refresh();
      return;
    }
    const next = createPerformanceScenario(normalizeConfig(model.config));
    applyScenario(next, `Generated ${next.metrics.totalControls.toLocaleString()} controls across ${next.metrics.totalSections} sections.`);
  };

  const validateAll = async (): Promise<void> => {
    const start = performance.now();
    const snapshot = await engine.validate(model, scenario.policyNames, { showAllErrors: true });
    const duration = performance.now() - start;
    metrics = {
      duration,
      validations: metrics.validations + 1,
      label: `${snapshot.errors.length} error${snapshot.errors.length === 1 ? '' : 's'} found.`
    };
    refresh();
  };

  const populate = (valid: boolean): void => {
    const nextModel = createPerformanceModel(scenario, (field) => (valid ? sampleValueFor(field) : undefined));
    Object.assign(model, nextModel);
    model.config = nextModel.config;
    model.sections = nextModel.sections;
    engine.clear(model);
    metrics = {
      ...metrics,
      label: valid ? 'Valid sample data populated.' : 'Invalid sample data populated.'
    };
    for (const field of fields) field.syncValue();
    refresh();
  };

  const form = el('form', { noValidate: true }, [
    sectionsHost,
    el('div', { className: 'form-actions' }, [
      el('button', { className: 'primary', type: 'submit' }, ['Submit large form'])
    ])
  ]);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void engine.validate(model, scenario.policyNames, { showAllErrors: true }).then((snapshot) => {
      if (snapshot.isValid) metrics = { ...metrics, label: 'Large form is valid.' };
      refresh();
    });
  });

  page = el('div', { className: 'showcase-page' }, [
    el('header', { className: 'showcase-page-heading' }, [
      el('div', {}, [
        el('h1', { textContent: 'Large core-validated form' }),
        descriptionLead
      ])
    ]),
    el('div', {}, [
      el('section', { className: 'form-section performance-config', 'aria-label': 'Performance configuration' }, [
        el('header', {}, [
          el('div', {}, [
            el('p', { className: 'vr-eyebrow', textContent: 'Generation controls' }),
            el('h2', { textContent: 'Performance form configuration' })
          ]),
          el('button', {
            className: 'primary',
            type: 'button',
            onClick: () => void generate()
          }, ['Generate form'])
        ]),
        configGrid,
        estimate
      ]),
      metricsGrid,
      el('div', { className: 'vr-action-bar' }, [
        el('button', { className: 'primary', type: 'button', onClick: () => void validateAll() }, ['Validate all']),
        el('button', { type: 'button', onClick: () => populate(true) }, ['Populate valid data']),
        el('button', { type: 'button', onClick: () => populate(false) }, ['Populate invalid data']),
        el('button', {
          type: 'button',
          onClick: () => applyScenario(createPerformanceScenario(DEFAULT_PERFORMANCE_CONFIG), 'Performance form reset.')
        }, ['Reset'])
      ]),
      status,
      summaryHost,
      form,
      el('p', { className: 'docs-callout' }, [
        'Values are live measurements, not benchmark claims. ',
        el('a', { href: platformUrl('docs', '/docs/core-package') }, ['Read performance guidance →'])
      ])
    ])
  ]);
  descriptionLead.textContent = describeScenario();

  registerScenario(scenario);
  unsubscribe = engine.subscribe(model, refresh);
  rebuildConfigFields();
  rebuildSections();
  refresh();

  container.append(page);
  return () => {
    unsubscribe();
    while (cleanups.length) cleanups.pop()?.();
    page.remove();
  };
}

function metric(label: string, value: string): HTMLElement {
  return el('div', {}, [
    el('span', { textContent: label }),
    el('strong', { textContent: value })
  ]);
}

function updateGroupBadge(node: HTMLElement, status: FormGroupStatus | undefined): void {
  node.textContent = groupStatusLabel(status);
  node.className = `group-status${status?.isValid ? ' valid' : status?.isInValid ? ' invalid' : ''}`;
}

function bindPerformanceField(ctx: FieldBindingContext, field: PerformanceFieldDefinition): BoundField {
  const id = `validation-field-${field.elementId}`;
  switch (field.type) {
    case 'checkbox':
      return bindField(ctx, { path: field.path, label: field.label, control: 'checkbox', id });
    case 'select':
      return bindField(ctx, {
        path: field.path,
        label: field.label,
        control: 'select',
        id,
        selectOptions: (field.selectOptions ?? []).map((value) => ({ value, label: value }))
      });
    case 'textarea':
      return bindField(ctx, { path: field.path, label: field.label, control: 'textarea', id });
    case 'radio':
      return bindField(ctx, {
        path: field.path,
        label: field.label,
        control: 'radio',
        id,
        radioOptions: field.radioOptions
      });
    case 'number':
      return bindField(ctx, {
        path: field.path,
        label: field.label,
        type: 'number',
        id,
        parse: (value) => (value === '' ? '' : Number(value))
      });
    default:
      return bindField(ctx, { path: field.path, label: field.label, type: field.type, id });
  }
}
