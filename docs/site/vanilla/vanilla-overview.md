# Vanilla Showcase

The Vanilla Showcase is a private TypeScript + Vite application that consumes `@validation-rules-engine/core` directly. It proves the engine works without Angular or React adapters: policies, nested paths, validation groups, summaries, and large generated forms all run against plain DOM controls.

There is no `@validation-rules-engine/vanilla` package. Adapter packages remain the supported path for Angular and React applications. Use Vanilla when you want Core-only validation in a framework-free UI, or when you are learning the engine before adopting an adapter.

## What it demonstrates

| Route | Purpose |
| --- | --- |
| `/showcases/vanilla/` | Showcase home and entry points |
| `/showcases/vanilla/simple` | Single policy, simple fields, inline messages |
| `/showcases/vanilla/complex` | Nested model, multiple policies, validation groups |
| `/showcases/vanilla/performance` | Generated large form with measured validation |

Local multi-host URL: [http://127.0.0.1:4205/](http://127.0.0.1:4205/)

## Relationship to Core and adapters

```text
Vanilla Showcase → @validation-rules-engine/core
Angular Showcase → @validation-rules-engine/angular → core
React Showcase → @validation-rules-engine/react → core
```

Policies that import only Core contracts can be shared across Vanilla, Angular, and React. The showcase owns its small DOM helpers and a lightweight `ValidationEngine` wrapper around Core validators; that showcase code is not a publishable adapter.

## Where to go next

- [Vanilla Quick Start](/docs/vanilla-quick-start)
- [Vanilla Examples](/docs/vanilla-examples)
- [Core Quick Start](/docs/core-quick-start)
- [Open Portal](http://127.0.0.1:4200/)
