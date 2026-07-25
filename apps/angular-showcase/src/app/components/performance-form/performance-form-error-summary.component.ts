import { Component, Input } from '@angular/core';
import { ValidationResult } from '@validation-rules/angular';
import { PerformanceFormModel, PerformanceSectionMeta } from '../../models/performance-form.model';

export interface PerformanceErrorGroup {
  sectionId: string;
  title: string;
  errors: ValidationResult[];
}

@Component({
  selector: 'app-performance-form-error-summary',
  standalone: false,
  templateUrl: './performance-form-error-summary.component.html',
  styleUrls: ['./performance-form-error-summary.component.sass']
})
export class PerformanceFormErrorSummaryComponent {
  @Input() model!: PerformanceFormModel;
  @Input() sections: PerformanceSectionMeta[] = [];
  @Input() title = 'All errors on this page:';

  summaryCollapsed = false;
  private collapsedGroups = new Set<string>();

  get visible(): boolean {
    const meta = (this.model as { _policyValidationMeta?: { showAllErrors: boolean } })?._policyValidationMeta;
    return !!meta?.showAllErrors && this.totalErrorCount > 0;
  }

  get totalErrorCount(): number {
    return this.model?.validationResults?.length ?? 0;
  }

  get groupedErrors(): PerformanceErrorGroup[] {
    const results = this.model?.validationResults ?? [];
    const sectionLookup = new Map(this.sections.map((section) => [section.id, section]));
    const groups = new Map<string, ValidationResult[]>();

    for (const result of results) {
      const match = /^sections\.([^.]+)\./.exec(result.propertyName);
      const sectionId = match?.[1] ?? '_other';
      const bucket = groups.get(sectionId) ?? [];
      bucket.push(result);
      groups.set(sectionId, bucket);
    }

    const ordered: PerformanceErrorGroup[] = [];

    for (const section of this.sections) {
      const errors = groups.get(section.id);
      if (errors?.length) {
        ordered.push({
          sectionId: section.id,
          title: section.title,
          errors
        });
        groups.delete(section.id);
      }
    }

    for (const [sectionId, errors] of groups) {
      if (!errors.length) {
        continue;
      }

      const section = sectionLookup.get(sectionId);
      ordered.push({
        sectionId,
        title: section?.title ?? sectionId,
        errors
      });
    }

    return ordered;
  }

  toggleSummaryCollapsed(): void {
    this.summaryCollapsed = !this.summaryCollapsed;
  }

  isGroupCollapsed(sectionId: string): boolean {
    return this.collapsedGroups.has(sectionId);
  }

  toggleGroup(sectionId: string): void {
    if (this.collapsedGroups.has(sectionId)) {
      this.collapsedGroups.delete(sectionId);
    } else {
      this.collapsedGroups.add(sectionId);
    }
  }

  collapseAllGroups(): void {
    this.groupedErrors.forEach((group) => this.collapsedGroups.add(group.sectionId));
  }

  expandAllGroups(): void {
    this.collapsedGroups.clear();
  }

  trackGroup(_index: number, group: PerformanceErrorGroup): string {
    return group.sectionId;
  }
}
