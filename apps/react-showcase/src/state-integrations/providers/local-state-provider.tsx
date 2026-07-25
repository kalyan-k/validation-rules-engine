import { useCallback, useMemo, useReducer, useState } from 'react';
import { cloneModel, countPopulatedValues, ShowcaseStateContext, type StateProviderProps } from '../types';

export function LocalStateProvider({ initialModel, children }: StateProviderProps) {
  const [model, updateModel] = useState(() => cloneModel(initialModel));
  const [revision, advanceRevision] = useReducer((current: number) => current + 1, 0);
  const setModel = useCallback((nextModel: typeof initialModel) => {
    updateModel(nextModel);
    advanceRevision();
  }, []);
  const reset = useCallback((nextModel: typeof initialModel) => {
    updateModel(cloneModel(nextModel));
    advanceRevision();
  }, []);
  const value = useMemo(() => ({
    model,
    revision,
    populatedValues: countPopulatedValues(model),
    setModel,
    reset
  }), [model, reset, revision, setModel]);
  return <ShowcaseStateContext.Provider value={value}>{children}</ShowcaseStateContext.Provider>;
}
