# Angular Examples

## Template-driven registration

```html
<input
  name="email"
  [(ngModel)]="model.email"
  policyValidator
  [validateModel]="'form.email'"
  [actualModel]="model"
  [withPolicy]="'Registration'"
/>
```

## Dynamic generated section

```ts
generate(fields: FieldDefinition[]): void {
  this.validation.replacePolicy('Generated', createGeneratedPolicy(fields));
  this.validation.registerFormGroupPolicy('generated', 'Generated');
}
```

## Custom component

Wrap your design-system input with `ControlValueAccessor`, then apply `policyValidator` where the value is bound.

## Live showcases

[Angular Showcase](http://127.0.0.1:4202/) compares Bootstrap, Material, Tailwind-compatible display, and Angular state management workflows including NgRx, NGXS, Akita, Elf, RxAngular State, Signals, and a custom RxJS store.
