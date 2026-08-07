# Core Examples

[Open Live Vanilla Showcase](http://127.0.0.1:4205/complex) · [Simple form](http://127.0.0.1:4205/simple) · [Performance form](http://127.0.0.1:4205/performance)

## Nested profile

```ts
class ProfilePolicy implements ValidationPolicy {
  addValidations(helper: ValidatorHelper): Validator[] {
    return [
      helper.validateFor('profile.firstName').isRequired('First name is required'),
      helper.validateFor('profile.lastName').isRequired('Last name is required'),
      helper.validateFor('profile.email')
        .isRequired('Email is required')
        .isEmail('Enter a valid email address')
    ];
  }
}
```

## Conditional billing address

```ts
class BillingPolicy implements ValidationPolicy {
  addValidations(helper: ValidatorHelper): Validator[] {
    return [
      helper.validateFor('billing.street', '!billing.sameAsShipping').isRequired('Street is required'),
      helper.validateFor('billing.city', '!billing.sameAsShipping').isRequired('City is required'),
      helper.validateFor('billing.postalCode', '!billing.sameAsShipping').isZipCode('Enter a ZIP code')
    ];
  }
}
```

## Generated fields

```ts
function generatedPolicy(fields: Array<{ path: string; label: string }>): ValidationPolicy {
  return {
    addValidations(helper) {
      return fields.map((field) =>
        helper.validateFor(field.path).isRequired(`${field.label} is required`)
      );
    }
  };
}
```
