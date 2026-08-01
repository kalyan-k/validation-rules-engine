import { convertToParamMap } from '@angular/router';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { ValidationProviderService } from '@validation-rules-engine/angular';
import {
  ANGULAR_STATE_PAGES,
  ANGULAR_STATE_STRATEGIES,
  AngularStateComplexAddressPolicy,
  AngularStateComplexCompliancePolicy,
  AngularStateComplexContactsPolicy,
  AngularStateComplexIdentityPolicy,
  AngularStateSimplePolicy,
  createComplexModel,
  createSimpleModel,
  invalidComplexModel,
  sampleComplexModel,
  sampleSimpleModel,
  strategyById
} from './angular-state-showcase.model';
import { AngularStateShowcaseComponent } from './angular-state-showcase.component';
import {
  AngularStateShowcaseNgxsState,
  AngularStateStrategyRuntime,
  CommitAngularStateSnapshot,
  angularStateShowcaseReducer,
  angularStateSnapshotCommitted,
  createAngularStateRuntimeSnapshot
} from './angular-state-runtime.service';

describe('Angular state-management showcase metadata and policies', () => {
  let validation: ValidationProviderService;

  beforeEach(() => {
    validation = new ValidationProviderService();
  });

  it('exposes the same four pages for every supported Angular state strategy', () => {
    expect(ANGULAR_STATE_PAGES.map((page) => page.label)).toEqual([
      'Overview',
      'Simple Form',
      'Complex Form',
      'Performance Form'
    ]);
    expect(ANGULAR_STATE_STRATEGIES.map((strategy) => strategy.id)).toEqual([
      'template-driven',
      'reactive-forms',
      'ngrx',
      'ngxs',
      'akita',
      'elf',
      'rx-angular-state',
      'signals',
      'custom-rxjs-store'
    ]);
    expect(ANGULAR_STATE_STRATEGIES.every((strategy) => strategy.docsSlug.startsWith('angular-'))).toBeTrue();
  });

  it('falls back to the template-driven strategy and default dynamic policy sizes', async () => {
    expect(strategyById('missing-state-library').id).toBe('template-driven');
    expect(strategyById(null).id).toBe('template-driven');

    validation.replacePolicy('DefaultAddresses', new AngularStateComplexAddressPolicy());
    validation.replacePolicy('DefaultContacts', new AngularStateComplexContactsPolicy());
    const model = createComplexModel();

    await firstValueFrom(validation.evaluatePolicies(model, ['DefaultAddresses', 'DefaultContacts']));

    expect(model.validationResults?.map((result) => result.propertyName)).toContain('addresses.0.line1');
    expect(model.validationResults?.map((result) => result.propertyName)).toContain('contacts.0.email');
  });

  it('validates the simple profile form and accepts sample data', async () => {
    validation.replacePolicy('AngularStateSimple', new AngularStateSimplePolicy());
    const invalid = createSimpleModel();

    await firstValueFrom(validation.validateAll(invalid, 'AngularStateSimple'));
    expect(invalid.validationResults?.map((result) => result.propertyName)).toEqual([
      'firstName',
      'lastName',
      'email',
      'phone',
      'country',
      'startDate',
      'accepted',
      'contactPreference',
      'role'
    ]);

    const valid = sampleSimpleModel();
    await firstValueFrom(validation.validateAll(valid, 'AngularStateSimple'));
    expect(valid.validationResults).toBeUndefined();
  });

  it('validates complex enterprise groups, dynamic collections, and conditional policies', async () => {
    const invalid = invalidComplexModel();
    registerComplexPolicies(validation, invalid);

    await firstValueFrom(validation.evaluatePolicies(invalid, [
      'AngularStateComplexIdentity',
      'AngularStateComplexAddresses',
      'AngularStateComplexContacts',
      'AngularStateComplexCompliance'
    ], 'angularStateComplex'));

    expect(invalid.validationResults?.some((result) => result.propertyName === 'profile.secondaryEmail')).toBeTrue();
    expect(invalid.validationResults?.some((result) => result.propertyName === 'compliance.caseId')).toBeTrue();
    expect(invalid.angularStateComplex?.isInValid).toBeTrue();

    const valid = sampleComplexModel();
    valid.policyMode = 'regulated';
    valid.compliance.caseId = 'CASE-1001';
    registerComplexPolicies(validation, valid);
    await firstValueFrom(validation.evaluatePolicies(valid, [
      'AngularStateComplexIdentity',
      'AngularStateComplexAddresses',
      'AngularStateComplexContacts',
      'AngularStateComplexCompliance'
    ], 'angularStateComplex'));

    expect(valid.validationResults).toBeUndefined();
    expect(valid.angularStateComplex?.isValid).toBeTrue();
  });
});

describe('AngularStateStrategyRuntime', () => {
  it('commits snapshots through each state-management mechanism', () => {
    const ngrxStore = jasmine.createSpyObj('ngrxStore', ['dispatch']);
    const ngxsStore = jasmine.createSpyObj('ngxsStore', ['dispatch']);
    const rxAngularState = jasmine.createSpyObj('rxAngularState', ['set']);
    ngxsStore.dispatch.and.returnValue(of(undefined));
    const runtime = new AngularStateStrategyRuntime(ngrxStore, ngxsStore, rxAngularState);
    const simple = sampleSimpleModel();
    const complex = sampleComplexModel();

    runtime.initialize('template-driven', simple, complex);
    runtime.commitSimple('reactive-forms', simple, 'editing', 'Reactive edit.');
    runtime.commitSimple('ngrx', simple, 'valid', 'NgRx commit.');
    runtime.commitSimple('ngxs', simple, 'valid', 'NGXS commit.');
    runtime.commitComplex('akita', complex, 'saved', 'Akita commit.');
    runtime.commitComplex('elf', complex, 'saved', 'Elf commit.');
    runtime.commitComplex('rx-angular-state', complex, 'saved', 'RxAngular commit.');
    runtime.commitComplex('signals', complex, 'invalid', 'Signals commit.');
    runtime.commitComplex('custom-rxjs-store', complex, 'editing', 'RxJS commit.');

    expect(ngrxStore.dispatch).toHaveBeenCalledWith(jasmine.objectContaining({ type: '[Angular State Showcase] Snapshot Committed' }));
    expect(ngxsStore.dispatch).toHaveBeenCalledWith(jasmine.any(CommitAngularStateSnapshot));
    expect(rxAngularState.set).toHaveBeenCalled();
    expect(runtime.snapshot().strategyId).toBe('custom-rxjs-store');
    expect(runtime.snapshot().lastEvent).toBe('RxJS commit.');

    runtime.ngOnDestroy();
  });

  it('stores snapshots through reducer and NGXS handler helpers', () => {
    const snapshot = createAngularStateRuntimeSnapshot('ngrx', sampleSimpleModel(), sampleComplexModel(), 'valid', 'done');
    expect(angularStateShowcaseReducer(undefined, angularStateSnapshotCommitted({ snapshot }))).toBe(snapshot);

    const state = new AngularStateShowcaseNgxsState();
    const context = jasmine.createSpyObj('context', ['setState']);
    state.commit(context, new CommitAngularStateSnapshot(snapshot));
    expect(context.setState).toHaveBeenCalledWith(snapshot);
    expect(AngularStateShowcaseNgxsState.snapshot(snapshot)).toBe(snapshot);
  });
});

describe('AngularStateShowcaseComponent', () => {
  let component: AngularStateShowcaseComponent;
  let validation: ValidationProviderService;
  let runtime: jasmine.SpyObj<AngularStateStrategyRuntime>;
  let paramMap: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let data: BehaviorSubject<{ page?: string }>;

  beforeEach(() => {
    validation = new ValidationProviderService();
    runtime = jasmine.createSpyObj<AngularStateStrategyRuntime>('runtime', [
      'initialize',
      'commitSimple',
      'commitComplex',
      'snapshot'
    ]);
    runtime.snapshot.and.returnValue(createAngularStateRuntimeSnapshot());
    paramMap = new BehaviorSubject(convertToParamMap({ strategy: 'ngrx' }));
    data = new BehaviorSubject<{ page?: string }>({ page: 'simple' });
    component = new AngularStateShowcaseComponent({ paramMap, data } as any, validation, runtime);
    component.ngOnInit();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('tracks route strategy, page labels, docs links, and router links', () => {
    expect(component.strategy.id).toBe('ngrx');
    expect(component.page).toBe('simple');
    expect(component.currentPageLabel).toBe('Simple Form');
    expect(component.docsLink).toContain('/docs/angular-state-ngrx');
    expect(component.pageRouterLink(ANGULAR_STATE_PAGES[0])).toEqual(['/state', 'ngrx']);
    expect(component.pageRouterLink(ANGULAR_STATE_PAGES[1])).toEqual(['/state', 'ngrx', 'simple']);
    expect(component.strategyRouterLink('signals')).toEqual(['/state', 'signals']);
    expect(component.trackStrategy(0, component.strategy)).toBe('ngrx');
    expect(component.trackPage(0, ANGULAR_STATE_PAGES[0])).toBe('overview');
    expect(component.trackByIndex(7)).toBe(7);
  });

  it('falls back to overview labels and preserves models when route strategy is unchanged', () => {
    component.simpleModel.firstName = 'Dirty';
    data.next({ page: 'complex' });

    expect(component.strategy.id).toBe('ngrx');
    expect(component.page).toBe('complex');
    expect(component.simpleModel.firstName).toBe('Dirty');

    component.page = 'missing' as any;
    expect(component.currentPageLabel).toBe('Overview');
  });

  it('uses default sync messages and route fallbacks', () => {
    const simple = component.simpleModel;
    const complex = component.complexModel;

    component.syncSimpleState();
    component.syncComplexState();
    paramMap.next(convertToParamMap({ strategy: 'unknown-state' }));
    data.next({});

    expect(component.strategy.id).toBe('template-driven');
    expect(component.page).toBe('overview');
    expect(runtime.commitSimple).toHaveBeenCalledWith('ngrx', simple, 'editing', 'Simple form edited.');
    expect(runtime.commitComplex).toHaveBeenCalledWith('ngrx', complex, 'editing', 'Complex form edited.');
  });

  it('submits, populates, syncs, and resets the simple form', () => {
    component.submitSimple();
    expect(component.simpleMessage).toContain('validation error');
    expect(runtime.commitSimple).toHaveBeenCalledWith('ngrx', component.simpleModel, 'invalid', component.simpleMessage);

    component.populateSimple();
    component.syncSimpleState('manual sync');
    component.submitSimple();
    expect(component.simpleMessage).toBe('Simple form submitted successfully.');

    component.resetSimple();
    expect(component.simpleModel.firstName).toBe('');
    expect(component.simpleMessage).toBe('');
  });

  it('runs complex form structure changes, policy switches, validation, save, and reset', () => {
    component.populateComplexInvalid();
    component.validateComplex();
    expect(component.complexMessage).toContain('validation error');

    component.addAddress();
    component.addContact();
    expect(component.complexModel.addresses.length).toBe(2);
    expect(component.complexModel.contacts.length).toBe(2);
    component.removeAddress(1);
    component.removeContact(1);
    expect(component.complexModel.addresses.length).toBe(1);
    expect(component.complexModel.contacts.length).toBe(1);
    component.removeAddress(0);
    component.removeContact(0);
    expect(component.complexModel.addresses.length).toBe(1);
    expect(component.complexModel.contacts.length).toBe(1);

    component.setPolicyMode('regulated');
    component.complexModel.profile.secondaryEmailEnabled = false;
    component.onSecondaryEmailToggle();
    expect(component.complexModel.profile.secondaryEmail).toBe('');
    component.complexModel.profile.secondaryEmailEnabled = true;
    component.complexModel.profile.secondaryEmail = 'secondary@example.com';
    component.onSecondaryEmailToggle();
    expect(component.complexModel.profile.secondaryEmail).toBe('secondary@example.com');

    component.populateComplexSample();
    component.validateComplex();
    expect(component.complexMessage).toBe('Programmatic validation completed with no errors.');
    component.complexModel.policyMode = 'regulated';
    component.complexModel.compliance.caseId = 'CASE-2002';
    component.saveComplex();
    expect(component.complexMessage).toBe('Complex form saved successfully.');

    component.resetComplex();
    expect(component.complexModel.profile.firstName).toBe('');
  });

  it('resets models when the route switches to another state strategy', () => {
    component.simpleModel.firstName = 'Dirty';
    paramMap.next(convertToParamMap({ strategy: 'signals' }));
    data.next({ page: 'complex' });

    expect(component.strategy.id).toBe('signals');
    expect(component.page).toBe('complex');
    expect(component.simpleModel.firstName).toBe('');
    expect(runtime.initialize).toHaveBeenCalledWith('signals', component.simpleModel, component.complexModel);
  });
});

function registerComplexPolicies(validation: ValidationProviderService, model: ReturnType<typeof createComplexModel>): void {
  validation.replacePolicy('AngularStateComplexIdentity', new AngularStateComplexIdentityPolicy());
  validation.replacePolicy('AngularStateComplexAddresses', new AngularStateComplexAddressPolicy(model.addresses.length));
  validation.replacePolicy('AngularStateComplexContacts', new AngularStateComplexContactsPolicy(model.contacts.length));
  validation.replacePolicy('AngularStateComplexCompliance', new AngularStateComplexCompliancePolicy());
  validation.registerFormGroupPolicy('identityGroup', 'AngularStateComplexIdentity');
  validation.registerFormGroupPolicy('addressGroup', 'AngularStateComplexAddresses');
  validation.registerFormGroupPolicy('contactGroup', 'AngularStateComplexContacts');
  validation.registerFormGroupPolicy('complianceGroup', 'AngularStateComplexCompliance');
  validation.formGroup['identityGroup'] = ['profile.firstName', 'profile.lastName', 'profile.email', 'profile.phone'];
  validation.formGroup['addressGroup'] = model.addresses.flatMap((_address, index) => [
    `addresses.${index}.type`,
    `addresses.${index}.line1`,
    `addresses.${index}.city`,
    `addresses.${index}.region`,
    `addresses.${index}.postalCode`,
    `addresses.${index}.country`
  ]);
  validation.formGroup['contactGroup'] = model.contacts.flatMap((_contact, index) => [
    `contacts.${index}.name`,
    `contacts.${index}.email`,
    `contacts.${index}.phone`,
    `contacts.${index}.relationship`
  ]);
  validation.formGroup['complianceGroup'] = ['profile.secondaryEmail', 'compliance.approver', 'compliance.riskTier', 'compliance.caseId'];
  validation.registerPolicyGroup('angularStateComplex', {
    policies: [
      'AngularStateComplexIdentity',
      'AngularStateComplexAddresses',
      'AngularStateComplexContacts',
      'AngularStateComplexCompliance'
    ],
    formGroups: ['identityGroup', 'addressGroup', 'contactGroup', 'complianceGroup']
  });
}
