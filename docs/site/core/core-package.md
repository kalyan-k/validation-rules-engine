# Core Package

`@validation-rules-engine/core` is the framework-neutral layer. It defines validation policies, validators, helper functions, model metadata, validation results, required-field results, and group status contracts. Angular and React both build on this package without changing rule behavior.

[Open Live Vanilla Showcase](http://127.0.0.1:4205/) · [Open Portal](http://127.0.0.1:4200/)

## What Core owns

- Policy contracts such as `ValidationPolicy`.
- Rule builders created through `ValidatorHelper`.
- Built-in rules such as `isRequired`, `isEmail`, `isNumber`, `isDate`, `range`, `isChecked`, `isPhone`, `regEx`, and `userDefined`.
- Validation metadata such as touched fields, required results, field errors, and group summaries.
- Utility functions for clearing touched state and resetting model metadata.

## What adapters own

Core does not render messages, inspect the DOM, subscribe to Angular forms, or manage React state. Adapters decide when validation runs and how results become UI. This keeps one policy reusable across Angular, React, NgRx, local state, Redux Toolkit, Zustand, Jotai, Recoil, MobX, and plain TypeScript workflows.

## Minimal policy

```ts
import type { ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/core';

export interface RegistrationModel {
  firstName: string;
  email: string;
}

export class RegistrationPolicy implements ValidationPolicy {
  addValidations(helper: ValidatorHelper): Validator[] {
    return [
      helper.validateFor('firstName').isRequired('First name is required'),
      helper.validateFor('email')
        .isRequired('Email is required')
        .isEmail('Enter a valid email address')
    ];
  }
}
```

## Package navigation

Use the Core package pages in order when onboarding: Installation, Quick Start, Architecture, Validation Policies, Validation Rules, Validation Groups, Public API, Examples, Best Practices, Troubleshooting, and FAQ.

## Validation Engine

The validation engine evaluates the validators returned by a policy against the model path each validator targets. It keeps execution framework-neutral: adapters decide when to call it, but Core decides how validator results, required-field metadata, and validation errors are represented.

## Registration and Unregistration

Policies are normally registered by Angular or React adapters, but the Core contract is intentionally simple: a named policy supplies validators, and removing that policy removes its rule set from future validation passes. Generated forms should replace or unregister generated policy names when their field definition changes.

## Rule Execution

Rules execute in the order returned from `addValidations()`. Required rules establish required-state metadata, format rules such as email or date rules validate present values, and custom `userDefined` rules can use the whole model for domain checks without changing the public API.

## Validation Results

Core validation results describe field paths, messages, validity, required-state, and group status. UI adapters convert those results into messages, summaries, CSS classes, ARIA state, and submit blocking.

## Public APIs

The supported Core APIs are documented in the Public API page and include `ValidationPolicy`, `Validator`, `ValidatorHelper`, validation result contracts, group contracts, rule builders, and metadata helpers. Application code should import from package entry points instead of internal files.

## TypeScript Examples

The Examples page includes copyable TypeScript policies for nested models, grouped sections, conditional rules, and custom validators. These examples are deliberately framework-free so they can be reused from Angular, React, tests, or service-layer workflows.

## Advanced Usage

Advanced Core usage includes generated policy factories, policy groups for wizard steps, custom rules that inspect sibling values, and explicit metadata reset when a model is replaced. Keep these patterns deterministic so adapters can safely rerun validation during render or form events.

## Design principle

Write policies as pure, deterministic descriptions of the model. Keep UI lifecycle, form submission, and store updates outside Core. That boundary is what lets every adapter share the same validation behavior.
