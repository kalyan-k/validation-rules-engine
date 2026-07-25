export type PerformanceControlType =
  | 'text'
  | 'email'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'textarea'
  | 'radio';

export interface PerformanceFieldDef {
  id: string;
  type: PerformanceControlType;
  label: string;
  propertyPath: string;
  validateModel: string;
  elementId: string;
  groupName: string;
  policyName: string;
  selectOptions?: readonly string[];
  radioOptions?: readonly { value: string; label: string }[];
  dependsOn?: string;
}

export interface PerformanceSectionMeta {
  id: string;
  title: string;
  groupName: string;
  policyName: string;
  fields: PerformanceFieldDef[];
}

export interface PerformanceConfig {
  sectionCount: number | null;
  controlsPerSection: number | null;
  seed: number;
}

export interface PerformanceMetrics {
  generatedAt?: string;
  generationMs: number;
  renderMs: number;
  totalSections: number;
  totalControls: number;
  totalValidators: number;
  estimatedDirectives: number;
  lastValidateAllMs?: number;
  lastSubmitMs?: number;
  controlsPerSecond?: number;
}

export type PerformanceFormPhase =
  | 'idle'
  | 'validating-config'
  | 'building'
  | 'rendering'
  | 'validating'
  | 'complete'
  | 'failed';

export interface PerformanceRenderProgress {
  phase: 'building' | 'rendering';
  message: string;
  percent: number;
  sectionsTotal: number;
  sectionsComplete: number;
  currentSection: number;
  fieldsInSection: number;
  fieldsRenderedInSection: number;
  controlsRendered: number;
  controlsTotal: number;
}

export interface PerformanceFormGroupStatus {
  isValid: boolean;
  isInValid: boolean;
  isEvaluated?: boolean;
  errors?: Array<{ propertyName: string; error: { message: string } }>;
}

export class PerformanceFormModel {
  config: PerformanceConfig = {
    sectionCount: null,
    controlsPerSection: null,
    seed: 42
  };

  sections: Record<string, Record<string, unknown>> = {};

  validationResults?: Array<{ propertyName: string; error: { message: string } }>;
  requiredResults?: Array<{ propertyName: string; isRequired: boolean; hasRequiredError: boolean }>;
  perfConfig?: PerformanceFormGroupStatus;
  performance?: PerformanceFormGroupStatus;

  [groupName: string]: unknown;
}
