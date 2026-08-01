import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getValidationMeta } from '@validation-rules-engine/core';
import { ValidationProviderService } from '../services/validation-provider.service';
import { ValidationGroupStatusComponent } from './validation-group-status.component';
import { ValidationGroupSummaryComponent } from './validation-group-summary.component';
import { ValidationPolicyGroupStatusComponent } from './validation-policy-group-status.component';
import { ValidationPolicyGroupSummaryComponent } from './validation-policy-group-summary.component';
import { ValidationSummaryComponent } from './validation-summary.component';

describe('validation status and summary components', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ValidationSummaryComponent,
        ValidationGroupStatusComponent,
        ValidationGroupSummaryComponent,
        ValidationPolicyGroupStatusComponent,
        ValidationPolicyGroupSummaryComponent
      ],
      imports: [CommonModule],
      providers: [ValidationProviderService]
    }).compileComponents();
  });

  function fixtureFor<T>(type: new (...args: any[]) => T): ComponentFixture<T> {
    return TestBed.createComponent(type);
  }

  it('shows the global summary only after show-all and lists all messages', () => {
    const fixture = fixtureFor(ValidationSummaryComponent);
    fixture.componentInstance.model = {
      validationResults: [
        { propertyName: 'name', error: { message: 'Name required' } },
        { propertyName: 'email', error: { message: 'Email invalid' } }
      ]
    };
    fixture.componentInstance.title = 'Fix these:';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

    getValidationMeta(fixture.componentInstance.model).showAllErrors = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('strong').textContent).toContain('Fix these:');
    expect(Array.from(fixture.nativeElement.querySelectorAll('li')).map((node: any) => node.textContent.trim()))
      .toEqual(['Name required', 'Email invalid']);

    fixture.componentInstance.showWhen = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('returns an empty global error list when validation results are absent', () => {
    const component = new ValidationSummaryComponent();
    component.model = {};
    expect(component.errors).toEqual([]);
    expect(component.visible).toBeFalse();
  });

  it('renders pending, valid, and invalid form-group badges', () => {
    const fixture = fixtureFor(ValidationGroupStatusComponent);
    fixture.componentInstance.model = {};
    fixture.componentInstance.groupName = 'main';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not validated');
    expect(fixture.componentInstance.status).toBeUndefined();

    fixture.componentRef.setInput('model', {
      main: { isEvaluated: true, isValid: true, isInValid: false }
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Valid');
    expect(fixture.nativeElement.querySelector('.bg-success')).not.toBeNull();

    fixture.componentRef.setInput('model', {
      main: { isEvaluated: true, isValid: false, isInValid: true }
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Invalid');
    expect(fixture.nativeElement.querySelector('.bg-danger')).not.toBeNull();
  });

  it('subscribes form-group badges to model refresh and rebinds or cleans up safely', () => {
    const service = new ValidationProviderService();
    const changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('changeDetector', ['markForCheck']);
    const component = new ValidationGroupStatusComponent(changeDetector, service);
    const first = {};
    const second = {};

    component.model = first;
    component.ngOnChanges({ model: new SimpleChange(undefined, first, true) });
    service.notifyValidationRefresh(first);
    expect(changeDetector.markForCheck).toHaveBeenCalledTimes(1);

    component.model = second;
    component.ngOnChanges({ model: new SimpleChange(first, second, false) });
    service.notifyValidationRefresh(first);
    service.notifyValidationRefresh(second);
    expect(changeDetector.markForCheck).toHaveBeenCalledTimes(2);

    component.ngOnDestroy();
    service.notifyValidationRefresh(second);
    expect(changeDetector.markForCheck).toHaveBeenCalledTimes(2);

    component.model = null;
    component.ngOnChanges({ model: new SimpleChange(second, null, false) });
  });

  it('renders a form-group summary only for evaluated groups with errors', () => {
    const fixture = fixtureFor(ValidationGroupSummaryComponent);
    fixture.componentInstance.model = { main: { isEvaluated: false, errors: [] } };
    fixture.componentInstance.groupName = 'main';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

    fixture.componentInstance.model.main = {
      isEvaluated: true,
      isValid: false,
      isInValid: true,
      errors: [{ propertyName: 'name', error: { message: 'Name required' } }]
    };
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Name required');
    expect(fixture.componentInstance.status).toBe(fixture.componentInstance.model.main);
  });

  it('renders pending and evaluated policy-group badges', () => {
    const fixture = fixtureFor(ValidationPolicyGroupStatusComponent);
    fixture.componentInstance.model = {};
    fixture.componentInstance.policyGroupName = 'checkout';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not validated');

    fixture.componentRef.setInput('model', {
      checkout: { isEvaluated: true, isValid: true, isInValid: false }
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('All sections valid');

    fixture.componentRef.setInput('model', {
      checkout: { isEvaluated: true, isValid: false, isInValid: true }
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Has errors');
    expect(fixture.componentInstance.status).toBe(fixture.componentInstance.model.checkout);
  });

  it('subscribes policy-group badges to refresh and unsubscribes on rebind and destroy', () => {
    const service = new ValidationProviderService();
    const changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('changeDetector', ['markForCheck']);
    const component = new ValidationPolicyGroupStatusComponent(changeDetector, service);
    const model = {};

    component.model = model;
    component.ngOnChanges({ model: new SimpleChange(undefined, model, true) });
    service.notifyValidationRefresh(model);
    expect(changeDetector.markForCheck).toHaveBeenCalledOnceWith();

    component.ngOnDestroy();
    service.notifyValidationRefresh(model);
    expect(changeDetector.markForCheck).toHaveBeenCalledTimes(1);

    component.model = null;
    component.ngOnChanges({ model: new SimpleChange(model, null, false) });
  });

  it('renders policy-group summaries only for evaluated errors', () => {
    const fixture = fixtureFor(ValidationPolicyGroupSummaryComponent);
    fixture.componentInstance.model = { checkout: { isEvaluated: true, errors: [] } };
    fixture.componentInstance.policyGroupName = 'checkout';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

    fixture.componentInstance.model.checkout = {
      isEvaluated: true,
      isValid: false,
      isInValid: true,
      errors: [{ propertyName: 'name', error: { message: 'Name required' } }]
    };
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Name required');
    expect(fixture.componentInstance.status).toBe(fixture.componentInstance.model.checkout);
  });
});
