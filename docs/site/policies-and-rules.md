# Policies & Rules

A policy names a coherent validation concern. Rules inside the policy describe valid model state; execution remains separate.

## Policy composition

Prefer several focused policies over one application-wide policy. A checkout flow may have `PersonalInfo`, `ShippingAddress`, and `BillingAddress` policies that can run independently or as one policy group.

## Built-in rules

The fluent validator supports common checks such as required values, email shape, numeric values, ranges, dates, regular expressions, and checked states. Rules return the success sentinel or a structured validation failure.

```ts
v.validateFor('seatCount')
  .isRequired('Seat count is required')
  .isNumber('Seat count must be numeric')
  .range('Choose between 1 and 500 seats', 1, 500, 'number');
```

## Conditional rules

Pass a dependency when a field should be validated only for a particular model state. Keep the dependency deterministic: it may run more than once during required-state and validation evaluation.

## Rule execution

1. Resolve the registered policy by name.
2. Evaluate active validators for the model or requested property.
3. Wait for synchronous and asynchronous results.
4. Replace failures for the evaluated paths.
5. Update required and group state when requested.
6. Notify refresh subscribers.

## Result shape

```ts
{
  propertyName: 'email',
  error: { message: 'Enter a valid email address' }
}
```

Applications remain responsible for deciding when to display, persist, or clear these results.

## Try it live

- [Vanilla simple form](http://127.0.0.1:4205/simple)
- [Angular Bootstrap showcase](http://127.0.0.1:4202/showcases/bootstrap)
- [React Local State simple](http://127.0.0.1:4204/state/local-state/simple)
