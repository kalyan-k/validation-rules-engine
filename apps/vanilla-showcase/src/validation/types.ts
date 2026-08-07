import type {
  PolicyGroupConfig,
  RequiredResult,
  ValidationModel,
  ValidationPolicy,
  ValidationResult
} from '@validation-rules-engine/core';

export type ValidationTarget = ValidationModel & Record<string, unknown>;

export interface PolicyRegistration {
  name: string;
  policy: ValidationPolicy;
}

export interface ValidationGroupRegistration extends PolicyGroupConfig {
  name: string;
  policies: string[];
  formGroups: string[];
  fields?: string[];
}

export interface ValidationSnapshot {
  revision: number;
  errors: ValidationResult[];
  requiredResults: RequiredResult[];
  isValid: boolean;
}

export interface ValidateOptions {
  showAllErrors?: boolean;
  group?: string;
}
