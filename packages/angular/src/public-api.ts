/*
 * Public API surface of the Validation Rules Engine Angular adapter.
 */

export * from './lib/validation.module';
export {
  ValidationPolicy,
  ValidationModel,
  Validator,
  ValidationHelper,
  ValidatorHelper,
  ValidationError,
  ValidationResult,
  RequiredResult,
  FormGroupStatus,
  PolicyGroupConfig,
  ControlType,
  clearTouchedFieldsForPrefix
} from '@validation-rules-engine/core';
export { ValidationProviderService } from './lib/services/validation-provider.service';
export { ValidatorDirective } from './lib/directives/validator.directive';
export { Policy } from './lib/policy';
export {
  ValidationDisplayConfig,
  ValidationDisplayStrategy,
  ValidationDisplayContext,
  ValidationDisplayClassMap,
  CompleteValidationDisplayClassMap,
  ValidationDisplayPresetId,
  ValidationDisplaySetupOptions,
  RequiredIndicatorConfig,
  RequiredIndicatorMode,
  defineValidationDisplayClasses
} from './lib/interfaces/validation-display.interface';
export { VALIDATION_DISPLAY_CONFIG } from './lib/tokens/validation-display.token';
export { VALIDATION_DISPLAY_STRATEGY } from './lib/tokens/validation-display-strategy.token';
export { AbstractValidationDisplayStrategy } from './lib/display/abstract-validation-display.strategy';
export {
  POLICY_VALIDATION_DOM,
  GENERIC_DISPLAY_CLASSES,
  BOOTSTRAP_DISPLAY_CLASSES,
  TAILWIND_DISPLAY_CLASSES,
  MATERIAL_DISPLAY_CLASSES,
  DEFAULT_REQUIRED_MARKER,
  DEFAULT_ERROR_ELEMENT_TAG
} from './lib/display/validation-display.constants';
export {
  mergeDisplayClasses,
  resolveValidationDisplayConfig,
  resolveRequiredIndicator,
  getResolvedClassMap,
  BOOTSTRAP_REQUIRED_INDICATOR,
  BOOTSTRAP_TOOLTIP_REQUIRED_INDICATOR,
  DEFAULT_REQUIRED_INDICATOR
} from './lib/display/validation-display.config-resolver';
export { createValidationDisplayStrategy } from './lib/display/validation-display.factory';
export {
  provideValidationDisplay,
  provideBootstrapValidationDisplay,
  provideMaterialValidationDisplay,
  provideTailwindValidationDisplay,
  provideGenericValidationDisplay,
  provideAutoValidationDisplay,
  provideCustomValidationDisplay
} from './lib/providers/validation-display.providers';
export { BootstrapValidationDisplayStrategy } from './lib/strategies/bootstrap-validation-display.strategy';
export { MaterialValidationDisplayStrategy } from './lib/strategies/material-validation-display.strategy';
export { TailwindValidationDisplayStrategy } from './lib/strategies/tailwind-validation-display.strategy';
export { GenericValidationDisplayStrategy } from './lib/strategies/generic-validation-display.strategy';
export { DefaultValidationDisplayStrategy } from './lib/strategies/default-validation-display.strategy';
export { PrimeNgValidationDisplayStrategy, PRIME_NG_DISPLAY_CLASSES } from './lib/display/examples/prime-ng-display.example';
export { ValidationSummaryComponent } from './lib/components/validation-summary.component';
export { ValidationGroupStatusComponent } from './lib/components/validation-group-status.component';
export { ValidationGroupSummaryComponent } from './lib/components/validation-group-summary.component';
export { ValidationPolicyGroupStatusComponent } from './lib/components/validation-policy-group-status.component';
export { ValidationPolicyGroupSummaryComponent } from './lib/components/validation-policy-group-summary.component';
