import { ChangeDetectorRef, NgZone, SimpleChange } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ValidationProviderService } from '@validation-rules/angular';
import {
  PerformanceFieldDef,
  PerformanceFormModel,
  PerformanceMetrics,
  PerformanceRenderProgress,
  PerformanceSectionMeta
} from '../../models/performance-form.model';
import { PerformanceBuildResult, PerformanceFormBuilderService } from './performance-form-builder.service';
import { PerformanceFormComponent } from './performance-form.component';
import { PerformanceFormErrorSummaryComponent } from './performance-form-error-summary.component';
import { PerformanceFormSectionComponent } from './performance-form-section.component';

describe('PerformanceFormComponent', () => {
  let validation: jasmine.SpyObj<ValidationProviderService>;
  let builder: jasmine.SpyObj<PerformanceFormBuilderService>;
  let changeDetector: jasmine.SpyObj<ChangeDetectorRef>;
  let zone: NgZone;
  let refresh: Subject<any>;
  let component: PerformanceFormComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    refresh = new Subject<any>();
    validation = jasmine.createSpyObj<ValidationProviderService>('validation', [
      'validateAll', 'evaluatePolicies', 'clearValidationState', 'resetFormGroups',
      'evaluateFormGroup', 'updatePolicyGroupStatus', 'notifyValidationRefresh', 'onValidationRefresh'
    ]);
    validation.validateAll.and.returnValue(of(undefined));
    validation.evaluatePolicies.and.returnValue(of(undefined));
    validation.onValidationRefresh.and.returnValue(refresh.asObservable());
    builder = jasmine.createSpyObj<PerformanceFormBuilderService>('builder', [
      'build', 'teardown', 'fillAllSections', 'clearAllSections'
    ]);
    builder.build.and.returnValue(buildResult());
    changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('changeDetector', ['markForCheck']);
    zone = TestBed.inject(NgZone);
    component = new PerformanceFormComponent(validation, builder, zone, changeDetector);
  });

  it('binds refresh on init and cleans subscriptions and dynamic registrations on destroy', () => {
    component.ngOnInit();
    refresh.next(component.model);
    expect(changeDetector.markForCheck).toHaveBeenCalledTimes(1);

    component.ngOnDestroy();
    refresh.next(component.model);
    expect(changeDetector.markForCheck).toHaveBeenCalledTimes(1);
    expect(builder.teardown).toHaveBeenCalled();
    expect(component.renderGeneration).toBe(1);
  });

  it('computes busy, generated, action, size, and total-control state', () => {
    component.model.config = { sectionCount: 10, controlsPerSection: 60, seed: 1 };
    expect(component.totalControlEstimate).toBe(600);
    expect(component.isLargeForm).toBeTrue();
    expect(component.isBusy).toBeFalse();
    expect(component.isGenerated).toBeFalse();
    expect(component.canRunFormActions).toBeFalse();

    for (const phase of ['validating-config', 'building', 'rendering', 'validating'] as const) {
      component.phase = phase;
      expect(component.isBusy).withContext(phase).toBeTrue();
    }

    component.model.config = { sectionCount: null, controlsPerSection: null, seed: 1 };
    expect(component.totalControlEstimate).toBe(0);
    expect(component.isLargeForm).toBeFalse();
  });

  it('ignores generation while busy', () => {
    component.phase = 'building';
    component.onGenerate();
    expect(validation.validateAll).not.toHaveBeenCalled();
  });

  it('rejects an invalid configuration without building', () => {
    validation.validateAll.and.callFake(() => {
      component.model.validationResults = [
        { propertyName: 'config.sectionCount', error: { message: 'bad' } }
      ];
      return of(undefined);
    });

    component.onGenerate();

    expect(component.phase).toBe('idle');
    expect(component.submitMessage).toBe('Fix configuration errors before generating the performance form.');
    expect(builder.build).not.toHaveBeenCalled();
  });

  it('validates, builds, incrementally mounts, and finishes a generated form', fakeAsync(() => {
    component.model.config = { sectionCount: 2, controlsPerSection: 1, seed: 1 };

    component.onGenerate();
    expect(component.phase).toBe('building');
    expect(component.renderProgress?.message).toContain('Building validation policies');
    tick();

    expect(builder.build).toHaveBeenCalledWith(component.model);
    expect(component.phase).toBe('rendering');
    expect(component.renderedSections.map((section) => section.id)).toEqual(['section0']);
    expect(validation.clearValidationState).toHaveBeenCalledWith(component.model, ['PerfSection0', 'PerfSection1']);

    component.onSectionRendered('wrong');
    component.onSectionRendered('section0');
    tick(20);
    expect(component.renderedSections.map((section) => section.id)).toEqual(['section0', 'section1']);

    component.onSectionRendered('section1');
    tick(20);
    expect(component.phase).toBe('complete');
    expect(component.isGenerated).toBeTrue();
    expect(component.canRunFormActions).toBeTrue();
    expect(component.renderProgress?.percent).toBe(100);
    expect(component.submitMessage).toContain('Rendered 2 controls across 2 sections');
  }));

  it('fails cleanly when configuration validation errors', () => {
    validation.validateAll.and.returnValue(throwError(() => new Error('boom')));
    component.onGenerate();

    expect(component.phase).toBe('failed');
    expect(component.submitMessage).toBe('Configuration validation failed unexpectedly.');
    expect(builder.teardown).toHaveBeenCalled();
  });

  it('fails cleanly when building throws Error or non-Error values', fakeAsync(() => {
    component.model.config = { sectionCount: 1, controlsPerSection: 1, seed: 1 };
    builder.build.and.throwError('build boom');
    component.onGenerate();
    tick();
    expect(component.phase).toBe('failed');
    expect(component.submitMessage).toContain('build boom');

    component.phase = 'idle';
    builder.build.and.callFake(() => { throw 'unknown'; });
    component.onGenerate();
    tick();
    expect(component.submitMessage).toBe('Failed to build the performance form.');
  }));

  it('validates all generated policies and reports error and success outcomes', () => {
    makeGenerated();
    component.metrics = metrics();
    component.model.validationResults = [
      { propertyName: 'sections.section0.f0', error: { message: 'bad' } }
    ];

    component.onValidateAll();
    expect(component.phase).toBe('complete');
    expect(component.metrics.lastValidateAllMs).toBeGreaterThanOrEqual(0);
    expect(component.submitMessage).toContain('1 error(s)');
    expect(validation.evaluateFormGroup).toHaveBeenCalledTimes(2);
    expect(validation.updatePolicyGroupStatus).toHaveBeenCalledWith(component.model, 'performance');

    component.model.validationResults = undefined;
    component.onValidateAll();
    expect(component.submitMessage).toContain('no errors');
  });

  it('ignores validate-all before generation and handles evaluation errors', () => {
    component.onValidateAll();
    expect(validation.evaluatePolicies).not.toHaveBeenCalled();

    makeGenerated();
    validation.evaluatePolicies.and.returnValue(throwError(() => new Error('bad')));
    component.onValidateAll();
    expect(component.phase).toBe('failed');
    expect(component.submitMessage).toBe('Validate all failed unexpectedly.');
  });

  it('prompts before generation and reports failed or successful submissions', () => {
    component.onSubmit();
    expect(component.submitMessage).toBe('Generate the form first using the configuration above.');

    makeGenerated();
    component.metrics = metrics();
    component.model.validationResults = [
      { propertyName: 'sections.section0.f0', error: { message: 'bad' } }
    ];
    component.onSubmit();
    expect(component.metrics.lastSubmitMs).toBeGreaterThanOrEqual(0);
    expect(component.submitMessage).toContain('with 1 error(s)');

    component.model.validationResults = undefined;
    component.onSubmit();
    expect(component.submitMessage).toContain('All 2 controls passed validation');
  });

  it('handles submit evaluation errors', () => {
    makeGenerated();
    validation.evaluatePolicies.and.returnValue(throwError(() => new Error('bad')));
    component.onSubmit();
    expect(component.phase).toBe('failed');
    expect(component.submitMessage).toBe('Submit validation failed unexpectedly.');
  });

  it('clears a completed form, rebinds refresh, and ignores clear while busy', () => {
    const originalModel = component.model;
    component.phase = 'rendering';
    component.onClear();
    expect(component.model).toBe(originalModel);

    makeGenerated();
    component.metrics = metrics();
    component.renderProgress = renderProgress();
    component.collapsedSections.add('section0');
    component.submitMessage = 'dirty';
    component.onClear();

    expect(component.phase).toBe('idle');
    expect(component.model).not.toBe(originalModel);
    expect(component.metrics).toBeNull();
    expect(component.renderProgress).toBeNull();
    expect(component.collapsedSections.size).toBe(0);
    expect(builder.teardown).toHaveBeenCalled();
    expect(validation.resetFormGroups).toHaveBeenCalled();
    expect(validation.clearValidationState).toHaveBeenCalledWith(component.model, ['PerformanceConfig']);
    expect(validation.onValidationRefresh).toHaveBeenCalled();
  });

  it('tracks and toggles section collapse state', () => {
    component.allSectionMetas = buildResult().sectionMetas;
    expect(component.trackSection(99, component.allSectionMetas[0])).toBe('section0');
    expect(component.isSectionCollapsed('section0')).toBeFalse();

    component.toggleSection('section0');
    expect(component.isSectionCollapsed('section0')).toBeTrue();
    component.toggleSection('section0');
    expect(component.isSectionCollapsed('section0')).toBeFalse();
    component.collapseAll();
    expect(component.collapsedSections.size).toBe(2);
    component.expandAll();
    expect(component.collapsedSections.size).toBe(0);
  });

  it('fills all sections, validates badges, and reports error/no-error outcomes', () => {
    component.onFillAll();
    expect(builder.fillAllSections).not.toHaveBeenCalled();

    makeGenerated();
    component.model.validationResults = [
      { propertyName: 'sections.section0.f0', error: { message: 'bad' } }
    ];
    component.onFillAll();
    expect(builder.fillAllSections).toHaveBeenCalledWith(component.model, component.allSectionMetas);
    expect(component.submitMessage).toContain('1 error(s) found');

    component.model.validationResults = undefined;
    component.onFillAll();
    expect(component.submitMessage).toContain('No errors found');
  });

  it('clears all sections only when actions are available', () => {
    component.onClearAllSections();
    expect(builder.clearAllSections).not.toHaveBeenCalled();

    makeGenerated();
    component.onClearAllSections();
    expect(builder.clearAllSections).toHaveBeenCalledWith(component.model, component.allSectionMetas);
    expect(component.submitMessage).toContain('Cleared all 2 sections');
  });

  it('formats section validation results', () => {
    component.onSectionValidated({ title: 'Section 1', errorCount: 2, durationMs: 12.34 });
    expect(component.submitMessage).toBe('Section 1: 2 error(s) in 12.3 ms.');
    component.onSectionValidated({ title: 'Section 1', errorCount: 0, durationMs: 1 });
    expect(component.submitMessage).toBe('Section 1: no errors in 1.0 ms.');
  });

  it('updates per-section rendering progress and ignores stale events', () => {
    component.onSectionProgress({ sectionId: 'section0', visibleCount: 1, total: 1 });
    expect(component.renderProgress).toBeNull();

    component.phase = 'rendering';
    component.renderedSections = buildResult().sectionMetas;
    component.renderProgress = renderProgress();
    component.onSectionProgress({ sectionId: 'section1', visibleCount: 1, total: 1 });
    expect(component.renderProgress.controlsRendered).toBe(2);
    expect(component.renderProgress.fieldsRenderedInSection).toBe(1);
    expect(component.renderProgress.message).toContain('1/1 controls');
  });

  it('guards internal render and finish transitions with missing state', () => {
    component.phase = 'idle';
    (component as any).mountNextSection();
    (component as any).finishRender();
    expect(component.phase).toBe('idle');

    const result = buildResult();
    result.sectionMetas = [];
    result.metrics.totalControls = 0;
    (component as any).startIncrementalRender(result);
    expect(component.phase).toBe('complete');

    const generation = component.renderGeneration;
    (component as any).cancelActiveOperation(false);
    expect(component.renderGeneration).toBe(generation);
  });

  function makeGenerated(): void {
    component.phase = 'complete';
    component.allSectionMetas = buildResult().sectionMetas;
    component.renderedSections = component.allSectionMetas;
    (component as any).sectionPolicyNames = ['PerfSection0', 'PerfSection1'];
  }
});

describe('PerformanceFormSectionComponent', () => {
  let validation: jasmine.SpyObj<ValidationProviderService>;
  let builder: jasmine.SpyObj<PerformanceFormBuilderService>;
  let changeDetector: jasmine.SpyObj<ChangeDetectorRef>;
  let zone: NgZone;
  let refresh: Subject<any>;
  let component: PerformanceFormSectionComponent;
  let callbacks: FrameRequestCallback[];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    refresh = new Subject<any>();
    validation = jasmine.createSpyObj<ValidationProviderService>('validation', [
      'validateAll', 'evaluateFormGroup', 'updatePolicyGroupStatus', 'notifyValidationRefresh', 'onValidationRefresh'
    ]);
    validation.validateAll.and.returnValue(of(undefined));
    validation.onValidationRefresh.and.returnValue(refresh.asObservable());
    builder = jasmine.createSpyObj<PerformanceFormBuilderService>('builder', ['fillSection', 'clearSection']);
    changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('changeDetector', ['markForCheck']);
    zone = TestBed.inject(NgZone);
    component = new PerformanceFormSectionComponent(changeDetector, zone, builder, validation);
    component.section = section('section0', 31);
    component.model = new PerformanceFormModel();
    component.model.sections['section0'] = {};
    callbacks = [];
    spyOn(window, 'requestAnimationFrame').and.callFake((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    spyOn(window, 'cancelAnimationFrame');
  });

  it('renders fields in deterministic batches and emits progress and completion', () => {
    const progress = jasmine.createSpy('progress');
    const rendered = jasmine.createSpy('rendered');
    component.sectionProgress.subscribe(progress);
    component.sectionRendered.subscribe(rendered);

    component.ngOnInit();
    while (callbacks.length) {
      callbacks.shift()!(performance.now());
    }

    expect(component.visibleFields.length).toBe(31);
    expect(component.sectionComplete).toBeTrue();
    expect(component.canUseSectionActions).toBeTrue();
    expect(progress.calls.allArgs().map((args) => args[0].visibleCount)).toEqual([15, 30, 31]);
    expect(rendered).toHaveBeenCalledOnceWith('section0');
    component.ngOnDestroy();
  });

  it('exposes section status, errors, visibility, counts, and tracking', () => {
    component.visibleFields = component.section.fields;
    component.model['perfSection0'] = {
      isValid: false,
      isInValid: true,
      isEvaluated: true,
      errors: [{ propertyName: 'sections.section0.f0', error: { message: 'bad' } }]
    };

    expect(component.sectionStatus).toBe(component.model['perfSection0'] as any);
    expect(component.sectionErrorsVisible).toBeTrue();
    expect(component.sectionErrorCount).toBe(1);
    expect(component.sectionErrors[0].error.message).toBe('bad');
    expect(component.trackField(99, component.section.fields[0])).toBe('sections.section0.f0');

    component.model['perfSection0'] = undefined;
    expect(component.sectionErrorsVisible).toBeFalse();
    expect(component.sectionErrorCount).toBe(0);
    expect(component.sectionErrors).toEqual([]);
    component.actionsDisabled = true;
    expect(component.canUseSectionActions).toBeFalse();
  });

  it('emits collapse changes and toggles error-summary collapse', () => {
    const collapsed = jasmine.createSpy('collapsed');
    component.collapsedChange.subscribe(collapsed);
    component.toggleCollapsed();
    expect(collapsed).toHaveBeenCalled();
    component.toggleSectionErrorsCollapsed();
    expect(component.sectionErrorsCollapsed).toBeTrue();
  });

  it('fills and clears completed sections but ignores actions while incomplete or disabled', () => {
    component.onFillSection();
    component.onClearSection();
    expect(builder.fillSection).not.toHaveBeenCalled();

    component.visibleFields = component.section.fields;
    component.onFillSection();
    expect(builder.fillSection).toHaveBeenCalledWith(component.model, component.section);
    expect(validation.validateAll).toHaveBeenCalled();
    expect(validation.evaluateFormGroup).toHaveBeenCalledWith(component.model, 'perfSection0', 'PerfSection0');

    component.onClearSection();
    expect(builder.clearSection).toHaveBeenCalledWith(component.model, component.section);
    component.actionsDisabled = true;
    component.onFillSection();
    expect(builder.fillSection).toHaveBeenCalledTimes(1);
  });

  it('validates a section and emits duration and section-scoped error count', () => {
    component.visibleFields = component.section.fields;
    component.model.validationResults = [
      { propertyName: 'sections.section0.f0', error: { message: 'bad' } },
      { propertyName: 'sections.other.f0', error: { message: 'other' } }
    ];
    const result = jasmine.createSpy('result');
    component.sectionValidated.subscribe(result);

    component.onValidateSection();

    expect(result).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'section0', errorCount: 1
    }));
    expect(validation.updatePolicyGroupStatus).toHaveBeenCalledWith(component.model, 'performance');
    expect(validation.notifyValidationRefresh).toHaveBeenCalledWith(component.model);
  });

  it('ignores validation while actions are unavailable', () => {
    component.onValidateSection();
    expect(validation.validateAll).not.toHaveBeenCalled();
  });

  it('rebinds refresh when the model changes and cancels on generation change or destroy', () => {
    component.ngOnInit();
    refresh.next(component.model);
    expect(changeDetector.markForCheck).toHaveBeenCalled();

    const nextModel = new PerformanceFormModel();
    component.model = nextModel;
    component.ngOnChanges({ model: new SimpleChange(undefined, nextModel, false) });
    component.renderGeneration = 2;
    component.ngOnChanges({ renderGeneration: new SimpleChange(1, 2, false) });
    expect(window.cancelAnimationFrame).toHaveBeenCalled();

    component.ngOnDestroy();
    refresh.next(nextModel);
  });

  it('stops scheduling when cancelled or generation is stale and emits completion for an empty final batch', () => {
    (component as any).cancelled = true;
    (component as any).scheduleNextBatch();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();

    (component as any).cancelled = false;
    (component as any).activeGeneration = 1;
    component.renderGeneration = 2;
    (component as any).appendBatch();
    expect(component.visibleFields).toEqual([]);

    (component as any).activeGeneration = 2;
    component.section = section('empty', 0);
    const rendered = jasmine.createSpy('rendered');
    component.sectionRendered.subscribe(rendered);
    (component as any).appendBatch();
    expect(rendered).toHaveBeenCalledWith('empty');
  });
});

describe('PerformanceFormErrorSummaryComponent', () => {
  let component: PerformanceFormErrorSummaryComponent;

  beforeEach(() => {
    component = new PerformanceFormErrorSummaryComponent();
    component.model = new PerformanceFormModel();
    component.sections = [section('section0', 1), section('section1', 1)];
  });

  it('is visible only for show-all state with errors', () => {
    expect(component.visible).toBeFalse();
    (component.model as any)._policyValidationMeta = { showAllErrors: true };
    expect(component.visible).toBeFalse();
    component.model.validationResults = [
      { propertyName: 'sections.section0.f0', error: { message: 'bad' } }
    ];
    expect(component.totalErrorCount).toBe(1);
    expect(component.visible).toBeTrue();
  });

  it('groups known sections in configured order and retains unknown/other errors', () => {
    component.model.validationResults = [
      { propertyName: 'sections.section1.f0', error: { message: 'second' } },
      { propertyName: 'config.sectionCount', error: { message: 'config' } },
      { propertyName: 'sections.unknown.f0', error: { message: 'unknown' } },
      { propertyName: 'sections.section0.f0', error: { message: 'first' } }
    ];

    expect(component.groupedErrors.map((group) => group.sectionId)).toEqual([
      'section0', 'section1', '_other', 'unknown'
    ]);
    expect(component.groupedErrors[2].title).toBe('_other');
    expect(component.trackGroup(99, component.groupedErrors[0])).toBe('section0');
  });

  it('toggles summary and individual/all group collapse state', () => {
    component.model.validationResults = [
      { propertyName: 'sections.section0.f0', error: { message: 'bad' } },
      { propertyName: 'sections.section1.f0', error: { message: 'bad' } }
    ];
    component.toggleSummaryCollapsed();
    expect(component.summaryCollapsed).toBeTrue();
    component.toggleGroup('section0');
    expect(component.isGroupCollapsed('section0')).toBeTrue();
    component.toggleGroup('section0');
    expect(component.isGroupCollapsed('section0')).toBeFalse();
    component.collapseAllGroups();
    expect(component.isGroupCollapsed('section0')).toBeTrue();
    expect(component.isGroupCollapsed('section1')).toBeTrue();
    component.expandAllGroups();
    expect(component.isGroupCollapsed('section0')).toBeFalse();
  });
});

function section(id: string, fieldCount: number): PerformanceSectionMeta {
  const fields: PerformanceFieldDef[] = Array.from({ length: fieldCount }, (_, index) => ({
    id: `f${index}`,
    type: 'text',
    label: `Field ${index}`,
    propertyPath: `sections.${id}.f${index}`,
    validateModel: `form.sections.${id}.f${index}`,
    elementId: `${id}_f${index}`,
    groupName: id === 'section0' ? 'perfSection0' : 'perfSection1',
    policyName: id === 'section0' ? 'PerfSection0' : 'PerfSection1'
  }));
  return {
    id,
    title: id,
    groupName: id === 'section0' ? 'perfSection0' : 'perfSection1',
    policyName: id === 'section0' ? 'PerfSection0' : 'PerfSection1',
    fields
  };
}

function metrics(): PerformanceMetrics {
  return {
    generationMs: 1,
    renderMs: 1,
    totalSections: 2,
    totalControls: 2,
    totalValidators: 4,
    estimatedDirectives: 4
  };
}

function buildResult(): PerformanceBuildResult {
  return {
    sectionMetas: [section('section0', 1), section('section1', 1)],
    policyNames: ['PerfSection0', 'PerfSection1'],
    groupNames: ['perfSection0', 'perfSection1'],
    metrics: metrics()
  };
}

function renderProgress(): PerformanceRenderProgress {
  return {
    phase: 'rendering',
    message: 'rendering',
    percent: 1,
    sectionsTotal: 2,
    sectionsComplete: 0,
    currentSection: 2,
    fieldsInSection: 1,
    fieldsRenderedInSection: 0,
    controlsRendered: 0,
    controlsTotal: 2
  };
}
