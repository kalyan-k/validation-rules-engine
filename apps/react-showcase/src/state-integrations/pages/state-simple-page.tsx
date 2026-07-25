import { useRef, useState } from 'react';
import { ValidationSummary } from '@validation-rules/react';
import { FormField } from '../../components/form-field';
import { platformUrl } from '../../platform-urls';
import { SIMPLE_INITIAL_MODEL, simpleStatePolicy, type SimpleStateModel } from '../models';
import type { StrategyDefinition } from '../types';
import { useManagedValidationForm } from '../use-managed-validation-form';
import { StatePageFrame } from './page-frame';

const POLICIES = [{ name: 'managed-simple', policy: simpleStatePolicy }];
const POLICY_NAMES = ['managed-simple'];

export function StateSimplePage({ strategy, navigate }: { strategy: StrategyDefinition; navigate(path: string): void }) {
  const [status, setStatus] = useState('Complete the form, then submit it.');
  const summaryRef = useRef<HTMLDivElement>(null);
  const form = useManagedValidationForm<SimpleStateModel>({
    initialModel: SIMPLE_INITIAL_MODEL,
    policies: POLICIES,
    policyNames: POLICY_NAMES
  });
  const reset = () => {
    form.reset();
    setStatus('The form was reset.');
  };
  return (
    <StatePageFrame
      strategy={strategy}
      page="simple"
      pageLabel="Simple Form"
      title="Simple contact form"
      description="The same field, form, submit, reset, message, and summary lifecycle backed by this state solution."
      navigate={navigate}
    >
      <div className="showcase-grid">
        <section className="form-card">
          <div ref={summaryRef} tabIndex={-1}><ValidationSummary className="validation-summary" errors={form.errors} /></div>
          <form noValidate onSubmit={form.handleSubmit(
            async () => setStatus('Valid submission accepted.'),
            async () => { setStatus('Submission blocked. Correct the highlighted fields.'); summaryRef.current?.focus(); }
          )}>
            <div className="field-grid">
              <FormField form={form} path="firstName" label="First name" />
              <FormField form={form} path="lastName" label="Last name" />
              <FormField form={form} path="email" label="Email" type="email" validateOnChange />
              <FormField form={form} path="phone" label="Phone" type="tel" />
            </div>
            <div className="form-actions">
              <button className="primary" type="submit">Submit contact</button>
              <button type="button" onClick={reset}>Reset</button>
            </div>
            <p className="form-status" role="status">{status}</p>
          </form>
        </section>
        <aside className="notes-card">
          <p className="vr-eyebrow">Consistent contract</p>
          <h2>State ownership changes. Validation does not.</h2>
          <ul><li>Focused field messages</li><li>Validate-on-change email</li><li>Accessible summary</li><li>Store-backed reset and submit</li></ul>
          <a href={platformUrl('docs', '/docs/react-field-validation')}>Read the field-validation guide &rarr;</a>
        </aside>
      </div>
    </StatePageFrame>
  );
}
