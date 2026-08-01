import {
  ChangeDetectorRef,
  ElementRef,
  IterableDiffers,
  NgZone,
  Renderer2,
  RendererFactory2
} from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { getValidationMeta, ValidationPolicy, Validator, ValidatorHelper } from '@validation-rules-engine/core';
import { ValidationDisplayStrategy } from '../interfaces/validation-display.interface';
import { ValidationProviderService } from '../services/validation-provider.service';
import { ValidatorDirective } from './validator.directive';

class NamePolicy implements ValidationPolicy {
  addValidations(helper: ValidatorHelper): Validator[] {
    return [helper.validateFor('profile.name').isRequired('Name required')];
  }
}

describe('ValidatorDirective', () => {
  let validationService: ValidationProviderService;
  let differs: IterableDiffers;
  let renderer: Renderer2;
  let changeDetector: jasmine.SpyObj<ChangeDetectorRef>;
  let zone: NgZone;
  let display: jasmine.SpyObj<ValidationDisplayStrategy>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    validationService = new ValidationProviderService();
    differs = TestBed.inject(IterableDiffers);
    renderer = TestBed.inject(RendererFactory2).createRenderer(null, null);
    changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('changeDetector', ['markForCheck', 'detectChanges']);
    zone = TestBed.inject(NgZone);
    display = jasmine.createSpyObj<ValidationDisplayStrategy>('display', [
      'detectControlType',
      'ensureErrorContainer',
      'getErrorContainer',
      'renderErrors',
      'clearErrors',
      'renderRequiredIndicator'
    ]);
    display.detectControlType.and.returnValue('input');
  });

  function createDirective(host: HTMLElement): ValidatorDirective {
    return new ValidatorDirective(
      validationService,
      differs,
      new ElementRef(host),
      renderer,
      changeDetector,
      zone,
      display,
      null
    );
  }

  function configureActive(directive: ValidatorDirective, model: any): void {
    validationService.register('Name', new NamePolicy());
    directive.validateModel = 'form.profile.name';
    directive.actualModel = model;
    directive.withPolicy = 'Name';
    directive.groupName = 'profileGroup';
  }

  it('parses simple and dotted binding paths', () => {
    const directive = createDirective(document.createElement('input'));
    expect(directive.parseDottedPath('name')).toEqual({ entityPath: undefined, propertyPath: 'name' });
    expect(directive.parseDottedPath('form.profile.name')).toEqual({
      entityPath: 'form', propertyPath: 'profile.name'
    });
  });

  it('does not initialize display behavior for an unknown policy', () => {
    const directive = createDirective(document.createElement('input'));
    directive.validateModel = 'form.name';
    directive.actualModel = {};
    directive.withPolicy = 'Missing';

    directive.ngOnInit();
    directive.ngDoCheck();
    directive.ngAfterViewInit();

    expect(display.detectControlType).not.toHaveBeenCalled();
    expect(changeDetector.markForCheck).not.toHaveBeenCalled();
  });

  it('binds a policy, detects the control, and registers a field once per form group', () => {
    const input = document.createElement('input');
    const model = { profile: { name: '' }, validationResults: [] };
    const directive = createDirective(input);
    configureActive(directive, model);

    directive.ngOnInit();
    validationService.notifyValidationRefresh(model);
    validationService.notifyValidationRefresh(model);

    expect(display.detectControlType).toHaveBeenCalledWith(input);
    expect(directive.modelInfo).toEqual({ entityPath: 'form', propertyPath: 'profile.name' });
    expect(validationService.formGroup['profileGroup']).toEqual(['profile.name']);
    expect(display.clearErrors).toHaveBeenCalled();
    expect(display.renderRequiredIndicator).toHaveBeenCalled();
  });

  it('initializes required markers after view init and marks for check', fakeAsync(() => {
    const directive = createDirective(document.createElement('input'));
    configureActive(directive, { profile: { name: '' } });
    directive.ngOnInit();

    directive.ngAfterViewInit();
    tick();

    expect(display.renderRequiredIndicator).toHaveBeenCalledWith(
      jasmine.objectContaining({ propertyPath: 'profile.name' }),
      jasmine.objectContaining({ propertyName: 'profile.name', isRequired: true }),
      renderer
    );
    expect(changeDetector.markForCheck).toHaveBeenCalled();
  }));

  it('validates on blur, marks the field touched, renders errors, and evaluates its group', fakeAsync(() => {
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    wrapper.appendChild(input);
    document.body.appendChild(wrapper);
    const model: any = { profile: { name: '' } };
    const directive = createDirective(input);
    configureActive(directive, model);
    directive.ngOnInit();
    directive.ngAfterViewInit();
    tick();
    display.renderErrors.calls.reset();

    input.dispatchEvent(new Event('blur'));
    tick();

    expect(getValidationMeta(model).touchedFields['profile.name']).toBeTrue();
    expect(model.validationResults).toEqual([
      { propertyName: 'profile.name', error: { message: 'Name required' } }
    ]);
    expect(display.renderErrors).toHaveBeenCalledWith(
      jasmine.objectContaining({ propertyPath: 'profile.name' }),
      model.validationResults,
      renderer
    );
    expect(model.profileGroup).toBeDefined();
    expect(changeDetector.detectChanges).toHaveBeenCalled();
    wrapper.remove();
  }));

  it('honors a custom validation event and updates conditional required state on input', fakeAsync(() => {
    const input = document.createElement('input');
    const model: any = { profile: { name: '' } };
    const directive = createDirective(input);
    configureActive(directive, model);
    directive.validateOnEvent = 'change';
    directive.ngOnInit();
    directive.ngAfterViewInit();
    tick();
    display.renderRequiredIndicator.calls.reset();

    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
    tick();

    expect(display.renderRequiredIndicator).toHaveBeenCalled();
    expect(model.validationResults?.length).toBe(1);
  }));

  it('delays checkbox validation and also listens for blur', fakeAsync(() => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    display.detectControlType.and.returnValue('checkbox');
    const model: any = { profile: { name: '' } };
    const directive = createDirective(input);
    configureActive(directive, model);
    directive.ngOnInit();
    directive.ngAfterViewInit();
    tick();

    input.dispatchEvent(new Event('change'));
    tick(199);
    expect(model.validationResults).toBeUndefined();
    tick(1);
    expect(model.validationResults?.length).toBe(1);

    model.profile.name = 'Ada';
    input.dispatchEvent(new Event('blur'));
    tick(200);
    expect(model.validationResults).toBeUndefined();
  }));

  it('binds every native radio in a radio-group host', fakeAsync(() => {
    const fieldset = document.createElement('fieldset');
    fieldset.innerHTML = '<input type="radio"><input type="radio">';
    display.detectControlType.and.returnValue('radio-group');
    const model: any = { profile: { name: '' } };
    const directive = createDirective(fieldset);
    configureActive(directive, model);
    directive.ngOnInit();
    directive.ngAfterViewInit();
    tick();

    fieldset.querySelector('input')!.dispatchEvent(new Event('change'));
    tick(200);

    expect(model.validationResults?.length).toBe(1);
  }));

  it('discovers native event targets inside Material-style hosts', () => {
    const cases: Array<[string, string, number]> = [
      ['mat-checkbox', '<input type="checkbox">', 2],
      ['mat-select', '', 1],
      ['mat-radio-group', '<input type="radio"><input type="radio">', 2]
    ];

    cases.forEach(([tag, html, expected]) => {
      const host = document.createElement(tag);
      host.innerHTML = html;
      const directive = createDirective(host);
      expect((directive as any).getValidationEventTargets().length).toBe(expected);
    });
  });

  it('synchronizes iterable changes and avoids duplicate UI writes', () => {
    const model: any = { profile: { name: '' }, validationResults: [], requiredResults: [] };
    const directive = createDirective(document.createElement('input'));
    configureActive(directive, model);
    directive.ngOnInit();

    directive.runcheck();
    model.validationResults.push({ propertyName: 'profile.name', error: { message: 'Name required' } });
    model.requiredResults.push({ propertyName: 'profile.name', isRequired: true, hasRequiredError: true });
    markTouchedAndCheck(directive, model);

    expect(display.renderErrors).toHaveBeenCalledTimes(1);
    expect(display.renderRequiredIndicator).toHaveBeenCalled();

    directive.ngDoCheck();
    expect(display.renderErrors).toHaveBeenCalledTimes(1);
  });

  function markTouchedAndCheck(directive: ValidatorDirective, model: any): void {
    getValidationMeta(model).touchedFields['profile.name'] = true;
    directive.ngDoCheck();
  }

  it('clears hidden or removed field errors and renders forced refreshes', () => {
    const model: any = { profile: { name: '' }, validationResults: [] };
    const directive = createDirective(document.createElement('input'));
    configureActive(directive, model);
    directive.ngOnInit();

    (directive as any).syncValidationUi();
    expect(display.clearErrors).not.toHaveBeenCalled();

    getValidationMeta(model).showAllErrors = true;
    model.validationResults = [{ propertyName: 'profile.name', error: { message: 'Name required' } }];
    (directive as any).syncValidationUi();
    (directive as any).syncValidationUi();
    expect(display.renderErrors).toHaveBeenCalledTimes(1);

    model.validationResults = [];
    (directive as any).syncValidationUi();
    expect(display.clearErrors).toHaveBeenCalled();

    validationService.notifyValidationRefresh(model);
    expect(display.clearErrors).toHaveBeenCalledTimes(2);
  });

  it('stops listeners and refresh subscriptions on destroy', fakeAsync(() => {
    const input = document.createElement('input');
    const model: any = { profile: { name: '' } };
    const directive = createDirective(input);
    configureActive(directive, model);
    directive.ngOnInit();
    directive.ngAfterViewInit();
    tick();
    display.renderRequiredIndicator.calls.reset();

    directive.ngOnDestroy();
    input.dispatchEvent(new Event('blur'));
    validationService.notifyValidationRefresh(model);
    tick();

    expect(display.renderRequiredIndicator).not.toHaveBeenCalled();
  }));

  it('falls back to the default display strategy when no strategy is injected', () => {
    const directive = new ValidatorDirective(
      validationService,
      differs,
      new ElementRef(document.createElement('input')),
      renderer,
      changeDetector,
      zone,
      null,
      { framework: 'auto' }
    );
    expect((directive as any).displayStrategy).toBeDefined();
  });
});
