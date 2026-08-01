import { createContext, useContext, type ComponentType, type PropsWithChildren } from 'react';
import type { ValidationTarget } from '@validation-rules-engine/react';

export const strategyIds = [
  'local-state',
  'redux-toolkit',
  'zustand',
  'jotai',
  'recoil',
  'mobx',
  'context'
] as const;

export type StrategyId = typeof strategyIds[number];
export type StateShowcasePage = 'home' | 'simple' | 'complex' | 'performance';

export interface StateProviderProps extends PropsWithChildren {
  initialModel: ValidationTarget;
}

export interface ShowcaseStateValue<TModel extends ValidationTarget = ValidationTarget> {
  model: TModel;
  revision: number;
  populatedValues: number;
  setModel(nextModel: TModel): void;
  reset(nextModel: TModel): void;
}

export interface StrategyDefinition {
  id: StrategyId;
  label: string;
  shortDescription: string;
  architecture: string;
  primitives: readonly string[];
  Provider: ComponentType<StateProviderProps>;
}

export const ShowcaseStateContext = createContext<ShowcaseStateValue | null>(null);

export function useShowcaseState<TModel extends ValidationTarget>(): ShowcaseStateValue<TModel> {
  const value = useContext(ShowcaseStateContext);
  if (!value) throw new Error('State-managed showcase pages must be rendered inside a strategy provider.');
  return value as ShowcaseStateValue<TModel>;
}

export function countPopulatedValues(value: unknown): number {
  if (Array.isArray(value)) return value.reduce<number>((total, item) => total + countPopulatedValues(item), 0);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .reduce<number>((total, item) => total + countPopulatedValues(item), 0);
  }
  return value === true || (typeof value === 'string' && value.trim().length > 0) || typeof value === 'number' ? 1 : 0;
}

export function cloneModel<TModel extends ValidationTarget>(model: TModel): TModel {
  return typeof structuredClone === 'function'
    ? structuredClone(model)
    : JSON.parse(JSON.stringify(model)) as TModel;
}
