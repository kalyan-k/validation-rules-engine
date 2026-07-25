# Testing React Integration

Test user-visible behavior with React Testing Library and user-event. Keep direct engine tests for registration, group, nested-path, and asynchronous edge cases.

## Provider test wrapper

```tsx
function renderWithValidation(ui: React.ReactElement) {
  return render(
    <ValidationRulesProvider>{ui}</ValidationRulesProvider>
  );
}
```

## Field behavior

```tsx
const user = userEvent.setup();
renderWithValidation(<AccountForm />);

await user.click(screen.getByRole('button', { name: /save/i }));
expect(await screen.findByText('Email is required.')).toBeVisible();

await user.type(screen.getByLabelText('Email'), 'person@example.com');
await user.tab();
expect(screen.queryByText('Email is required.')).toBeNull();
```

Test `aria-invalid`, the described-by relationship, focus after failed submit, reset, and valid/invalid callbacks. Do not assert internal hook state when the same behavior is visible through the control.

## Engine behavior

For engine tests, register a policy, validate a plain model, and inspect the returned snapshot and core-compatible model results. Always invoke the disposer to verify lifecycle behavior.

## Async rules

Use controlled promises to resolve validations out of order. Assert that only the latest field result remains. Rejecting rules propagate their error; applications should convert expected remote failures into validation error objects.

## Strict Mode

Render the harness in `<StrictMode>`, validate, unmount, and assert policy ownership remains balanced without duplicate error messages.

## Coverage

The workspace enforces independent 90% statement, branch, function, and line thresholds for the React package and React showcase. HTML, JSON summary, LCOV, and JUnit output are generated under `reports/packages/react` and `reports/showcases/react`.
