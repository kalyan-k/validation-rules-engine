import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ValidationRulesProvider } from '@validation-rules-engine/react';
import { App } from '../app';
import { strategies } from './strategies';

function renderRoute(path: string) {
  window.history.replaceState({}, '', path);
  return render(<ValidationRulesProvider><App /></ValidationRulesProvider>);
}

describe.each(strategies)('$label state integration', (strategy) => {
  const root = `/state/${strategy.id}`;

  it('renders its home, active navigation, architecture, derived state, and client-side links', async () => {
    renderRoute(root);
    expect(screen.getByRole('heading', { name: `${strategy.label} + Validation Rules Engine` })).toBeTruthy();
    const navigation = screen.getByRole('navigation', { name: 'React showcase pages' });
    expect(within(navigation).getByRole('link', { name: strategy.label }).getAttribute('aria-current')).toBe('page');
    const pageTabs = screen.getByRole('navigation', { name: 'State showcase pages' });
    expect(within(pageTabs).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBe('page');
    expect(within(pageTabs).getByRole('link', { name: 'Simple Form' })).toBeTruthy();
    expect(within(pageTabs).getByRole('link', { name: 'Complex Form' })).toBeTruthy();
    expect(within(pageTabs).getByRole('link', { name: 'Performance Form' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Read Documentation' }).getAttribute('href')).toContain(`react-state-${strategy.id}`);
    expect(screen.getByText(strategy.architecture)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Dispatch sample update' }));
    expect(within(screen.getByRole('region', { name: 'State store activity' })).getAllByText('1')).toHaveLength(2);
    await userEvent.click(within(pageTabs).getByRole('link', { name: 'Simple Form' }));
    expect(screen.getByRole('heading', { name: 'Simple contact form' })).toBeTruthy();
  });

  it('validates, submits, and resets the simple form with messages and summary', async () => {
    renderRoute(`${root}/simple`);
    await userEvent.click(screen.getByRole('button', { name: 'Submit contact' }));
    expect(await screen.findByText('Submission blocked. Correct the highlighted fields.')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getAllByText('First name is required.').length).toBeGreaterThanOrEqual(2);
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Avery' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Patel' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'avery@example.com' } });
    await userEvent.click(screen.getByRole('button', { name: 'Submit contact' }));
    expect(await screen.findByText('Valid submission accepted.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('The form was reset.')).toBeTruthy();
  });

  it('handles nested data, dynamic sections, conditional fields, groups, submit, and reset', async () => {
    renderRoute(`${root}/complex`);
    await userEvent.click(screen.getByRole('button', { name: 'Add address' }));
    const secondAddress = screen.getByRole('group', { name: 'Address 2' });
    await userEvent.click(within(secondAddress).getByRole('button', { name: 'Remove address' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add contact method' }));
    const secondContact = screen.getByRole('group', { name: 'Contact 2' });
    await userEvent.click(within(secondContact).getByRole('button', { name: 'Remove contact' }));
    await userEvent.click(screen.getByLabelText('Add a secondary email'));
    expect(screen.getByLabelText('Secondary email')).toBeTruthy();
    const personal = screen.getByRole('heading', { name: 'Personal information' }).closest('section')!;
    await userEvent.click(within(personal).getByRole('button', { name: 'Validate section' }));
    expect(await within(personal).findByText('Needs attention')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Populate sample data' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate all programmatically' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('Profile saved successfully.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reset profile' }));
    expect(screen.getByText('Profile reset.')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Address 2' })).toBeNull();
  });

  it('runs the large-form performance lifecycle and reports live metrics', async () => {
    renderRoute(`${root}/performance`);
    expect(screen.getByLabelText('Number of Sections')).toBeTruthy();
    expect(screen.getByLabelText('Controls per Section')).toBeTruthy();
    expect(screen.getByLabelText('Random Seed')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Number of Sections'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Controls per Section'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Random Seed'), { target: { value: String(strategy.id.length + 7) } });
    await userEvent.click(screen.getByRole('button', { name: 'Generate form' }));
    expect(await screen.findByText('Generated 8 controls across 2 sections.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Populate invalid data' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate all' }));
    expect(await screen.findByText(/errors found\./u)).toBeTruthy();
    expect(Number(screen.getByText('Current errors').nextElementSibling?.textContent)).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Populate valid data' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate all' }));
    expect(await screen.findByText('0 errors found.')).toBeTruthy();
    await userEvent.click(screen.getAllByRole('button', { name: 'Validate group' })[0]!);
    await userEvent.click(screen.getByRole('button', { name: 'Submit large form' }));
    expect(await screen.findByText('Large form is valid.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(screen.getByText('Performance form reset.')).toBeTruthy());
  }, 30_000);
});
