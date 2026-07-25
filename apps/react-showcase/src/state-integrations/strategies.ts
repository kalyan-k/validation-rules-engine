import type { StrategyDefinition, StrategyId } from './types';
import { ContextStateProvider } from './providers/context-provider';
import { JotaiProvider } from './providers/jotai-provider';
import { LocalStateProvider } from './providers/local-state-provider';
import { MobxProvider } from './providers/mobx-provider';
import { RecoilProvider } from './providers/recoil-provider';
import { ReduxToolkitProvider } from './providers/redux-toolkit-provider';
import { ZustandProvider } from './providers/zustand-provider';

export const strategies: readonly StrategyDefinition[] = [
  {
    id: 'local-state',
    label: 'Local State',
    shortDescription: 'Component-owned state with no external runtime.',
    architecture: 'useState owns the form model while useReducer records explicit state transitions.',
    primitives: ['useState', 'useReducer', 'useMemo'],
    Provider: LocalStateProvider
  },
  {
    id: 'redux-toolkit',
    label: 'Redux Toolkit',
    shortDescription: 'Predictable global state with Redux developer tooling.',
    architecture: 'A configured store hosts a slice; actions replace or reset the model and selectors read model, revision, and derived data.',
    primitives: ['configureStore', 'createSlice', 'actions', 'selectors'],
    Provider: ReduxToolkitProvider
  },
  {
    id: 'zustand',
    label: 'Zustand',
    shortDescription: 'A compact external store with selector-based subscriptions.',
    architecture: 'A scoped vanilla store exposes model actions while React selectors subscribe to focused state.',
    primitives: ['createStore', 'useStore', 'selectors', 'actions'],
    Provider: ZustandProvider
  },
  {
    id: 'jotai',
    label: 'Jotai',
    shortDescription: 'Atomic state composition with dependency-aware derivation.',
    architecture: 'Primitive atoms hold the model and revision; a derived atom computes populated values.',
    primitives: ['atoms', 'derived atoms', 'Provider', 'useAtom'],
    Provider: JotaiProvider
  },
  {
    id: 'recoil',
    label: 'Recoil',
    shortDescription: 'Atom and selector-based state showcasenstrated for existing Recoil codebases.',
    architecture: 'A RecoilRoot initializes model atoms and a selector derives populated-value state.',
    primitives: ['RecoilRoot', 'atoms', 'selectors', 'useRecoilState'],
    Provider: RecoilProvider
  },
  {
    id: 'mobx',
    label: 'MobX',
    shortDescription: 'Observable state and action-oriented updates.',
    architecture: 'A route-scoped observable store exposes computed state and bound actions through an observer bridge.',
    primitives: ['makeAutoObservable', 'computed', 'actions', 'observer'],
    Provider: MobxProvider
  },
  {
    id: 'context',
    label: 'Context API',
    shortDescription: 'Built-in provider and consumer composition.',
    architecture: 'A dedicated Context Provider owns a reducer and a consumer bridge supplies the shared showcase contract.',
    primitives: ['createContext', 'Provider', 'Consumer hook', 'useReducer'],
    Provider: ContextStateProvider
  }
];

export function findStrategy(id: string): StrategyDefinition | undefined {
  return strategies.find((strategy) => strategy.id === id as StrategyId);
}
