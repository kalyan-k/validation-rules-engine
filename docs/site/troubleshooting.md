# Troubleshooting

## A portal application remains in “Starting”

Read the prefixed application output in the terminal that launched `npm start` or `npm run portal`. The portal reports a failed child process without hiding its original output.

## A port is already in use

Stop the existing process or configure the corresponding `VRE_*_PORT` environment variable before launching the platform.

## A policy is not found

Confirm registration ran before validation and that the execution name matches registration. Policy names are case-insensitive internally, but stable casing improves diagnostics.

## Validation runs but no messages appear

Check whether the application requested `showAllErrors`, whether a control is touched, and whether the selected display strategy can find the intended host element.

## A group status does not update

Register the form-group mapping, use matching group names, and execute validation with group evaluation enabled.

## The showcase cannot resolve a local package

Build packages first with `npm run build:packages`. Portal startup does this automatically.

## Reports are missing

Run `npm run test:reports`. Use `npm run reports:clean` only when stale generated output needs to be removed.

## Chrome cannot start in CI

Use the CI test command so Karma selects the no-sandbox `ChromeHeadlessCI` launcher. Large Angular showcase coverage also needs a larger Node heap (`NODE_OPTIONS=--max-old-space-size=8192`); without it the instrumented webpack build can exit before writing `reports/showcases/angular/**`.
