# Core FAQ

## Should applications use Core directly?

Use Core directly for shared policy libraries, adapter development, non-UI validation, or framework-free forms such as the [Vanilla Showcase](/docs/vanilla-overview). Use Angular or React adapters when you need framework lifecycle integration and display helpers for application forms.

## Does Core mutate the model?

Validation metadata is written to the model so adapters can read a consistent result shape. Domain values are not changed by validators.

## Are policies framework-specific?

No. A policy that imports only Core contracts can be reused by Angular, React, and plain TypeScript callers.

## Can rules be asynchronous?

Yes. Use `userDefined` and return a promise or observable-like result when the adapter supports asynchronous execution.

## Why do optional email fields pass when empty?

Format rules skip empty values. Add `isRequired` when the field must be present.

## How should dynamic fields work?

Generate policy metadata from the same field definitions used to render the UI. Replace or unregister old generated policies when fields are removed.
