import { useRef, useState } from 'react';
import { ValidationSummary } from '@validation-rules/react';
import { FormField } from '../../components/form-field';
import { PerformanceField } from '../../performance/performance-field';
import { platformUrl } from '../../platform-urls';
import {
  DEFAULT_PERFORMANCE_CONFIG,
  PERFORMANCE_CONFIG_GROUP,
  createPerformanceModel,
  createPerformanceScenario,
  normalizeConfig,
  parseIntegerInput,
  sampleValueFor
} from '../../performance/performance-generator';
import type { PerformanceStateModel } from '../models';
import type { StrategyDefinition } from '../types';
import { useManagedValidationForm } from '../use-managed-validation-form';
import { StatePageFrame } from './page-frame';

export function StatePerformancePage({ strategy, navigate }: { strategy: StrategyDefinition; navigate(path: string): void }) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  const [scenario, setScenario] = useState(() => createPerformanceScenario());
  const [metrics, setMetrics] = useState({ duration: 0, validations: 0, label: 'No validation run yet.' });
  const form = useManagedValidationForm<PerformanceStateModel>({
    initialModel: scenario.model,
    policies: scenario.policies,
    policyNames: scenario.policyNames,
    groups: scenario.groups
  });

  const generate = async () => {
    const snapshot = await form.validateGroup(PERFORMANCE_CONFIG_GROUP);
    if (!snapshot.isValid) {
      setMetrics((current) => ({ ...current, label: 'Fix configuration errors before generating the performance form.' }));
      return;
    }
    const next = createPerformanceScenario(normalizeConfig(form.model.config));
    setScenario(next);
    form.reset(next.model);
    setMetrics({
      duration: 0,
      validations: 0,
      label: `Generated ${next.metrics.totalControls.toLocaleString()} controls across ${next.metrics.totalSections} sections.`
    });
  };
  const validateAll = async () => {
    const start = performance.now();
    const snapshot = await form.validate({ showAllErrors: true });
    const duration = performance.now() - start;
    setMetrics((current) => ({
      duration,
      validations: current.validations + 1,
      label: `${snapshot.errors.length} error${snapshot.errors.length === 1 ? '' : 's'} found.`
    }));
  };
  const populate = (valid: boolean) => {
    form.setModel(createPerformanceModel(scenario, (field) => valid ? sampleValueFor(field) : undefined));
    setMetrics((current) => ({ ...current, label: valid ? 'Valid sample data populated.' : 'Invalid sample data populated.' }));
  };
  const reset = () => {
    const next = createPerformanceScenario(DEFAULT_PERFORMANCE_CONFIG);
    setScenario(next);
    form.reset(next.model);
    setMetrics({ duration: 0, validations: 0, label: 'Performance form reset.' });
  };
  return (
    <StatePageFrame
      strategy={strategy}
      page="performance"
      pageLabel="Performance Form"
      title="Large state-managed form"
      description={`${scenario.metrics.totalControls} generated controls, ${scenario.metrics.totalSections} sections, seeded control types, and live render and validation measurements.`}
      navigate={navigate}
    >
      <section className="form-section performance-config" aria-label="Performance configuration">
        <header>
          <div><p className="vr-eyebrow">Generation controls</p><h2>Performance form configuration</h2></div>
          <button className="primary" type="button" onClick={() => void generate()}>Generate form</button>
        </header>
        <div className="performance-config-grid">
          <FormField form={form} path="config.sectionCount" label="Number of Sections" type="number" parse={parseIntegerInput} />
          <FormField form={form} path="config.controlsPerSection" label="Controls per Section" type="number" parse={parseIntegerInput} />
          <FormField form={form} path="config.seed" label="Random Seed" type="number" parse={parseIntegerInput} />
        </div>
        <p className="form-status">Estimated {scenario.metrics.totalControls.toLocaleString()} validated controls. Generate to rebuild sections from the current values.</p>
      </section>
      <section className="metric-grid" aria-label="Live performance metrics">
        <div><span>Last validate-all</span><strong>{metrics.duration.toFixed(2)} ms</strong></div>
        <div><span>Validation runs</span><strong>{metrics.validations}</strong></div>
        <div><span>Page renders</span><strong>{renderCount.current}</strong></div>
        <div><span>Current errors</span><strong>{form.errors.length}</strong></div>
      </section>
      <div className="vr-action-bar">
        <button className="primary" type="button" onClick={() => void validateAll()}>Validate all</button>
        <button type="button" onClick={() => populate(true)}>Populate valid data</button>
        <button type="button" onClick={() => populate(false)}>Populate invalid data</button>
        <button type="button" onClick={reset}>Reset</button>
      </div>
      <p className="form-status" role="status">{metrics.label}</p>
      <ValidationSummary className="validation-summary compact-summary" errors={form.errors.slice(0, 12)} heading="First validation errors" />
      <form noValidate onSubmit={form.handleSubmit(async () => setMetrics((current) => ({ ...current, label: 'Large form is valid.' })))}>
        {scenario.sections.map((section, groupIndex) => (
          <section className="form-section performance-section" key={section.groupName}>
            <header>
              <div><p className="vr-eyebrow">Group {groupIndex + 1}</p><h2>{section.title}</h2></div>
              <button type="button" onClick={() => void form.validateGroup(section.groupName)}>Validate group</button>
            </header>
            <div className="performance-fields">
              {section.fields.map((field) => (
                <PerformanceField key={field.path} form={form} field={field} />
              ))}
            </div>
          </section>
        ))}
        <div className="form-actions"><button className="primary" type="submit">Submit large form</button></div>
      </form>
      <p className="docs-callout">Values are live measurements, not benchmark claims. <a href={platformUrl('docs', '/docs/react-performance')}>Read performance guidance &rarr;</a></p>
    </StatePageFrame>
  );
}
