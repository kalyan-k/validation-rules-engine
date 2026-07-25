# React Troubleshooting

## Hook reports a missing provider

Render the component under `ValidationRulesProvider`. Portals retain context; separately mounted React roots need their own provider.

## Policy has not been registered

Check `policyNames` spelling and keep it consistent with the registration name. Validation triggered during the initial render is too early because hook registration happens in an effect; trigger it from an event or later effect.

## Errors never appear

Confirm the policy contains the exact property path. Inline messages use `visibleErrors`, which require blur/touch or submit show-all state. Inspect `errors` to distinguish visibility from rule execution.

## Controlled input does not update

Use `inputProps` for value-based controls and `checkboxProps` for booleans. For a component that passes a raw value instead of a DOM event, call `form.setFieldValue` explicitly.

## Number validation receives a string

Add a `parse` option or custom change callback. HTML number inputs still emit string values.

## Conditional error remains after hiding a field

Run field/form validation after the dependency changes, or clear the hidden path. Reset always clears validation state.

## Dynamic row uses the wrong error

Regenerate policy/group paths after add, remove, or reorder. Use stable React item keys. Clear obsolete prefixes before shifting indices when preserving pre-existing errors matters.

## Duplicate errors in development

The engine deduplicates path/message pairs and registration is Strict Mode-safe. If duplicates remain, check that application code does not render the same error list twice or call multiple independent engines against one model.

## Async result overwrites new input

Built-in field tokens ignore older adapter runs. Ensure the async rule returns its promise or observable-like value; a detached async callback cannot participate in ordering.

## Server rendering fails

Do not execute browser-only showcase code in the server bundle. The adapter itself is import-safe. Keep validation events/effects on the client or use core/domain validation on the server.
