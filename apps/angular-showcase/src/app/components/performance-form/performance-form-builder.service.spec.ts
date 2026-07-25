import { firstValueFrom } from 'rxjs';
import { ValidationProviderService, ValidatorHelper } from '@validation-rules/angular';
import { PerformanceFormModel, PerformanceFieldDef, PerformanceSectionMeta } from '../../models/performance-form.model';
import { PerformanceFormBuilderService } from './performance-form-builder.service';
import { PerformanceConfigValidationPolicy, PerformanceSectionValidationPolicy } from './performance-form.validation.policy';

describe('performance validation policies', () => {
  it('validates configuration required, numeric, and boundary rules', async () => {
    const service = new ValidationProviderService();
    service.register('PerformanceConfig', new PerformanceConfigValidationPolicy());
    const model = new PerformanceFormModel();

    await firstValueFrom(service.validateAll(model, 'PerformanceConfig'));
    expect(model.validationResults?.map((entry) => entry.propertyName)).toEqual([
      'config.sectionCount', 'config.controlsPerSection'
    ]);

    model.config.sectionCount = 51;
    model.config.controlsPerSection = 'bad' as any;
    await firstValueFrom(service.validateAll(model, 'PerformanceConfig'));
    expect(model.validationResults?.map((entry) => entry.error.message)).toEqual([
      'Sections must be between 1 and 50',
      'Enter a valid number',
      'Controls per section must be between 1 and 200'
    ]);

    model.config.sectionCount = 50;
    model.config.controlsPerSection = 200;
    await firstValueFrom(service.validateAll(model, 'PerformanceConfig'));
    expect(model.validationResults).toBeUndefined();
  });

  it('builds the correct validator chain for every generated control type', () => {
    const fields = allTypeFields();
    fields[0].dependsOn = 'sections.section0.anchor.length > 0';
    fields[6].dependsOn = 'sections.section0.anchor.length > 0';

    const validators = new PerformanceSectionValidationPolicy(fields)
      .addValidations(new ValidatorHelper());

    expect(validators.length).toBe(fields.length);
    expect(validators.map((validator) => validator.propertyName)).toEqual(fields.map((field) => field.propertyPath));
    expect(validators[0].dependency).toBe(fields[0].dependsOn as any);
    expect(validators[1].validatorsToRun.length).toBe(2);
    expect(validators[4].validatorsToRun[0].isValid(false as any)).toEqual({ message: 'Checkbox 5 must be checked' });
    expect(validators[5].validatorsToRun[0].isValid('')).toEqual({ message: 'Please select a select 6' });
    expect(validators[7].validatorsToRun[0].isValid('')).toEqual({ message: 'Please select a radio 8' });
  });
});

describe('PerformanceFormBuilderService', () => {
  let validationProvider: ValidationProviderService;
  let builder: PerformanceFormBuilderService;

  beforeEach(() => {
    validationProvider = new ValidationProviderService();
    builder = new PerformanceFormBuilderService(validationProvider);
  });

  it('builds deterministic sections, values, policies, groups, and metrics', () => {
    const model = new PerformanceFormModel();
    model.config = { sectionCount: 3, controlsPerSection: 20, seed: 123 };

    const first = builder.build(model);
    const firstTypes = first.sectionMetas.map((section) => section.fields.map((field) => field.type));
    const second = builder.build(model);

    expect(second.sectionMetas.map((section) => section.fields.map((field) => field.type))).toEqual(firstTypes);
    expect(second.sectionMetas.length).toBe(3);
    expect(second.sectionMetas[0]).toEqual(jasmine.objectContaining({
      id: 'section0', title: 'Section 1', groupName: 'perfSection0', policyName: 'PerfSection0'
    }));
    expect(second.sectionMetas[0].fields.every((field) => field.validateModel.startsWith('form.sections.section0.'))).toBeTrue();
    expect(second.metrics).toEqual(jasmine.objectContaining({
      totalSections: 3,
      totalControls: 60,
      totalValidators: 62,
      estimatedDirectives: 62
    }));
    expect(second.metrics.generatedAt).toBeDefined();
    expect(second.metrics.generationMs).toBeGreaterThanOrEqual(0);
    expect(second.metrics.controlsPerSecond).toBeGreaterThan(0);
    expect(validationProvider.hasPolicy('PerfSection0')).toBeTrue();
    expect(validationProvider.formGroupPolicies['perfSection0']).toBe('PerfSection0');
    expect(validationProvider.policyGroups['performance'].policies).toEqual(second.policyNames);
  });

  it('returns defensive active-name copies and tears down dynamic registrations', () => {
    const model = new PerformanceFormModel();
    model.config = { sectionCount: 2, controlsPerSection: 1, seed: 1 };
    builder.build(model);

    const names = builder.getActivePolicyNames();
    names.push('External');
    expect(builder.getActivePolicyNames()).toEqual(['PerfSection0', 'PerfSection1']);

    validationProvider.formGroup['perfSection0'] = ['sections.section0.f0'];
    builder.teardown();

    expect(validationProvider.hasPolicy('PerfSection0')).toBeFalse();
    expect(validationProvider.formGroupPolicies['perfSection0']).toBeUndefined();
    expect(validationProvider.formGroup['perfSection0']).toBeUndefined();
    expect(validationProvider.policyGroups['performance']).toBeUndefined();
    expect(builder.getActivePolicyNames()).toEqual([]);
    builder.teardown();
  });

  it('fills every field type with realistic values and honors missing sections', () => {
    const model = new PerformanceFormModel();
    const section = sectionWith(allTypeFields());
    model.sections['section0'] = {};

    builder.fillSection(model, section);

    expect(model.sections['section0']).toEqual({
      f0: 'Sample text',
      f1: 'user@example.com',
      f2: 42,
      f3: '2024-06-15',
      f4: true,
      f5: 'Alpha',
      f6: 'Sample text',
      f7: 'a'
    });

    const fallbackFields = allTypeFields();
    fallbackFields[5].selectOptions = undefined;
    fallbackFields[7].radioOptions = undefined;
    const fallback = sectionWith(fallbackFields, 'missing');
    model.sections['missing'] = {};
    builder.fillSection(model, fallback);
    expect(model.sections['missing']['f5']).toBe('Alpha');
    expect(model.sections['missing']['f7']).toBe('a');

    builder.fillSection(model, sectionWith(allTypeFields(), 'absent'));
    builder.fillAllSections(model, [section, fallback]);
  });

  it('clears section values and only that section validation state', () => {
    const model = new PerformanceFormModel();
    const section = sectionWith(allTypeFields());
    model.sections['section0'] = { f0: 'dirty', f4: true };
    model.validationResults = [
      { propertyName: 'sections.section0.f0', error: { message: 'remove' } },
      { propertyName: 'sections.other.f0', error: { message: 'keep' } }
    ];
    model.requiredResults = [
      { propertyName: 'sections.section0.f0', isRequired: true, hasRequiredError: true },
      { propertyName: 'sections.other.f0', isRequired: true, hasRequiredError: true }
    ];
    model['perfSection0'] = { isValid: false, isInValid: true };
    model.performance = { isValid: false, isInValid: true };
    (model as any)._policyValidationMeta = {
      touchedFields: { 'sections.section0.f0': true, 'sections.other.f0': true },
      showAllErrors: true
    };
    validationProvider.replacePolicy('PerfSection0', new PerformanceSectionValidationPolicy(section.fields));
    const refreshSpy = jasmine.createSpy('refresh');
    validationProvider.onValidationRefresh(model).subscribe(refreshSpy);

    builder.clearSection(model, section);

    expect(model.sections['section0']['f0']).toBe('');
    expect(model.sections['section0']['f4']).toBeFalse();
    expect(model.validationResults).toEqual([
      { propertyName: 'sections.other.f0', error: { message: 'keep' } }
    ]);
    expect(model.requiredResults?.some((entry) => entry.propertyName === 'sections.other.f0')).toBeTrue();
    expect(model['perfSection0']).toBeUndefined();
    expect(model.performance).toBeUndefined();
    expect((model as any)._policyValidationMeta.touchedFields).toEqual({ 'sections.other.f0': true });
    expect(refreshSpy).toHaveBeenCalled();

    builder.clearSection(model, sectionWith(allTypeFields(), 'missing'));
  });

  it('clears all present sections and skips missing section data', () => {
    const model = new PerformanceFormModel();
    const first = sectionWith(allTypeFields(), 'section0');
    const missing = sectionWith(allTypeFields(), 'missing');
    model.sections['section0'] = { f0: 'dirty' };

    builder.clearAllSections(model, [first, missing]);

    expect(model.sections['section0']['f0']).toBe('');
  });
});

function allTypeFields(): PerformanceFieldDef[] {
  const types: PerformanceFieldDef['type'][] = [
    'text', 'email', 'number', 'date', 'checkbox', 'select', 'textarea', 'radio'
  ];
  return types.map((type, index) => ({
    id: `f${index}`,
    type,
    label: `${type[0].toUpperCase()}${type.slice(1)} ${index + 1}`,
    propertyPath: `sections.section0.f${index}`,
    validateModel: `form.sections.section0.f${index}`,
    elementId: `section0_f${index}`,
    groupName: 'perfSection0',
    policyName: 'PerfSection0',
    selectOptions: type === 'select' ? ['Alpha', 'Beta'] : undefined,
    radioOptions: type === 'radio' ? [{ value: 'a', label: 'A' }] : undefined
  }));
}

function sectionWith(fields: PerformanceFieldDef[], id = 'section0'): PerformanceSectionMeta {
  const normalized = fields.map((field) => ({
    ...field,
    propertyPath: field.propertyPath.replace('section0', id),
    validateModel: field.validateModel.replace('section0', id),
    elementId: field.elementId.replace('section0', id)
  }));
  return {
    id,
    title: id,
    groupName: id === 'section0' ? 'perfSection0' : `perf-${id}`,
    policyName: id === 'section0' ? 'PerfSection0' : `Policy-${id}`,
    fields: normalized
  };
}
