import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  useValidationRules,
  useValidationRulesContext,
  type UseValidationFormResult,
  type UseValidationRulesOptions,
  type ValidationSnapshot,
  type ValidationSubmitHandler,
  type ValidationTarget
} from '@validation-rules-engine/react';
import { cloneModel, useShowcaseState } from './types';

type ManagedValidationFormOptions<TModel extends ValidationTarget> =
  Omit<UseValidationRulesOptions<TModel>, 'model'> & { initialModel: TModel };

export function useManagedValidationForm<TModel extends ValidationTarget>(
  options: ManagedValidationFormOptions<TModel>
): UseValidationFormResult<TModel> {
  const { engine } = useValidationRulesContext();
  const store = useShowcaseState<TModel>();
  const initialModel = useRef<TModel | null>(null);
  initialModel.current ??= cloneModel(options.initialModel);
  const [dirtyFields, setDirtyFields] = useState<ReadonlySet<string>>(() => new Set());
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const validation = useValidationRules({
    model: store.model,
    policies: options.policies,
    policyNames: options.policyNames,
    groups: options.groups
  });

  const setFieldValue = useCallback(async (propertyPath: string, value: unknown, validate = false) => {
    const nextModel = setPropertyValue(store.model, propertyPath, value);
    store.setModel(nextModel);
    setDirtyFields((current) => new Set(current).add(propertyPath));
    if (validate) return engine.validateField(nextModel, propertyPath, optionsRef.current.policyNames);
    return undefined;
  }, [engine, store]);

  const setModel = useCallback((nextModel: TModel) => {
    store.setModel(nextModel);
    engine.notify(nextModel);
  }, [engine, store]);

  const touchField = useCallback((propertyPath: string) => engine.touch(store.model, propertyPath), [engine, store.model]);

  const reset = useCallback((nextModel?: TModel) => {
    engine.clear(store.model);
    store.reset(cloneModel(nextModel ?? initialModel.current as TModel));
    setDirtyFields(new Set());
  }, [engine, store]);

  const handleSubmit = useCallback((
    onValid: ValidationSubmitHandler<TModel>,
    onInvalid?: ValidationSubmitHandler<TModel>
  ) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const snapshot = await engine.validate(store.model, optionsRef.current.policyNames, { showAllErrors: true });
    if (snapshot.isValid) await onValid(store.model, snapshot);
    else await onInvalid?.(store.model, snapshot);
  }, [engine, store.model]);

  return useMemo(() => ({
    ...validation,
    dirtyFields,
    setFieldValue,
    setModel,
    touchField,
    reset,
    handleSubmit
  }), [dirtyFields, handleSubmit, reset, setFieldValue, setModel, touchField, validation]);
}

function setPropertyValue<TModel extends ValidationTarget>(model: TModel, propertyPath: string, value: unknown): TModel {
  const segments = propertyPath.replace(/\[(\d+)\]/gu, '.$1').split('.').filter(Boolean);
  return setAtPath(model, segments, value) as TModel;
}

function setAtPath(source: unknown, segments: string[], value: unknown): unknown {
  if (segments.length === 0) return value;
  const [head = '', ...tail] = segments;
  const isArray = Array.isArray(source);
  const target = (isArray
    ? [...source]
    : { ...((source && typeof source === 'object' ? source : {}) as Record<string, unknown>) }) as Record<string | number, unknown>;
  const current = (source as Record<string, unknown> | undefined)?.[head];
  target[Number.isInteger(Number(head)) && isArray ? Number(head) : head] = setAtPath(current, tail, value);
  return target;
}

export type { ValidationSnapshot };
