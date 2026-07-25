import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ValidationRulesProvider } from '@validation-rules/react';
import { App } from './app';

function renderApp() {
  return render(<ValidationRulesProvider><App /></ValidationRulesProvider>);
}

async function navigate(label: string) {
  await userEvent.click(screen.getByRole('link', { name: label }));
}

describe('React showcase application', () => {
  it('renders the shared layout, home content, navigation, and documentation links', () => {
    renderApp();
    expect(screen.getByRole('navigation', { name: 'React showcase pages' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Policy validation that fits React.' })).toBeTruthy();
    expect(screen.getByText(/React application -> @validation-rules\/react/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'React documentation →' }).getAttribute('href')).toContain('/docs/react-overview');
    expect(document.querySelector('validation-platform-shell')?.getAttribute('active-application')).toBe('react-showcase');
  });

  it('navigates among Home, Simple, Complex, and Performance routes with active state', async () => {
    renderApp();
    await navigate('Local State Simple Form');
    expect(screen.getByRole('heading', { name: 'Simple contact form' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Local State Simple Form' }).getAttribute('aria-current')).toBe('page');
    await navigate('Local State Complex Form');
    expect(screen.getByRole('heading', { name: 'Complex enterprise profile' })).toBeTruthy();
    await navigate('Local State Performance Form');
    expect(screen.getByRole('heading', { name: 'Large state-managed form' })).toBeTruthy();
    await navigate('Home');
    expect(screen.getByRole('heading', { name: 'Policy validation that fits React.' })).toBeTruthy();
  });

  it('uses home example links as client-side navigation', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('link', { name: 'Open complex form ->' }));
    expect(screen.getByRole('heading', { name: 'Complex enterprise profile' })).toBeTruthy();
  });

  it('blocks an invalid simple submission and exposes inline accessible messages', async () => {
    renderApp();
    await navigate('Local State Simple Form');
    await userEvent.click(screen.getByRole('button', { name: 'Submit contact' }));
    expect(await screen.findByText('Submission blocked. Correct the highlighted fields.')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByLabelText('First name').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByText('First name is required.').length).toBeGreaterThanOrEqual(2);
  });

  it('accepts and resets a valid simple form', async () => {
    renderApp();
    await navigate('Local State Simple Form');
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Avery' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Patel' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'avery@example.com' } });
    await userEvent.click(screen.getByRole('button', { name: 'Submit contact' }));
    expect(await screen.findByText('Valid submission accepted.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('The form was reset.')).toBeTruthy();
  });

  it('validates simple email on change and links to field documentation', async () => {
    renderApp();
    await navigate('Local State Simple Form');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad' } });
    fireEvent.blur(screen.getByLabelText('Email'));
    await waitFor(() => expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true'));
    expect(screen.getByRole('link', { name: 'Read the field-validation guide →' }).getAttribute('href')).toContain('react-field-validation');
  });

  it('manages complex dynamic sections, conditional fields, and group validation', async () => {
    renderApp();
    await navigate('Local State Complex Form');
    await userEvent.click(screen.getByRole('button', { name: 'Add address' }));
    const addressTwo = screen.getByRole('group', { name: 'Address 2' });
    expect(addressTwo).toBeTruthy();
    await userEvent.click(within(addressTwo).getByRole('button', { name: 'Remove address' }));
    expect(screen.queryByRole('group', { name: 'Address 2' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Add contact method' }));
    const contactTwo = screen.getByRole('group', { name: 'Contact 2' });
    expect(contactTwo).toBeTruthy();
    await userEvent.click(within(contactTwo).getByRole('button', { name: 'Remove contact' }));
    await userEvent.click(screen.getByLabelText('Add a secondary email'));
    expect(screen.getByLabelText('Secondary email')).toBeTruthy();

    const personal = screen.getByRole('heading', { name: 'Personal information' }).closest('section')!;
    await userEvent.click(within(personal).getByRole('button', { name: 'Validate section' }));
    expect(await within(personal).findByText('Needs attention')).toBeTruthy();
  });

  it('populates, validates, saves, and resets the complex form', async () => {
    renderApp();
    await navigate('Local State Complex Form');
    await userEvent.click(screen.getByRole('button', { name: 'Populate sample data' }));
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('Avery');
    expect(screen.getByRole('group', { name: 'Address 2' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Validate all programmatically' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('Profile saved successfully.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reset profile' }));
    expect(screen.getByText('Profile reset.')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Address 2' })).toBeNull();
  });

  it('measures validation and supports performance sample/reset/group actions', async () => {
    renderApp();
    await navigate('Local State Performance Form');
    expect(screen.getByLabelText('Number of Sections')).toBeTruthy();
    expect(screen.getByLabelText('Controls per Section')).toBeTruthy();
    expect(screen.getByLabelText('Random Seed')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Number of Sections'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Controls per Section'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Random Seed'), { target: { value: '7' } });
    await userEvent.click(screen.getByRole('button', { name: 'Generate form' }));
    expect(await screen.findByText('Generated 8 controls across 2 sections.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Populate invalid data' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate all' }));
    expect(await screen.findByText(/errors found\./)).toBeTruthy();
    expect(Number(screen.getByText('Current errors').nextElementSibling?.textContent)).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Populate valid data' }));
    await userEvent.click(screen.getByRole('button', { name: 'Validate all' }));
    expect(await screen.findByText('0 errors found.')).toBeTruthy();
    await userEvent.click(screen.getAllByRole('button', { name: 'Validate group' })[0]!);
    await userEvent.click(screen.getByRole('button', { name: 'Submit large form' }));
    expect(await screen.findByText('Large form is valid.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Performance form reset.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Read performance guidance →' }).getAttribute('href')).toContain('react-performance');
  });
});
