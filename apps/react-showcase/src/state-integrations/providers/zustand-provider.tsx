import { useMemo, useState } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { ValidationTarget } from '@validation-rules/react';
import { cloneModel, countPopulatedValues, ShowcaseStateContext, type StateProviderProps } from '../types';

interface ZustandShowcaseState {
  model: ValidationTarget;
  revision: number;
  replaceModel(nextModel: ValidationTarget): void;
  resetModel(nextModel: ValidationTarget): void;
}

function createShowcaseStore(initialModel: ValidationTarget) {
  return createStore<ZustandShowcaseState>((set) => ({
    model: cloneModel(initialModel),
    revision: 0,
    replaceModel: (model) => set((state) => ({ model, revision: state.revision + 1 })),
    resetModel: (model) => set((state) => ({ model: cloneModel(model), revision: state.revision + 1 }))
  }));
}

export function ZustandProvider({ initialModel, children }: StateProviderProps) {
  const [store] = useState(() => createShowcaseStore(initialModel));
  const model = useStore(store, (state) => state.model);
  const revision = useStore(store, (state) => state.revision);
  const replaceModel = useStore(store, (state) => state.replaceModel);
  const resetModel = useStore(store, (state) => state.resetModel);
  const value = useMemo(() => ({
    model,
    revision,
    populatedValues: countPopulatedValues(model),
    setModel: replaceModel,
    reset: resetModel
  }), [model, replaceModel, resetModel, revision]);
  return <ShowcaseStateContext.Provider value={value}>{children}</ShowcaseStateContext.Provider>;
}
