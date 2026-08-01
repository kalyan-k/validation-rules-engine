# Architecture

Validation Rules Engine (VRE) separates publishable validation packages from private documentation and showcase applications. `@validation-rules-engine/core`, `@validation-rules-engine/angular`, and `@validation-rules-engine/react` are publishable packages; the portal, docs, Angular showcase, and React showcase are private applications.

## Dependency direction

```text
Angular showcase → @validation-rules-engine/angular → @validation-rules-engine/core
React showcase → @validation-rules-engine/react → @validation-rules-engine/core
```

Core cannot import Angular. The Angular adapter consumes core through its public entry point. Showcase applications consume their adapter package rather than source files.

Core cannot import React either, Angular cannot depend on React, and React cannot depend on Angular. The React adapter consumes core contracts/rules and owns its engine, hooks, context, lifecycle, subscriptions, and components.

## Application platform

```text
Portal
├── Documentation
├── Angular Showcase
└── React Showcase
```

The framework-neutral Portal owns a registry of independent applications. Each entry supplies a start script, URL, health URL, description, and documentation link. Startup and status UI are generated from this registry.

Repository-level Playwright automation under `tests/e2e` exercises those applications through public URLs. Playwright configuration, server orchestration, and portal report manifests live under `playwright/`. Generated HTML/JSON/JUnit artifacts and the portal Automation Testing summary are excluded from Playwright E2E coverage.

## Shared application shell

`tools/platform-shell` owns the framework-neutral product header, navigation, footer, layout tokens, breadcrumbs, page headings, action bars, card rhythm, and responsive breakpoints. It is distributed as static JavaScript and CSS, so the Node, Angular, Angular Material, Bootstrap, and Tailwind surfaces can share the product chrome without sharing application runtime state.

The global navigation is deliberately compact: Home, Docs, Showcases, Reports, and GitHub. Docs, Showcases, and Reports are keyboard-accessible menus that expose documentation sections, independently hosted applications, and report destinations without crowding the top level. Each application identifies itself to the shell so its global destination is highlighted while its framework-specific controls remain inside the application.

The shell logo, favicon, application icons, and web manifest also live in `tools/platform-shell`. Every browser surface preloads the shared stylesheet and loads the shell definition before application scripts, which reserves the header space and prevents unstyled navigation from flashing during startup. Node applications serve these immutable shell assets with short cache headers, while Angular builds copy the same asset directory.

Persistent reports use `tools/testing/report-branding.cjs` to instantiate the exact shared application shell. The dashboard is a single report workspace: collapsible Packages and Showcase Applications groups select Core, Angular Adapter, React Adapter, Angular Showcase, or React Showcase; Summary, Tests, and Coverage tabs change the right-hand pane without opening extra browser tabs. Direct test and coverage pages retain branded wrappers, while raw Istanbul HTML remains untouched so coverage data and source highlighting are preserved.

## Why applications stay independent

Applications communicate through URLs, not shared runtime state. One showcase can fail or restart without changing another. Framework dependencies remain inside their owning showcase.

## Build order

1. Build `@validation-rules-engine/core`.
2. Build `@validation-rules-engine/angular`.
3. Build `@validation-rules-engine/react`.
4. Build Node portal and documentation applications.
5. Build Angular and React showcase applications.

## Adding a future showcase

Implement a complete application under `apps/`, add its Angular or Node build target, add a root start script, and register it in the portal. Add architecture verification and independent tests before displaying it as available.

Do not scaffold placeholder adapters. The portal may describe future directions as roadmap items, but packages and showcase directories should correspond to real implementations.
