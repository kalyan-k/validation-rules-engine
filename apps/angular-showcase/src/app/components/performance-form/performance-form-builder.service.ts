import { Injectable } from '@angular/core';
import { clearTouchedFieldsForPrefix, ValidationProviderService } from '@validation-rules/angular';
import {
  PerformanceControlType,
  PerformanceFieldDef,
  PerformanceFormModel,
  PerformanceMetrics,
  PerformanceSectionMeta
} from '../../models/performance-form.model';
import { PerformanceSectionValidationPolicy } from './performance-form.validation.policy';

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

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 4294967296;
  }

  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

export interface PerformanceBuildResult {
  sectionMetas: PerformanceSectionMeta[];
  policyNames: string[];
  groupNames: string[];
  metrics: PerformanceMetrics;
}

@Injectable()
export class PerformanceFormBuilderService {
  private activePolicyNames: string[] = [];
  private activeGroupNames: string[] = [];

  constructor(private validationProvider: ValidationProviderService) {}

  getActivePolicyNames(): string[] {
    return [...this.activePolicyNames];
  }

  teardown(): void {
    this.activePolicyNames.forEach((name) => this.validationProvider.unregisterPolicy(name));
    this.activeGroupNames.forEach((name) => {
      this.validationProvider.unregisterFormGroupPolicy(name);
      delete this.validationProvider.formGroup[name];
    });
    this.validationProvider.unregisterPolicyGroup('performance');
    this.activePolicyNames = [];
    this.activeGroupNames = [];
  }

  build(model: PerformanceFormModel): PerformanceBuildResult {
    const start = performance.now();
    this.teardown();

    const sectionCount = Number(model.config.sectionCount);
    const controlsPerSection = Number(model.config.controlsPerSection);
    const random = new SeededRandom(model.config.seed);

    const sectionMetas: PerformanceSectionMeta[] = [];
    const policyNames: string[] = [];
    const groupNames: string[] = [];
    let totalValidators = 2;

    model.sections = {};

    for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
      const sectionId = `section${sectionIndex}`;
      const groupName = `perfSection${sectionIndex}`;
      const policyName = `PerfSection${sectionIndex}`;
      const fields: PerformanceFieldDef[] = [];

      model.sections[sectionId] = {};

      let anchorTextPath: string | undefined;

      for (let fieldIndex = 0; fieldIndex < controlsPerSection; fieldIndex++) {
        const fieldId = `f${fieldIndex}`;
        const type = random.pick(CONTROL_TYPES);
        const propertyPath = `sections.${sectionId}.${fieldId}`;
        const label = `${this.formatControlLabel(type)} ${fieldIndex + 1}`;

        const field: PerformanceFieldDef = {
          id: fieldId,
          type,
          label,
          propertyPath,
          validateModel: `form.${propertyPath}`,
          elementId: `${sectionId}_${fieldId}`,
          groupName,
          policyName
        };

        switch (type) {
          case 'checkbox':
            model.sections[sectionId][fieldId] = false;
            break;
          case 'number':
            model.sections[sectionId][fieldId] = '';
            break;
          case 'select':
            field.selectOptions = [...SELECT_OPTIONS];
            model.sections[sectionId][fieldId] = '';
            break;
          case 'radio':
            field.radioOptions = [
              { value: 'a', label: 'Option A' },
              { value: 'b', label: 'Option B' },
              { value: 'c', label: 'Option C' }
            ];
            model.sections[sectionId][fieldId] = '';
            break;
          default:
            model.sections[sectionId][fieldId] = '';
        }

        if (type === 'text' && !anchorTextPath) {
          anchorTextPath = propertyPath;
        }

        fields.push(field);
      }

      const textareaField = fields.find((field) => field.type === 'textarea');
      if (textareaField && anchorTextPath) {
        textareaField.dependsOn = `${anchorTextPath}.length > 0`;
      } else if (fields.length > 1 && anchorTextPath) {
        const dependentField = fields[fields.length - 1];
        if (dependentField.type === 'text') {
          dependentField.dependsOn = `${anchorTextPath}.length > 0`;
        }
      }

      const sectionPolicy = new PerformanceSectionValidationPolicy(fields);
      const validatorList = sectionPolicy.addValidations(this.validationProvider.validatorHelper);
      totalValidators += validatorList.length;
      this.validationProvider.replacePolicy(policyName, sectionPolicy);
      this.validationProvider.registerFormGroupPolicy(groupName, policyName);

      policyNames.push(policyName);
      groupNames.push(groupName);

      sectionMetas.push({
        id: sectionId,
        title: `Section ${sectionIndex + 1}`,
        groupName,
        policyName,
        fields
      });
    }

    this.validationProvider.registerPolicyGroup('performance', {
      policies: policyNames,
      formGroups: groupNames
    });

    this.activePolicyNames = policyNames;
    this.activeGroupNames = groupNames;

    const generationMs = performance.now() - start;
    const totalControls = sectionCount * controlsPerSection;

    return {
      sectionMetas,
      policyNames,
      groupNames,
      metrics: {
        generatedAt: new Date().toISOString(),
        generationMs,
        renderMs: 0,
        totalSections: sectionCount,
        totalControls,
        totalValidators,
        estimatedDirectives: totalControls + 2,
        controlsPerSecond: totalControls / (generationMs / 1000 || 1)
      }
    };
  }

  fillSection(model: PerformanceFormModel, section: PerformanceSectionMeta): void {
    const data = model.sections[section.id];
    if (!data) {
      return;
    }

    const anchor = section.fields.find((field) => field.type === 'text' && !field.dependsOn);
    if (anchor) {
      data[anchor.id] = 'Sample text';
    }

    for (const field of section.fields) {
      if (field === anchor) {
        continue;
      }
      data[field.id] = this.sampleValueFor(field);
    }
  }

  fillAllSections(model: PerformanceFormModel, sections: PerformanceSectionMeta[]): void {
    sections.forEach((section) => this.fillSection(model, section));
  }

  clearSection(model: PerformanceFormModel, section: PerformanceSectionMeta): void {
    const data = model.sections[section.id];
    if (!data) {
      return;
    }

    for (const field of section.fields) {
      data[field.id] = this.emptyValueFor(field);
    }

    this.clearSectionValidationState(model, section);
  }

  clearAllSections(model: PerformanceFormModel, sections: PerformanceSectionMeta[]): void {
    sections.forEach((section) => {
      const data = model.sections[section.id];
      if (!data) {
        return;
      }

      for (const field of section.fields) {
        data[field.id] = this.emptyValueFor(field);
      }

      this.clearSectionValidationState(model, section);
    });
  }

  private emptyValueFor(field: PerformanceFieldDef): unknown {
    switch (field.type) {
      case 'checkbox':
        return false;
      case 'number':
        return '';
      default:
        return '';
    }
  }

  private clearSectionValidationState(
    model: PerformanceFormModel,
    section: PerformanceSectionMeta
  ): void {
    const prefix = `sections.${section.id}.`;

    if (model.validationResults?.length) {
      model.validationResults = model.validationResults.filter(
        (result) => !result.propertyName.startsWith(prefix)
      );
    }

    if (model.requiredResults?.length) {
      model.requiredResults = model.requiredResults.filter(
        (result) => !result.propertyName.startsWith(prefix)
      );
    }

    delete model[section.groupName];
    delete model.performance;

    clearTouchedFieldsForPrefix(model, prefix);

    if (this.validationProvider.hasPolicy(section.policyName)) {
      this.validationProvider.getPolicy(section.policyName).updateConditionalRequiredFields(model);
    }
    this.validationProvider.notifyValidationRefresh(model);
  }

  private sampleValueFor(field: PerformanceFieldDef): unknown {
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
      default:
        return '';
    }
  }

  private formatControlLabel(type: PerformanceControlType): string {
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
      default:
        return 'Field';
    }
  }
}
