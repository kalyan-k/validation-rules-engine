# Angular Package

`@validation-rules/angular` adapts Core policies to Angular lifecycles while preserving model-first validation. It supports template-driven `ngModel` forms, Reactive Forms coordination, Angular Material, Bootstrap, Tailwind-compatible classes, custom display strategies, dynamic sections, validation groups, summaries, and state workflows including NgRx, NGXS, Akita, Elf, RxAngular State, Signals, and custom RxJS stores.

## What Angular owns

- Policy registration and execution through `ValidationProviderService`.
- The `policyValidator` directive for template-driven controls.
- Required-state, touched-state, field-error, and group-status updates.
- Summary and status components.
- Bootstrap, Material, Tailwind, generic, default, and custom display strategies.
- Refresh notifications for OnPush and application-owned rendering.

## Registration

```ts
validation.register('Account', new AccountPolicy());
validation.registerFormGroupPolicy('accountForm', 'Account');
validation.registerPolicyGroup('onboarding', {
  policies: ['Account'],
  formGroups: ['accountForm']
});
```

Use `replacePolicy()` for generated forms whose rule set changes at runtime.

## Template-driven controls

```html
<input
  [(ngModel)]="model.email"
  policyValidator
  [validateModel]="'form.email'"
  [actualModel]="model"
  [withPolicy]="'Account'"
  groupName="accountForm"
/>
```

The directive registers the control, evaluates field rules during interaction, records metadata on the model, and delegates rendering to the configured display strategy.

## Reactive Forms and state management

The adapter does not require Angular Forms, but it can be coordinated with Reactive Forms and application-owned state. The Angular showcase exposes a comparable state-management section where every strategy has Overview, Simple Form, Complex Form, and Performance Form pages.

## Multiple Forms

Register each form with its own policy name and form-group name so metadata and summaries stay isolated. This is the pattern used by pages that render sample, complex, and performance forms side by side in the same Angular application shell.

## Dynamic Forms

Dynamic Angular forms should generate model paths and policy rules from the same field definition source. When the definition changes, replace the generated policy and rebuild form-group membership so removed fields no longer report stale errors.

## Validation Summary

Angular summary components read the same field-error metadata produced by Core policies. Use summaries for submit-level feedback and field messages for focused correction; both should point back to the same model paths.

## Validation Lifecycle

The directive-driven lifecycle validates fields during interaction, updates touched and required-state metadata, and lets submit or group actions validate broader sections. Reactive Forms and store-driven flows can call the service directly when state changes outside template-driven controls.

## Custom Components

Custom Angular inputs integrate by forwarding `ngModel`, path, policy, and form-group information to the validation directive or by using the service directly. Design-system components should keep rendering decisions in the component while leaving rule definitions in reusable policies.

[Open the Angular showcase](http://127.0.0.1:4202/) or jump directly to the [Angular state-management overview](http://127.0.0.1:4202/state/template-driven).
