import React, { useMemo, type PropsWithChildren } from 'react';
import { atom, RecoilRoot, selector, useRecoilState, useRecoilValue } from 'recoil';
import type { ValidationTarget } from '@validation-rules-engine/react';
import { cloneModel, countPopulatedValues, ShowcaseStateContext, type StateProviderProps } from '../types';

// Recoil 0.7 reads the React 18 dispatcher alias when deciding whether
// useSyncExternalStore is available. React 19 renamed that internal slot.
// This app-only bridge exposes precisely the two read-only shapes Recoil checks.
type ReactRuntime = typeof React & {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: {
    ReactCurrentDispatcher: { readonly current: unknown };
    ReactCurrentOwner: { readonly current: unknown };
  };
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H?: unknown };
};
const reactRuntime = React as ReactRuntime;
if (!reactRuntime.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  const clientInternals = reactRuntime.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  Object.defineProperty(reactRuntime, '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED', {
    configurable: true,
    value: {
      ReactCurrentDispatcher: { get current() { return clientInternals?.H; } },
      ReactCurrentOwner: { current: null }
    }
  });
}

const modelState = atom<ValidationTarget>({
  key: 'vreShowcaseModel',
  default: {},
  dangerouslyAllowMutability: true
});
const revisionState = atom({
  key: 'vreShowcaseRevision',
  default: 0
});
const populatedState = selector({
  key: 'vreShowcasePopulatedValues',
  get: ({ get }) => countPopulatedValues(get(modelState))
});

export function RecoilProvider({ initialModel, children }: StateProviderProps) {
  return (
    <RecoilRoot initializeState={({ set }) => set(modelState, cloneModel(initialModel))}>
      <RecoilBridge>{children}</RecoilBridge>
    </RecoilRoot>
  );
}

function RecoilBridge({ children }: PropsWithChildren) {
  const [model, setModelState] = useRecoilState(modelState);
  const [revision, setRevision] = useRecoilState(revisionState);
  const populatedValues = useRecoilValue(populatedState);
  const value = useMemo(() => ({
    model,
    revision,
    populatedValues,
    setModel(nextModel: ValidationTarget) {
      setModelState(nextModel);
      setRevision((current) => current + 1);
    },
    reset(nextModel: ValidationTarget) {
      setModelState(cloneModel(nextModel));
      setRevision((current) => current + 1);
    }
  }), [model, populatedValues, revision, setModelState, setRevision]);
  return <ShowcaseStateContext.Provider value={value}>{children}</ShowcaseStateContext.Provider>;
}
