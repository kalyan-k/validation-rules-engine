import {
  clearTouchedFieldsForPrefix,
  getValidationMeta,
  isValidationFailure,
  markFieldTouched,
  resetValidationMeta,
  type RequiredResult,
  type ValidationPolicy,
  type ValidationResult,
  type Validator,
  ValidatorHelper
} from '@validation-rules-engine/core';
import type { ValidateOptions, ValidationGroupRegistration, ValidationSnapshot, ValidationTarget } from './types';
import { getPropertyValue } from './paths';

interface PolicyEntry {
  displayName: string;
  validators: Validator[];
  owners: Set<symbol>;
}

interface RuleOutcome {
  path: string;
  required: boolean;
  failure?: ValidationResult;
}

interface ObservableLike {
  subscribe(observer: {
    next(value: unknown): void;
    error(error: unknown): void;
    complete(): void;
  }): { unsubscribe?(): void } | (() => void) | void;
}

export class ValidationEngine {
  private readonly validatorHelper = new ValidatorHelper();
  private readonly policies = new Map<string, PolicyEntry>();
  private readonly groups = new Map<string, ValidationGroupRegistration>();
  private readonly listeners = new WeakMap<object, Set<() => void>>();
  private readonly revisions = new WeakMap<object, number>();
  private readonly fieldRuns = new WeakMap<object, Map<string, number>>();

  registerPolicy(name: string, policy: ValidationPolicy): () => void {
    const key = normalizeName(name);
    const owner = Symbol(name);
    const existing = this.policies.get(key);
    if (existing) {
      existing.owners.add(owner);
    } else {
      this.policies.set(key, {
        displayName: name,
        validators: policy.addValidations(this.validatorHelper),
        owners: new Set([owner])
      });
    }
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const entry = this.policies.get(key);
      entry?.owners.delete(owner);
      if (entry?.owners.size === 0) this.policies.delete(key);
    };
  }

  replacePolicy(name: string, policy: ValidationPolicy): void {
    const key = normalizeName(name);
    const existing = this.policies.get(key);
    this.policies.set(key, {
      displayName: name,
      validators: policy.addValidations(this.validatorHelper),
      owners: existing?.owners ?? new Set([Symbol(name)])
    });
  }

  unregisterPolicy(name: string): void {
    this.policies.delete(normalizeName(name));
  }

  hasPolicy(name: string): boolean {
    return this.policies.has(normalizeName(name));
  }

  registerGroup(group: ValidationGroupRegistration): () => void {
    const key = normalizeName(group.name);
    this.groups.set(key, {
      ...group,
      policies: [...group.policies],
      formGroups: [...group.formGroups],
      fields: group.fields ? [...group.fields] : undefined
    });
    return () => {
      if (this.groups.get(key)?.name === group.name) this.groups.delete(key);
    };
  }

  unregisterGroup(name: string): void {
    this.groups.delete(normalizeName(name));
  }

  subscribe(model: ValidationTarget, listener: () => void): () => void {
    let modelListeners = this.listeners.get(model);
    if (!modelListeners) {
      modelListeners = new Set();
      this.listeners.set(model, modelListeners);
    }
    modelListeners.add(listener);
    return () => modelListeners?.delete(listener);
  }

  getRevision(model: ValidationTarget): number {
    return this.revisions.get(model) ?? 0;
  }

  getSnapshot(model: ValidationTarget): ValidationSnapshot {
    const errors = [...(model.validationResults ?? [])];
    return {
      revision: this.getRevision(model),
      errors,
      requiredResults: [...(model.requiredResults ?? [])],
      isValid: errors.length === 0
    };
  }

  getErrors(model: ValidationTarget, propertyPath?: string): ValidationResult[] {
    const errors = model.validationResults ?? [];
    return propertyPath ? errors.filter((result) => result.propertyName === propertyPath) : [...errors];
  }

  isPathRequired(model: ValidationTarget, path: string, policyNames?: string[]): boolean {
    return this.resolveValidators(policyNames, false).some((validator) =>
      validator.propertyName === path
      && this.dependencySatisfied(model, validator.dependency as unknown)
      && validator.validatorsToRun.some((rule) => rule.checkIsRequired)
    );
  }

  refreshGroupStatuses(model: ValidationTarget): void {
    for (const group of this.groups.values()) this.updateGroupStatus(model, group);
  }

  async validate(
    model: ValidationTarget,
    policyNames?: string[],
    options: ValidateOptions = {}
  ): Promise<ValidationSnapshot> {
    const group = options.group ? this.groups.get(normalizeName(options.group)) : undefined;
    const names = group?.policies ?? policyNames;
    const validators = this.resolveValidators(names)
      .filter((validator) => !group?.fields || group.fields.includes(validator.propertyName ?? ''));
    if (options.showAllErrors) getValidationMeta(model).showAllErrors = true;
    await this.validateValidators(model, validators);
    if (group) this.updateGroupStatus(model, group);
    else if (options.showAllErrors) this.refreshGroupStatuses(model);
    return this.getSnapshot(model);
  }

  async validateField(
    model: ValidationTarget,
    propertyPath: string,
    policyNames?: string[]
  ): Promise<ValidationSnapshot> {
    const validators = this.resolveValidators(policyNames)
      .filter((validator) => validator.propertyName === propertyPath);
    await this.validateValidators(model, validators, [propertyPath]);
    this.refreshEvaluatedGroupsForPath(model, propertyPath);
    return this.getSnapshot(model);
  }

  validateGroup(model: ValidationTarget, groupName: string): Promise<ValidationSnapshot> {
    if (!this.groups.has(normalizeName(groupName))) {
      return Promise.reject(new Error(`Validation group '${groupName}' has not been registered`));
    }
    return this.validate(model, undefined, { group: groupName, showAllErrors: true });
  }

  touch(model: ValidationTarget, propertyPath: string): void {
    markFieldTouched(model, propertyPath);
    this.emit(model);
  }

  clear(model: ValidationTarget, propertyPaths?: string[]): void {
    if (!propertyPaths?.length) {
      delete model.validationResults;
      delete model.requiredResults;
      resetValidationMeta(model);
      for (const group of this.groups.values()) delete model[group.name];
      this.emit(model);
      return;
    }

    const paths = new Set(propertyPaths);
    const errors = (model.validationResults ?? []).filter((result) => !paths.has(result.propertyName));
    const required = (model.requiredResults ?? []).filter((result) => !paths.has(result.propertyName));
    if (errors.length) model.validationResults = errors; else delete model.validationResults;
    if (required.length) model.requiredResults = required; else delete model.requiredResults;
    propertyPaths.forEach((path) => clearTouchedFieldsForPrefix(model, path));
    this.emit(model);
  }

  notify(model: ValidationTarget): void {
    this.emit(model);
  }

  private resolveValidators(policyNames?: string[], required = true): Validator[] {
    const entries = policyNames?.length
      ? policyNames.flatMap((name) => {
          const entry = this.policies.get(normalizeName(name));
          if (!entry) {
            if (required) throw new Error(`Policy named '${name}' has not been registered`);
            return [];
          }
          return [entry];
        })
      : [...this.policies.values()];
    return entries.flatMap(({ validators }) => validators);
  }

  private async validateValidators(model: ValidationTarget, validators: Validator[], explicitPaths?: string[]): Promise<void> {
    const paths = [...new Set(explicitPaths ?? validators
      .map(({ propertyName }) => propertyName)
      .filter((path): path is string => !!path))];
    const runs = this.fieldRuns.get(model) ?? new Map<string, number>();
    this.fieldRuns.set(model, runs);
    const tokens = new Map(paths.map((path) => {
      const token = (runs.get(path) ?? 0) + 1;
      runs.set(path, token);
      return [path, token] as const;
    }));

    const outcomes = await Promise.all(validators.flatMap((validator) => {
      const path = validator.propertyName;
      if (!path || !paths.includes(path) || !this.dependencySatisfied(model, validator.dependency as unknown)) return [];
      return validator.validatorsToRun.map((rule) => this.runRule(model, path, rule));
    }));
    const currentPaths = paths.filter((path) => runs.get(path) === tokens.get(path));
    if (currentPaths.length === 0) return;

    const current = new Set(currentPaths);
    const untouchedErrors = (model.validationResults ?? []).filter((result) => !current.has(result.propertyName));
    const failures = outcomes
      .filter((outcome): outcome is RuleOutcome & { failure: ValidationResult } => !!outcome.failure && current.has(outcome.path))
      .map(({ failure }) => failure);
    const nextErrors = deduplicateResults([...untouchedErrors, ...failures]);
    if (nextErrors.length) model.validationResults = nextErrors; else delete model.validationResults;

    const untouchedRequired = (model.requiredResults ?? []).filter((result) => !current.has(result.propertyName));
    const required: RequiredResult[] = currentPaths.flatMap((path) => {
      const relevant = outcomes.filter((outcome) => outcome.path === path && outcome.required);
      return relevant.length
        ? [{ propertyName: path, isRequired: true, hasRequiredError: relevant.some(({ failure }) => !!failure) }]
        : [];
    });
    const nextRequired = [...untouchedRequired, ...required];
    if (nextRequired.length) model.requiredResults = nextRequired; else delete model.requiredResults;
    this.emit(model);
  }

  private async runRule(
    model: ValidationTarget,
    path: string,
    rule: Validator['validatorsToRun'][number]
  ): Promise<RuleOutcome> {
    const value = getPropertyValue(model, path);
    if (rule.isOptional && rule.isNullOrEmpty(value)) return { path, required: rule.checkIsRequired };
    const result = await resolveRuleResult(rule.isValid.call(model, value as string, model));
    return {
      path,
      required: rule.checkIsRequired,
      failure: isValidationFailure(result) ? { propertyName: path, error: result } : undefined
    };
  }

  private dependencySatisfied(model: ValidationTarget, dependency: unknown): boolean {
    if (!dependency) return true;
    if (typeof dependency === 'function') return Boolean(dependency(model));
    if (typeof dependency !== 'string') return Boolean(dependency);
    const expression = dependency.trim();
    if (expression.startsWith('!')) return !getPropertyValue(model, expression.slice(1).trim());
    const comparison = /^([\w.[\]-]+)\s*(===|==|!==|!=)\s*(.+)$/u.exec(expression);
    if (comparison) {
      const actual = getPropertyValue(model, comparison[1] ?? '');
      const expected = parseLiteral(comparison[3] ?? '');
      return comparison[2]?.startsWith('!') ? actual !== expected : actual === expected;
    }
    return Boolean(getPropertyValue(model, expression));
  }

  private updateGroupStatus(model: ValidationTarget, group: ValidationGroupRegistration): void {
    const activePaths = group.fields ?? this.resolveValidators(group.policies)
      .filter((validator) => this.dependencySatisfied(model, validator.dependency as unknown))
      .map((validator) => validator.propertyName)
      .filter((path): path is string => !!path);
    const errors = (model.validationResults ?? []).filter(({ propertyName }) => activePaths.includes(propertyName));
    model[group.name] = { isValid: errors.length === 0, isInValid: errors.length > 0, isEvaluated: true, errors };
    this.emit(model);
  }

  private refreshEvaluatedGroupsForPath(model: ValidationTarget, path: string): void {
    for (const group of this.groups.values()) {
      const fields = group.fields ?? this.resolveValidators(group.policies)
        .map((validator) => validator.propertyName)
        .filter((candidate): candidate is string => !!candidate);
      if (!fields.includes(path)) continue;
      const status = model[group.name] as { isEvaluated?: boolean } | undefined;
      if (status?.isEvaluated) this.updateGroupStatus(model, group);
    }
  }

  private emit(model: ValidationTarget): void {
    this.revisions.set(model, this.getRevision(model) + 1);
    this.listeners.get(model)?.forEach((listener) => listener());
  }
}

function normalizeName(name: string): string {
  const normalized = name.trim().toLocaleLowerCase();
  if (!normalized) throw new Error('Policy and group names cannot be empty');
  return normalized;
}

function deduplicateResults(results: ValidationResult[]): ValidationResult[] {
  const seen = new Set<string>();
  return results.filter(({ propertyName, error }) => {
    const key = `${propertyName}\u0000${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseLiteral(value: string): unknown {
  const normalized = value.trim();
  if (/^(['"]).*\1$/u.test(normalized)) return normalized.slice(1, -1);
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  if (normalized === 'null') return null;
  const number = Number(normalized);
  return Number.isNaN(number) ? normalized : number;
}

function resolveRuleResult(result: unknown): Promise<unknown> {
  if (result && typeof (result as PromiseLike<unknown>).then === 'function') return Promise.resolve(result);
  if (result && typeof (result as ObservableLike).subscribe === 'function') {
    return new Promise((resolve, reject) => {
      let subscription: ReturnType<ObservableLike['subscribe']>;
      let settled = false;
      const finish = (value: unknown, error = false): void => {
        if (settled) return;
        settled = true;
        if (typeof subscription === 'function') subscription(); else subscription?.unsubscribe?.();
        if (error) reject(value); else resolve(value);
      };
      subscription = (result as ObservableLike).subscribe({
        next: (value) => finish(value),
        error: (error) => finish(error, true),
        complete: () => finish(undefined)
      });
    });
  }
  return Promise.resolve(result);
}
