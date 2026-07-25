# What is Validation Rules?

Validation Rules is a policy-driven validation platform for applications that need reusable rules, explicit lifecycle control, and consistent validation state. It separates **what makes a model valid** from the framework code that renders fields and messages.

## Why it exists

Validation logic often spreads across templates, components, event handlers, reducers, and API adapters. That makes the same rule difficult to reuse and even harder to test. Validation Rules gives rules a named policy, gives execution a deliberate lifecycle, and gives frameworks a narrow adapter boundary.

## Philosophy

- Model validation is a domain concern, not a component concern.
- Framework integration should consume a framework-neutral engine.
- A validation result should be inspectable state, not hidden UI behavior.
- Registration and cleanup should be explicit for long-lived applications.
- Public APIs and compatibility hooks should change only through planned releases.

## The platform

The repository contains three publishable packages and several private applications:

- `@validation-rules/core` owns contracts, rules, validators, metadata, and result shapes.
- `@validation-rules/angular` owns Angular policy execution, forms integration, directives, components, and display strategies.
- `@validation-rules/react` owns React provider scope, hooks, controlled-field helpers, lifecycle-safe policy registration, and accessible messages.
- The Portal launches documentation and every complete showcase application.
- The Angular showcase covers ngModel, Reactive Forms, NgRx, NGXS, Akita, Elf, RxAngular State, Signals, custom RxJS store workflows, and multiple UI strategies.
- The React showcase covers Local State, Redux Toolkit, Zustand, Jotai, Recoil, MobX, Context API, and generated performance forms.

## Where to go next

Start with [Installation & Quick Start](/docs/getting-started), then read [Policies & Rules](/docs/policies-and-rules). Use the live showcases whenever you want to see a concept in a running application.
