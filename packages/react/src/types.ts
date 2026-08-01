import type { PolicyGroupConfig, RequiredResult, ValidationModel, ValidationPolicy, ValidationResult } from '@validation-rules-engine/core';

export type ValidationTarget = ValidationModel & Record<string, unknown>;

export interface PolicyRegistration { name: string; policy: ValidationPolicy; }

export interface ValidationGroupRegistration extends PolicyGroupConfig {
  name: string;
  fields?: string[];
}

export interface ValidationSnapshot {
  revision: number;
  errors: ValidationResult[];
  requiredResults: RequiredResult[];
  isValid: boolean;
}

export interface ValidationRulesConfiguration {
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export interface ValidateOptions { showAllErrors?: boolean; group?: string; }

export interface UseValidationRulesOptions<TModel extends ValidationTarget> {
  model: TModel;
  policies?: PolicyRegistration[];
  policyNames?: string[];
  groups?: ValidationGroupRegistration[];
}

export interface UseValidationFormOptions<TModel extends ValidationTarget>
  extends Omit<UseValidationRulesOptions<TModel>, 'model'> {
  initialModel: TModel | (() => TModel);
}

export interface ValidationFieldOptions<TValue = unknown> {
  id?: string;
  messageId?: string;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  parse?: (value: unknown) => TValue;
}

export type ValidationSubmitHandler<TModel extends ValidationTarget> = (
  model: TModel,
  snapshot: ValidationSnapshot
) => void | Promise<void>;
