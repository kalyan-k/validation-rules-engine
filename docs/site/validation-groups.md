# Validation Groups

Groups turn individual field failures into useful workflow status without hiding the underlying results.

## Form groups

A form group maps a UI section to one policy. Register the mapping once, then evaluate the section independently.

```ts
validation.registerFormGroupPolicy('shippingInfo', 'ShippingAddress');
validation.evaluateFormGroup(order, 'shippingInfo');
```

The model receives status such as `isValid`, `isInValid`, `isEvaluated`, and the errors belonging to that section.

## Policy groups

A policy group aggregates several policies and form groups for larger workflows.

```ts
validation.registerPolicyGroup('checkout', {
  policies: ['PersonalInfo', 'ShippingAddress', 'BillingAddress'],
  formGroups: ['personalInfo', 'shippingInfo', 'billingInfo']
});

validation.evaluatePolicies(
  order,
  ['PersonalInfo', 'ShippingAddress', 'BillingAddress'],
  'checkout'
).subscribe();
```

## Status and summary components

The Angular adapter provides group and policy-group status and summary components. Display strategies decide the CSS and DOM treatment; the validation model remains the source of truth.

Compare live group behavior across showcases:

- [Angular Bootstrap groups](http://127.0.0.1:4202/showcases/bootstrap)
- [Vanilla complex form](http://127.0.0.1:4205/complex)
- [React complex Local State](http://127.0.0.1:4204/state/local-state/complex)

## Good group boundaries

- Match a group to a section a user can understand and correct.
- Keep group names stable across templates and registration.
- Do not use groups to conceal executable code from coverage or testing.
- Clear group state when replacing the underlying model.
