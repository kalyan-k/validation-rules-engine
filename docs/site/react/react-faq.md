# React FAQ

## Is Local State the baseline React example?

Yes. The duplicate baseline routes were removed. Local State is the canonical baseline because it shows React-owned form state without an external library.

## Does the React adapter require a state library?

No. `@validation-rules-engine/react` works with Local State and can also bridge to Redux Toolkit, Zustand, Jotai, Recoil, MobX, and Context when an application already uses those tools.

## Can policies be shared with Angular?

Yes. Policies that import only Core contracts can be reused by Angular, React, and plain TypeScript callers such as the Vanilla Showcase.

## Who owns the form model?

The application owns the model. The React adapter reads the model, runs policies, writes validation metadata, and exposes helpers for field updates and reset flows.

## How do generated performance forms work?

The showcase generates sections, controls per section, seeded field types, policies, and groups from one metadata source. Changing the section count, controls per section, or random seed rebuilds the model and policy registrations.

## Is Recoil recommended for new applications?

The Recoil showcase exists for teams with existing Recoil codebases. For new projects, prefer an actively maintained state layer unless your platform has a specific reason to keep Recoil.
