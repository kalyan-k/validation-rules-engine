import {
  ValidatorHelper,
  type PolicyRegistration,
  type ValidationGroupRegistration,
  type ValidationPolicy,
  type ValidationTarget,
  type Validator
} from '@validation-rules/react';

export type PerformanceControlType =
  | 'text'
  | 'email'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'textarea'
  | 'radio';

export interface PerformanceConfig {
  sectionCount: number;
  controlsPerSection: number;
  seed: number;
}

export interface PerformanceFieldDefinition {
  id: string;
  type: PerformanceControlType;
  label: string;
  path: string;
  elementId: string;
  selectOptions?: readonly string[];
  radioOptions?: readonly { value: string; label: string }[];
  dependsOn?: string;
}

export interface PerformanceSectionDefinition {
  id: string;
  title: string;
  groupName: string;
  policyName: string;
  fields: PerformanceFieldDefinition[];
}

export type PerformanceStateModel = ValidationTarget & {
  config: PerformanceConfig;
  sections: Record<string, Record<string, unknown>>;
};

export interface PerformanceScenario {
  config: PerformanceConfig;
  model: PerformanceStateModel;
  sections: PerformanceSectionDefinition[];
  policies: PolicyRegistration[];
  policyNames: string[];
  groups: ValidationGroupRegistration[];
  metrics: {
    generatedAt: string;
    generationMs: number;
    totalSections: number;
    totalControls: number;
    totalValidators: number;
  };
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  sectionCount: 4,
  controlsPerSection: 20,
  seed: 42
};

export const PERFORMANCE_CONFIG_POLICY = 'react-performance-config';
export const PERFORMANCE_CONFIG_GROUP = 'reactPerformanceConfig';
export const PERFORMANCE_ALL_GROUP = 'reactPerformance';

const CONTROL_TYPES: PerformanceControlType[] = [
  'text',
  'email',
  'number',
  'date',
  'checkbox',
  'select',
  'textarea',
  'radio'
];
const SELECT_OPTIONS = ['Alpha', 'Beta', 'Gamma', 'Delta'];
const CONFIG_FIELDS = ['config.sectionCount', 'config.controlsPerSection'];

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 4294967296;
  }

  pick<TItem>(items: readonly TItem[]): TItem {
    return items[Math.floor(this.next() * items.length)] ?? items[0]!;
  }
}

export function createPerformanceScenario(config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG): PerformanceScenario {
  const startedAt = performance.now();
  const normalized = normalizeConfig(config);
  const random = new SeededRandom(normalized.seed);
  const model: PerformanceStateModel = { config: normalized, sections: {} };
  const sections: PerformanceSectionDefinition[] = [];
  const sectionPolicies: PolicyRegistration[] = [];
  const sectionGroups: ValidationGroupRegistration[] = [];
  let totalValidators = 2;

  for (let sectionIndex = 0; sectionIndex < normalized.sectionCount; sectionIndex += 1) {
    const sectionId = `section${sectionIndex}`;
    const groupName = `reactPerformanceSection${sectionIndex}`;
    const policyName = `ReactPerformanceSection${sectionIndex}`;
    const fields: PerformanceFieldDefinition[] = [];
    let anchorTextPath: string | undefined;

    model.sections[sectionId] = {};

    for (let fieldIndex = 0; fieldIndex < normalized.controlsPerSection; fieldIndex += 1) {
      const fieldId = `f${fieldIndex}`;
      const type = random.pick(CONTROL_TYPES);
      const path = `sections.${sectionId}.${fieldId}`;
      const field: PerformanceFieldDefinition = {
        id: fieldId,
        type,
        label: `${formatControlLabel(type)} ${fieldIndex + 1}`,
        path,
        elementId: `${sectionId}_${fieldId}`
      };

      if (type === 'select') field.selectOptions = SELECT_OPTIONS;
      if (type === 'radio') {
        field.radioOptions = [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
          { value: 'c', label: 'Option C' }
        ];
      }
      if (type === 'text' && !anchorTextPath) anchorTextPath = path;

      model.sections[sectionId][fieldId] = emptyValueFor(field);
      fields.push(field);
    }

    const textareaField = fields.find((field) => field.type === 'textarea');
    if (textareaField && anchorTextPath) {
      textareaField.dependsOn = `${anchorTextPath}.length > 0`;
    } else if (fields.length > 1 && anchorTextPath) {
      const dependentField = fields[fields.length - 1];
      if (dependentField?.type === 'text') dependentField.dependsOn = `${anchorTextPath}.length > 0`;
    }

    const policy = createSectionPolicy(fields);
    sectionPolicies.push({ name: policyName, policy });
    totalValidators += policy.addValidations(new ValidatorHelper()).length;

    sections.push({
      id: sectionId,
      title: `Section ${sectionIndex + 1}`,
      groupName,
      policyName,
      fields
    });
    sectionGroups.push({
      name: groupName,
      policies: [policyName],
      formGroups: [sectionId],
      fields: fields.map(({ path }) => path)
    });
  }

  const policyNames = [PERFORMANCE_CONFIG_POLICY, ...sectionPolicies.map(({ name }) => name)];
  const groups: ValidationGroupRegistration[] = [
    { name: PERFORMANCE_CONFIG_GROUP, policies: [PERFORMANCE_CONFIG_POLICY], formGroups: ['config'], fields: CONFIG_FIELDS },
    ...sectionGroups,
    {
      name: PERFORMANCE_ALL_GROUP,
      policies: sectionPolicies.map(({ name }) => name),
      formGroups: sections.map(({ id }) => id),
      fields: sections.flatMap(({ fields }) => fields.map(({ path }) => path))
    }
  ];

  return {
    config: normalized,
    model,
    sections,
    policies: [{ name: PERFORMANCE_CONFIG_POLICY, policy: configPolicy }, ...sectionPolicies],
    policyNames,
    groups,
    metrics: {
      generatedAt: new Date().toISOString(),
      generationMs: performance.now() - startedAt,
      totalSections: normalized.sectionCount,
      totalControls: normalized.sectionCount * normalized.controlsPerSection,
      totalValidators
    }
  };
}

export function createPerformanceModel(
  scenario: PerformanceScenario,
  valueFor: (field: PerformanceFieldDefinition, fieldIndex: number, sectionIndex: number) => unknown = emptyValueFor
): PerformanceStateModel {
  return {
    config: { ...scenario.config },
    sections: Object.fromEntries(
      scenario.sections.map((section, sectionIndex) => [
        section.id,
        Object.fromEntries(section.fields.map((field, fieldIndex) => [field.id, valueFor(field, fieldIndex, sectionIndex)]))
      ])
    )
  };
}

export function sampleValueFor(field: PerformanceFieldDefinition): unknown {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return 'Sample text';
    case 'email':
      return 'user@example.com';
    case 'number':
      return 42;
    case 'date':
      return '2024-06-15';
    case 'checkbox':
      return true;
    case 'select':
      return field.selectOptions?.[0] ?? 'Alpha';
    case 'radio':
      return field.radioOptions?.[0]?.value ?? 'a';
  }
}

export function emptyValueFor(field: PerformanceFieldDefinition): unknown {
  return field.type === 'checkbox' ? false : '';
}

export function parseIntegerInput(value: unknown): number | '' {
  return value === '' ? '' : Number(value);
}

export function normalizeConfig(config: PerformanceConfig): PerformanceConfig {
  return {
    sectionCount: Number(config.sectionCount),
    controlsPerSection: Number(config.controlsPerSection),
    seed: Number(config.seed)
  };
}

const configPolicy: ValidationPolicy = {
  addValidations(helper: ValidatorHelper): Validator[] {
    return [
      helper.validateFor('config.sectionCount')
        .isRequired('Number of sections is required')
        .isNumber('Enter a valid number')
        .range('Sections must be between 1 and 50', 1, 50, 'number'),
      helper.validateFor('config.controlsPerSection')
        .isRequired('Controls per section is required')
        .isNumber('Enter a valid number')
        .range('Controls per section must be between 1 and 200', 1, 200, 'number')
    ];
  }
};

function createSectionPolicy(fields: readonly PerformanceFieldDefinition[]): ValidationPolicy {
  return {
    addValidations(helper: ValidatorHelper): Validator[] {
      return fields.flatMap((field) => {
        const validator = field.dependsOn
          ? helper.validateFor(field.path, field.dependsOn)
          : helper.validateFor(field.path);

        switch (field.type) {
          case 'text':
          case 'textarea':
            return [validator.isRequired(`${field.label} is required`)];
          case 'email':
            return [validator.isRequired(`${field.label} is required`).isEmail('Enter a valid email address')];
          case 'number':
            return [validator.isRequired(`${field.label} is required`).isNumber('Enter a valid number')];
          case 'date':
            return [validator.isRequired(`${field.label} is required`).isDate('Enter a valid date')];
          case 'checkbox':
            return [validator.isChecked(`${field.label} must be checked`)];
          case 'select':
          case 'radio':
            return [validator.isRequired(`Please select a ${field.label.toLowerCase()}`)];
        }
      });
    }
  };
}

function formatControlLabel(type: PerformanceControlType): string {
  switch (type) {
    case 'text':
      return 'Text';
    case 'email':
      return 'Email';
    case 'number':
      return 'Number';
    case 'date':
      return 'Date';
    case 'checkbox':
      return 'Checkbox';
    case 'select':
      return 'Select';
    case 'textarea':
      return 'Textarea';
    case 'radio':
      return 'Radio';
  }
}
