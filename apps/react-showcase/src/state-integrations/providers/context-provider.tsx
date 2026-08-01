import { createContext, useCallback, useContext, useMemo, useReducer, type PropsWithChildren } from 'react';
import type { ValidationTarget } from '@validation-rules-engine/react';
import { cloneModel, countPopulatedValues, ShowcaseStateContext, type StateProviderProps } from '../types';

interface ContextState { model: ValidationTarget; revision: number; }
type ContextAction = { type: 'replace' | 'reset'; model: ValidationTarget };

const ValidationModelContext = createContext<{
  state: ContextState;
  dispatch: React.Dispatch<ContextAction>;
} | null>(null);

function reducer(state: ContextState, action: ContextAction): ContextState {
  return {
    model: action.type === 'reset' ? cloneModel(action.model) : action.model,
    revision: state.revision + 1
  };
}

export function ContextStateProvider({ initialModel, children }: StateProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialModel, (model) => ({ model: cloneModel(model), revision: 0 }));
  const providerValue = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <ValidationModelContext.Provider value={providerValue}>
      <ContextConsumerBridge>{children}</ContextConsumerBridge>
    </ValidationModelContext.Provider>
  );
}

function ContextConsumerBridge({ children }: PropsWithChildren) {
  const context = useContext(ValidationModelContext);
  if (!context) throw new Error('Context showcase consumer requires ContextStateProvider.');
  const setModel = useCallback((model: ValidationTarget) => context.dispatch({ type: 'replace', model }), [context]);
  const reset = useCallback((model: ValidationTarget) => context.dispatch({ type: 'reset', model }), [context]);
  const value = useMemo(() => ({
    model: context.state.model,
    revision: context.state.revision,
    populatedValues: countPopulatedValues(context.state.model),
    setModel,
    reset
  }), [context.state, reset, setModel]);
  return <ShowcaseStateContext.Provider value={value}>{children}</ShowcaseStateContext.Provider>;
}
