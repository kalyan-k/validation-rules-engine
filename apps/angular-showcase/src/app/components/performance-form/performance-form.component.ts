import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnDestroy,
  OnInit
} from '@angular/core';
import { ShowcaseFramework } from '../../showcase/showcase-framework.model';
import { Subscription } from 'rxjs';
import { ValidationProviderService } from '@validation-rules-engine/angular';
import {
  PerformanceFormModel,
  PerformanceFormPhase,
  PerformanceMetrics,
  PerformanceRenderProgress,
  PerformanceSectionMeta
} from '../../models/performance-form.model';
import { PerformanceBuildResult, PerformanceFormBuilderService } from './performance-form-builder.service';

@Component({
  selector: 'app-performance-form',
  standalone: false,
  templateUrl: './performance-form.component.html',
  styleUrls: ['./performance-form.component.sass'],
  providers: [PerformanceFormBuilderService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceFormComponent implements OnInit, OnDestroy {
  @Input() uiFramework: ShowcaseFramework = 'bootstrap';

  model = new PerformanceFormModel();
  renderedSections: PerformanceSectionMeta[] = [];
  allSectionMetas: PerformanceSectionMeta[] = [];
  metrics: PerformanceMetrics | null = null;
  renderProgress: PerformanceRenderProgress | null = null;
  submitMessage = '';
  phase: PerformanceFormPhase = 'idle';
  renderGeneration = 0;
  collapsedSections = new Set<string>();

  readonly configPolicyName = 'PerformanceConfig';
  readonly configGroupName = 'perfConfig';
  readonly policyGroupName = 'performance';

  private sectionPolicyNames: string[] = [];
  private awaitingSectionId: string | null = null;
  private renderStartMs = 0;
  private pendingBuild: PerformanceBuildResult | null = null;
  private controlsPerSection = 0;
  private refreshSubscription?: Subscription;

  constructor(
    private validationProvider: ValidationProviderService,
    private builder: PerformanceFormBuilderService,
    private ngZone: NgZone,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.bindValidationRefresh();
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
    this.cancelActiveOperation();
    this.builder.teardown();
  }

  get isBusy(): boolean {
    return this.phase === 'validating-config'
      || this.phase === 'building'
      || this.phase === 'rendering'
      || this.phase === 'validating';
  }

  get isGenerated(): boolean {
    return this.phase === 'complete';
  }

  get canRunFormActions(): boolean {
    return this.phase === 'complete' && this.sectionPolicyNames.length > 0;
  }

  get totalControlEstimate(): number {
    const sections = Number(this.model.config.sectionCount) || 0;
    const controls = Number(this.model.config.controlsPerSection) || 0;
    return sections * controls;
  }

  get isLargeForm(): boolean {
    return this.totalControlEstimate > 500;
  }

  onGenerate(): void {
    if (this.isBusy) {
      return;
    }

    this.cancelActiveOperation();
    this.renderedSections = [];
    this.allSectionMetas = [];
    this.collapsedSections.clear();
    this.submitMessage = '';
    this.phase = 'validating-config';
    this.renderProgress = {
      phase: 'building',
      message: 'Validating configuration…',
      percent: 0,
      sectionsTotal: Number(this.model.config.sectionCount) || 0,
      sectionsComplete: 0,
      currentSection: 0,
      fieldsInSection: Number(this.model.config.controlsPerSection) || 0,
      fieldsRenderedInSection: 0,
      controlsRendered: 0,
      controlsTotal: this.totalControlEstimate
    };
    this.changeDetectorRef.markForCheck();

    this.validationProvider.validateAll(this.model, this.configPolicyName, {
      showAllErrors: true,
      evaluateGroups: true
    }).subscribe({
      next: () => this.handleConfigValidated(),
      error: () => this.failOperation('Configuration validation failed unexpectedly.')
    });
  }

  onValidateAll(): void {
    if (!this.canRunFormActions) {
      return;
    }

    this.phase = 'validating';
    this.submitMessage = '';
    this.changeDetectorRef.markForCheck();

    const start = performance.now();
    this.validationProvider.evaluatePolicies(
      this.model,
      this.sectionPolicyNames,
      this.policyGroupName
    ).subscribe({
      next: () => {
        const duration = performance.now() - start;
        if (this.metrics) {
          this.metrics = { ...this.metrics, lastValidateAllMs: duration };
        }
        this.phase = 'complete';
        this.commitBadgeState();
        this.submitMessage = this.model.validationResults?.length
          ? `Validate all completed with ${this.model.validationResults.length} error(s) in ${duration.toFixed(1)} ms.`
          : `Validate all completed — no errors in ${duration.toFixed(1)} ms.`;
        this.changeDetectorRef.markForCheck();
      },
      error: () => this.failOperation('Validate all failed unexpectedly.')
    });
  }

  onSubmit(): void {
    if (!this.canRunFormActions) {
      this.submitMessage = 'Generate the form first using the configuration above.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.phase = 'validating';
    this.submitMessage = '';
    this.changeDetectorRef.markForCheck();

    const start = performance.now();
    this.validationProvider.evaluatePolicies(
      this.model,
      this.sectionPolicyNames,
      this.policyGroupName
    ).subscribe({
      next: () => {
        const duration = performance.now() - start;
        if (this.metrics) {
          this.metrics = { ...this.metrics, lastSubmitMs: duration };
        }
        this.phase = 'complete';

        this.commitBadgeState();
        const hasErrors = !!this.model.validationResults?.length;
        this.submitMessage = hasErrors
          ? `Submit validation finished in ${duration.toFixed(1)} ms with ${this.model.validationResults?.length} error(s).`
          : `All ${this.metrics?.totalControls ?? 0} controls passed validation in ${duration.toFixed(1)} ms.`;
        this.changeDetectorRef.markForCheck();
      },
      error: () => this.failOperation('Submit validation failed unexpectedly.')
    });
  }

  onClear(): void {
    if (this.isBusy) {
      return;
    }

    this.cancelActiveOperation();
    this.builder.teardown();
    this.renderedSections = [];
    this.allSectionMetas = [];
    this.collapsedSections.clear();
    this.sectionPolicyNames = [];
    this.metrics = null;
    this.renderProgress = null;
    this.phase = 'idle';
    this.submitMessage = '';

    this.model = new PerformanceFormModel();
    this.validationProvider.resetFormGroups();
    this.validationProvider.clearValidationState(this.model, [this.configPolicyName]);
    this.bindValidationRefresh();
    this.changeDetectorRef.markForCheck();
  }

  onSectionRendered(sectionId: string): void {
    if (this.phase !== 'rendering' || this.awaitingSectionId !== sectionId) {
      return;
    }

    this.awaitingSectionId = null;
    const sectionsComplete = this.renderedSections.length;

    if (this.renderProgress) {
      const controlsRendered = this.renderedSections
        .slice(0, sectionsComplete)
        .reduce((sum, section) => sum + section.fields.length, 0);

      this.renderProgress = {
        ...this.renderProgress,
        sectionsComplete,
        controlsRendered,
        percent: Math.min(99, Math.round((controlsRendered / this.renderProgress.controlsTotal) * 100)),
        message: sectionsComplete >= this.renderProgress.sectionsTotal
          ? 'Finalizing…'
          : `Section ${sectionsComplete} complete. Preparing section ${sectionsComplete + 1}…`
      };
      this.changeDetectorRef.markForCheck();
    }

    requestAnimationFrame(() => this.ngZone.run(() => this.mountNextSection()));
  }

  trackSection(_index: number, section: PerformanceSectionMeta): string {
    return section.id;
  }

  isSectionCollapsed(sectionId: string): boolean {
    return this.collapsedSections.has(sectionId);
  }

  toggleSection(sectionId: string): void {
    if (this.collapsedSections.has(sectionId)) {
      this.collapsedSections.delete(sectionId);
    } else {
      this.collapsedSections.add(sectionId);
    }
    this.changeDetectorRef.markForCheck();
  }

  collapseAll(): void {
    this.allSectionMetas.forEach((section) => this.collapsedSections.add(section.id));
    this.changeDetectorRef.markForCheck();
  }

  expandAll(): void {
    this.collapsedSections.clear();
    this.changeDetectorRef.markForCheck();
  }

  onFillAll(): void {
    if (!this.canRunFormActions || this.isBusy) {
      return;
    }

    this.builder.fillAllSections(this.model, this.allSectionMetas);
    this.evaluateAllSectionBadges('Filled all sections and evaluated badges.');
  }

  onClearAllSections(): void {
    if (!this.canRunFormActions || this.isBusy) {
      return;
    }

    this.builder.clearAllSections(this.model, this.allSectionMetas);
    this.submitMessage = `Cleared all ${this.allSectionMetas.length} sections and reset their validation state.`;
    this.changeDetectorRef.markForCheck();
  }

  onSectionValidated(event: { title: string; errorCount: number; durationMs: number }): void {
    this.submitMessage = event.errorCount
      ? `${event.title}: ${event.errorCount} error(s) in ${event.durationMs.toFixed(1)} ms.`
      : `${event.title}: no errors in ${event.durationMs.toFixed(1)} ms.`;
    this.changeDetectorRef.markForCheck();
  }

  onSectionProgress(event: { sectionId: string; visibleCount: number; total: number }): void {
    if (!this.renderProgress || this.phase !== 'rendering') {
      return;
    }

    const completedControls = this.renderedSections
      .slice(0, -1)
      .reduce((sum, section) => sum + section.fields.length, 0);

    const controlsRendered = completedControls + event.visibleCount;
    const controlsTotal = this.renderProgress.controlsTotal;

    this.renderProgress = {
      ...this.renderProgress,
      phase: 'rendering',
      message: `Rendering section ${this.renderProgress.currentSection} of ${this.renderProgress.sectionsTotal} (${event.visibleCount}/${event.total} controls in section)…`,
      fieldsInSection: event.total,
      fieldsRenderedInSection: event.visibleCount,
      controlsRendered,
      percent: Math.min(99, Math.round((controlsRendered / controlsTotal) * 100))
    };
    this.changeDetectorRef.markForCheck();
  }

  private handleConfigValidated(): void {
    const configErrors = (this.model.validationResults || []).filter((result) =>
      result.propertyName.startsWith('config.')
    );

    if (configErrors.length > 0) {
      this.phase = 'idle';
      this.submitMessage = 'Fix configuration errors before generating the performance form.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.phase = 'building';
    this.controlsPerSection = Number(this.model.config.controlsPerSection);
    this.renderProgress = {
      phase: 'building',
      message: 'Building validation policies and form model…',
      percent: 0,
      sectionsTotal: Number(this.model.config.sectionCount),
      sectionsComplete: 0,
      currentSection: 0,
      fieldsInSection: this.controlsPerSection,
      fieldsRenderedInSection: 0,
      controlsRendered: 0,
      controlsTotal: this.totalControlEstimate
    };
    this.changeDetectorRef.markForCheck();

    this.ngZone.runOutsideAngular(() => {
      window.setTimeout(() => {
        try {
          const buildResult = this.builder.build(this.model);
          this.ngZone.run(() => this.startIncrementalRender(buildResult));
        } catch (error) {
          this.ngZone.run(() => this.failOperation(
            error instanceof Error ? error.message : 'Failed to build the performance form.'
          ));
        }
      }, 0);
    });
  }

  private startIncrementalRender(buildResult: PerformanceBuildResult): void {
    this.renderGeneration++;
    this.pendingBuild = buildResult;
    this.allSectionMetas = buildResult.sectionMetas;
    this.sectionPolicyNames = buildResult.policyNames;
    this.metrics = buildResult.metrics;
    this.renderedSections = [];
    this.collapsedSections.clear();
    this.renderStartMs = performance.now();
    this.phase = 'rendering';

    this.validationProvider.clearValidationState(this.model, this.sectionPolicyNames);

    this.renderProgress = {
      phase: 'rendering',
      message: 'Starting incremental render…',
      percent: 1,
      sectionsTotal: buildResult.sectionMetas.length,
      sectionsComplete: 0,
      currentSection: 1,
      fieldsInSection: this.controlsPerSection,
      fieldsRenderedInSection: 0,
      controlsRendered: 0,
      controlsTotal: buildResult.metrics.totalControls
    };
    this.changeDetectorRef.markForCheck();

    this.mountNextSection();
  }

  private mountNextSection(): void {
    if (this.phase !== 'rendering' || !this.pendingBuild) {
      return;
    }

    const nextIndex = this.renderedSections.length;
    if (nextIndex >= this.allSectionMetas.length) {
      this.finishRender();
      return;
    }

    const section = this.allSectionMetas[nextIndex];
    this.awaitingSectionId = section.id;
    this.renderedSections = [...this.renderedSections, section];

    if (this.renderProgress) {
      this.renderProgress = {
        ...this.renderProgress,
        currentSection: nextIndex + 1,
        fieldsRenderedInSection: 0,
        message: `Mounting section ${nextIndex + 1} of ${this.allSectionMetas.length}…`
      };
    }

    this.changeDetectorRef.markForCheck();
  }

  private finishRender(): void {
    if (!this.pendingBuild || !this.metrics) {
      return;
    }

    const renderMs = performance.now() - this.renderStartMs;
    this.metrics = { ...this.metrics, renderMs };
    this.renderProgress = {
      phase: 'rendering',
      message: 'Render complete.',
      percent: 100,
      sectionsTotal: this.allSectionMetas.length,
      sectionsComplete: this.allSectionMetas.length,
      currentSection: this.allSectionMetas.length,
      fieldsInSection: this.controlsPerSection,
      fieldsRenderedInSection: this.controlsPerSection,
      controlsRendered: this.metrics.totalControls,
      controlsTotal: this.metrics.totalControls
    };
    this.phase = 'complete';
    this.awaitingSectionId = null;
    this.pendingBuild = null;
    this.submitMessage = `Rendered ${this.metrics.totalControls.toLocaleString()} controls across ${this.metrics.totalSections} sections in ${(renderMs / 1000).toFixed(1)}s.`;
    this.changeDetectorRef.markForCheck();
  }

  private failOperation(message: string): void {
    this.cancelActiveOperation();
    this.builder.teardown();
    this.renderedSections = [];
    this.allSectionMetas = [];
    this.collapsedSections.clear();
    this.sectionPolicyNames = [];
    this.metrics = null;
    this.phase = 'failed';
    this.submitMessage = message;
    this.renderProgress = null;
    this.changeDetectorRef.markForCheck();
  }

  private cancelActiveOperation(incrementGeneration = true): void {
    if (incrementGeneration) {
      this.renderGeneration++;
    }
    this.awaitingSectionId = null;
    this.pendingBuild = null;
  }

  private evaluateAllSectionBadges(successMessage: string): void {
    this.runFullValidation(() => {
      const errorCount = this.model.validationResults?.length ?? 0;
      this.submitMessage = errorCount
        ? `${successMessage} ${errorCount} error(s) found.`
        : `${successMessage} No errors found.`;
      this.changeDetectorRef.markForCheck();
    });
  }

  private runFullValidation(onComplete?: () => void): void {
    this.validationProvider.evaluatePolicies(
      this.model,
      this.sectionPolicyNames,
      this.policyGroupName
    ).subscribe({
      next: () => {
        this.commitBadgeState();
        onComplete?.();
      }
    });
  }

  private commitBadgeState(): void {
    this.allSectionMetas.forEach((section) => {
      this.validationProvider.evaluateFormGroup(this.model, section.groupName, section.policyName);
    });
    this.validationProvider.updatePolicyGroupStatus(this.model, this.policyGroupName);
    this.validationProvider.notifyValidationRefresh(this.model);
  }

  private bindValidationRefresh(): void {
    this.refreshSubscription?.unsubscribe();

    if (!this.model) {
      return;
    }

    this.refreshSubscription = this.validationProvider.onValidationRefresh(this.model)
      .subscribe(() => this.changeDetectorRef.markForCheck());
  }
}
