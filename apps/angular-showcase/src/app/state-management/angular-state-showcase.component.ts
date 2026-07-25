import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ValidationProviderService } from '@validation-rules/angular';
import { RxState } from '@rx-angular/state';
import { combineLatest, Subscription } from 'rxjs';
import { platformUrl } from '../platform-urls';
import {
  ANGULAR_STATE_PAGES,
  ANGULAR_STATE_STRATEGIES,
  AngularStateComplexAddressPolicy,
  AngularStateComplexCompliancePolicy,
  AngularStateComplexContactsPolicy,
  AngularStateComplexIdentityPolicy,
  AngularStateComplexModel,
  AngularStatePage,
  AngularStatePageLink,
  AngularStateSimpleModel,
  AngularStateSimplePolicy,
  AngularStateStrategy,
  AngularStateStrategyId,
  ComplexPolicyMode,
  SIMPLE_FORM_FIELDS,
  createComplexModel,
  createSimpleModel,
  emptyAngularStateAddress,
  emptyAngularStateContact,
  invalidComplexModel,
  sampleComplexModel,
  sampleSimpleModel,
  strategyById
} from './angular-state-showcase.model';
import { AngularStateStrategyRuntime } from './angular-state-runtime.service';

@Component({
  selector: 'app-angular-state-showcase',
  standalone: false,
  templateUrl: './angular-state-showcase.component.html',
  styleUrls: ['./angular-state-showcase.component.sass'],
  providers: [AngularStateStrategyRuntime, RxState]
})
export class AngularStateShowcaseComponent implements OnInit, OnDestroy {
  readonly strategies = ANGULAR_STATE_STRATEGIES;
  readonly pages = ANGULAR_STATE_PAGES;
  readonly simplePolicyName = 'AngularStateSimple';
  readonly simpleGroupName = 'angularStateSimpleProfile';
  readonly simplePolicyGroupName = 'angularStateSimple';
  readonly complexPolicyGroupName = 'angularStateComplex';
  readonly complexPolicyNames = [
    'AngularStateComplexIdentity',
    'AngularStateComplexAddresses',
    'AngularStateComplexContacts',
    'AngularStateComplexCompliance'
  ];
  readonly countryOptions = ['United States', 'Canada', 'United Kingdom', 'India', 'Australia'];
  readonly roleOptions = ['Developer', 'Product Manager', 'Director', 'Compliance Owner', 'Support Lead'];
  readonly contactPreferenceOptions = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'sms', label: 'SMS' }
  ];
  readonly employeeTypeOptions = ['Full-time', 'Contractor', 'Partner', 'Vendor'];
  readonly notificationOptions = ['Daily', 'Weekly', 'Monthly'];
  readonly riskTierOptions = ['Low', 'Medium', 'High'];
  readonly docsBaseUrl = platformUrl('docs', '/docs/');
  readonly portalUrl = platformUrl('portal');

  strategy: AngularStateStrategy = ANGULAR_STATE_STRATEGIES[0];
  page: AngularStatePage = 'overview';
  simpleModel: AngularStateSimpleModel = createSimpleModel();
  complexModel: AngularStateComplexModel = createComplexModel();
  simpleMessage = '';
  complexMessage = '';

  private routeSubscription?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly validationProvider: ValidationProviderService,
    private readonly runtime: AngularStateStrategyRuntime
  ) {}

  ngOnInit(): void {
    this.routeSubscription = combineLatest([this.route.paramMap, this.route.data])
      .subscribe(([params, data]) => {
        const nextStrategy = strategyById(params.get('strategy'));
        const nextPage = (data['page'] as AngularStatePage | undefined) ?? 'overview';
        const strategyChanged = nextStrategy.id !== this.strategy.id;
        this.strategy = nextStrategy;
        this.page = nextPage;

        if (strategyChanged) {
          this.resetAllModels();
        }
      });

    this.configureSimplePolicy();
    this.configureComplexPolicies();
    this.runtime.initialize(this.strategy.id, this.simpleModel, this.complexModel);
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.teardownPolicies();
  }

  get docsLink(): string {
    return `${this.docsBaseUrl}${this.strategy.docsSlug}`;
  }

  get currentPageLabel(): string {
    return this.pages.find((pageLink) => pageLink.page === this.page)?.label ?? 'Overview';
  }

  get runtimeLifecycle(): string {
    return this.runtime.snapshot().lifecycle;
  }

  get runtimeLastEvent(): string {
    return this.runtime.snapshot().lastEvent;
  }

  pageRouterLink(link: AngularStatePageLink): string[] {
    return link.path ? ['/state', this.strategy.id, link.path] : ['/state', this.strategy.id];
  }

  strategyRouterLink(strategyId: AngularStateStrategyId): string[] {
    return ['/state', strategyId];
  }

  syncSimpleState(reason = 'Simple form edited.'): void {
    this.runtime.commitSimple(this.strategy.id, this.simpleModel, 'editing', reason);
  }

  submitSimple(): void {
    this.simpleMessage = '';
    this.runtime.commitSimple(this.strategy.id, this.simpleModel, 'validating', 'Simple form validation started.');
    this.validationProvider.validateAll(this.simpleModel, this.simplePolicyName, {
      showAllErrors: true,
      evaluateGroups: true,
      markEvaluated: true
    }).subscribe(() => {
      this.validationProvider.updatePolicyGroupStatus(this.simpleModel, this.simplePolicyGroupName);
      const errorCount = this.simpleModel.validationResults?.length ?? 0;
      this.simpleMessage = errorCount > 0
        ? `Simple form has ${errorCount} validation error(s).`
        : 'Simple form submitted successfully.';
      this.runtime.commitSimple(
        this.strategy.id,
        this.simpleModel,
        errorCount > 0 ? 'invalid' : 'valid',
        this.simpleMessage
      );
    });
  }

  resetSimple(): void {
    this.simpleModel = createSimpleModel();
    this.simpleMessage = '';
    this.configureSimplePolicy();
    this.validationProvider.clearValidationState(this.simpleModel, [this.simplePolicyName]);
    this.runtime.commitSimple(this.strategy.id, this.simpleModel, 'editing', 'Simple form reset.');
  }

  populateSimple(): void {
    this.simpleModel = sampleSimpleModel();
    this.simpleMessage = 'Loaded sample profile data.';
    this.configureSimplePolicy();
    this.runtime.commitSimple(this.strategy.id, this.simpleModel, 'editing', this.simpleMessage);
  }

  syncComplexState(reason = 'Complex form edited.'): void {
    this.runtime.commitComplex(this.strategy.id, this.complexModel, 'editing', reason);
  }

  validateComplex(): void {
    this.evaluateComplex(false);
  }

  saveComplex(): void {
    this.evaluateComplex(true);
  }

  resetComplex(): void {
    this.complexModel = createComplexModel();
    this.complexMessage = '';
    this.configureComplexPolicies();
    this.validationProvider.clearValidationState(this.complexModel, this.complexPolicyNames);
    this.runtime.commitComplex(this.strategy.id, this.complexModel, 'editing', 'Complex form reset.');
  }

  populateComplexSample(): void {
    this.complexModel = sampleComplexModel();
    this.complexMessage = 'Loaded valid enterprise sample data.';
    this.configureComplexPolicies();
    this.runtime.commitComplex(this.strategy.id, this.complexModel, 'editing', this.complexMessage);
  }

  populateComplexInvalid(): void {
    this.complexModel = invalidComplexModel();
    this.complexMessage = 'Loaded intentionally invalid enterprise data.';
    this.configureComplexPolicies();
    this.runtime.commitComplex(this.strategy.id, this.complexModel, 'editing', this.complexMessage);
  }

  addAddress(): void {
    this.complexModel.addresses = [...this.complexModel.addresses, emptyAngularStateAddress()];
    this.reconfigureComplexAfterStructureChange('Added address section.');
  }

  removeAddress(index: number): void {
    if (this.complexModel.addresses.length <= 1) {
      return;
    }
    this.complexModel.addresses = this.complexModel.addresses.filter((_address, currentIndex) => currentIndex !== index);
    this.reconfigureComplexAfterStructureChange('Removed address section.');
  }

  addContact(): void {
    this.complexModel.contacts = [...this.complexModel.contacts, emptyAngularStateContact()];
    this.reconfigureComplexAfterStructureChange('Added contact section.');
  }

  removeContact(index: number): void {
    if (this.complexModel.contacts.length <= 1) {
      return;
    }
    this.complexModel.contacts = this.complexModel.contacts.filter((_contact, currentIndex) => currentIndex !== index);
    this.reconfigureComplexAfterStructureChange('Removed contact section.');
  }

  setPolicyMode(mode: ComplexPolicyMode): void {
    this.complexModel.policyMode = mode;
    this.reconfigureComplexAfterStructureChange(`Switched to ${mode} validation policy mode.`);
  }

  onSecondaryEmailToggle(): void {
    if (!this.complexModel.profile.secondaryEmailEnabled) {
      this.complexModel.profile.secondaryEmail = '';
    }
    this.validationProvider.evaluateFormGroup(this.complexModel, 'complianceGroup', 'AngularStateComplexCompliance');
    this.validationProvider.notifyValidationRefresh(this.complexModel);
    this.syncComplexState('Updated conditional secondary email controls.');
  }

  trackStrategy(_index: number, strategy: AngularStateStrategy): string {
    return strategy.id;
  }

  trackPage(_index: number, page: AngularStatePageLink): string {
    return page.page;
  }

  trackByIndex(index: number): number {
    return index;
  }

  private resetAllModels(): void {
    this.simpleModel = createSimpleModel();
    this.complexModel = createComplexModel();
    this.simpleMessage = '';
    this.complexMessage = '';
    this.configureSimplePolicy();
    this.configureComplexPolicies();
    this.runtime.initialize(this.strategy.id, this.simpleModel, this.complexModel);
  }

  private evaluateComplex(save: boolean): void {
    this.complexMessage = '';
    this.configureComplexPolicies();
    this.runtime.commitComplex(
      this.strategy.id,
      this.complexModel,
      'validating',
      save ? 'Complex form save validation started.' : 'Complex form programmatic validation started.'
    );

    this.validationProvider.evaluatePolicies(
      this.complexModel,
      this.complexPolicyNames,
      this.complexPolicyGroupName
    ).subscribe(() => {
      const errorCount = this.complexModel.validationResults?.length ?? 0;
      const lifecycle = errorCount > 0 ? 'invalid' : save ? 'saved' : 'valid';
      this.complexMessage = errorCount > 0
        ? `Complex form has ${errorCount} validation error(s).`
        : save
        ? 'Complex form saved successfully.'
        : 'Programmatic validation completed with no errors.';
      this.runtime.commitComplex(this.strategy.id, this.complexModel, lifecycle, this.complexMessage);
    });
  }

  private configureSimplePolicy(): void {
    this.validationProvider.replacePolicy(this.simplePolicyName, new AngularStateSimplePolicy());
    this.validationProvider.registerFormGroupPolicy(this.simpleGroupName, this.simplePolicyName);
    this.validationProvider.formGroup[this.simpleGroupName] = [...SIMPLE_FORM_FIELDS];
    this.validationProvider.registerPolicyGroup(this.simplePolicyGroupName, {
      policies: [this.simplePolicyName],
      formGroups: [this.simpleGroupName]
    });
  }

  private configureComplexPolicies(): void {
    this.validationProvider.replacePolicy(this.complexPolicyNames[0], new AngularStateComplexIdentityPolicy());
    this.validationProvider.replacePolicy(
      this.complexPolicyNames[1],
      new AngularStateComplexAddressPolicy(this.complexModel.addresses.length)
    );
    this.validationProvider.replacePolicy(
      this.complexPolicyNames[2],
      new AngularStateComplexContactsPolicy(this.complexModel.contacts.length)
    );
    this.validationProvider.replacePolicy(this.complexPolicyNames[3], new AngularStateComplexCompliancePolicy());

    this.validationProvider.registerFormGroupPolicy('identityGroup', this.complexPolicyNames[0]);
    this.validationProvider.registerFormGroupPolicy('addressGroup', this.complexPolicyNames[1]);
    this.validationProvider.registerFormGroupPolicy('contactGroup', this.complexPolicyNames[2]);
    this.validationProvider.registerFormGroupPolicy('complianceGroup', this.complexPolicyNames[3]);
    this.validationProvider.formGroup['identityGroup'] = [
      'profile.firstName',
      'profile.lastName',
      'profile.email',
      'profile.phone',
      'profile.role',
      'profile.employeeType',
      'preferences.startDate',
      'preferences.contractSigned',
      'preferences.notificationFrequency'
    ];
    this.validationProvider.formGroup['addressGroup'] = this.complexModel.addresses.flatMap((_address, index) => [
      `addresses.${index}.type`,
      `addresses.${index}.line1`,
      `addresses.${index}.city`,
      `addresses.${index}.region`,
      `addresses.${index}.postalCode`,
      `addresses.${index}.country`
    ]);
    this.validationProvider.formGroup['contactGroup'] = this.complexModel.contacts.flatMap((_contact, index) => [
      `contacts.${index}.name`,
      `contacts.${index}.email`,
      `contacts.${index}.phone`,
      `contacts.${index}.relationship`
    ]);
    this.validationProvider.formGroup['complianceGroup'] = [
      'profile.secondaryEmail',
      'compliance.approver',
      'compliance.riskTier',
      'compliance.caseId'
    ];
    this.validationProvider.registerPolicyGroup(this.complexPolicyGroupName, {
      policies: this.complexPolicyNames,
      formGroups: ['identityGroup', 'addressGroup', 'contactGroup', 'complianceGroup']
    });
  }

  private reconfigureComplexAfterStructureChange(message: string): void {
    this.configureComplexPolicies();
    this.validationProvider.clearValidationState(this.complexModel, this.complexPolicyNames);
    this.complexMessage = message;
    this.runtime.commitComplex(this.strategy.id, this.complexModel, 'editing', message);
  }

  private teardownPolicies(): void {
    this.validationProvider.unregisterPolicy(this.simplePolicyName);
    this.complexPolicyNames.forEach((policyName) => this.validationProvider.unregisterPolicy(policyName));
    [
      this.simpleGroupName,
      'identityGroup',
      'addressGroup',
      'contactGroup',
      'complianceGroup'
    ].forEach((groupName) => {
      this.validationProvider.unregisterFormGroupPolicy(groupName);
      delete this.validationProvider.formGroup[groupName];
    });
    this.validationProvider.unregisterPolicyGroup(this.simplePolicyGroupName);
    this.validationProvider.unregisterPolicyGroup(this.complexPolicyGroupName);
  }
}
