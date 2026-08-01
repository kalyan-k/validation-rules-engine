# Angular Installation

## Install

```bash
npm install @validation-rules-engine/angular @validation-rules-engine/core
```

The Angular package depends on Core contracts. Keep their versions aligned.

## Module setup

```ts
import { ValidationModule } from '@validation-rules-engine/angular';

@NgModule({
  imports: [
    ValidationModule.forRoot({
      displayStrategy: 'bootstrap'
    })
  ]
})
export class AppModule {}
```

## Display configuration

Use the built-in display strategy that matches your component library or provide custom class names.

```ts
ValidationModule.forRoot({
  invalidClass: 'is-invalid',
  errorClass: 'invalid-feedback',
  requiredMarkerClass: 'required'
});
```

## Verify

Inject `ValidationProviderService` and register a simple policy. If the service resolves and a control can use `policyValidator`, setup is complete.
