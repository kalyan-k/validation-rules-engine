import { Injectable } from '@angular/core';
import { Observable, Subject, from } from 'rxjs';
import { concatMap, filter, last, switchMap, tap } from 'rxjs/operators';
import {
	getValidationMeta,
	PolicyGroupConfig,
	resetValidationMeta,
	ValidationPolicy,
	Validator,
	ValidatorHelper
} from '@validation-rules-engine/core';
import { Policy } from '../policy';
import * as _ from 'underscore';

@Injectable({
	providedIn: 'root'
})
export class ValidationProviderService {
	fileSuffix = '.Policy';
	policies: { [key: string]: Validator[] } = {};
	policyGroups: { [key: string]: PolicyGroupConfig } = {};
	formGroupPolicies: { [key: string]: string } = {};
	validatorHelper: ValidatorHelper;
	formGroup: { [key: string]: Array<string> } = {};
	private validationRefreshSource = new Subject<any>();

	constructor() {
		this.validatorHelper = new ValidatorHelper();
	}

	register = (name: string, validationPolicy: ValidationPolicy) => {
		const registeredName = name.toLowerCase() + this.fileSuffix;

		if (_.contains(Object.keys(this.policies), registeredName)) {
			console.log(`Policy with the name '${name}' already registred. Hence skipping the regiser part.`);
			return;
		}
		this.policies[registeredName] = validationPolicy.addValidations(this.validatorHelper);
	}

	/** Replaces an existing policy or registers a new one (for dynamically generated forms). */
	replacePolicy = (name: string, validationPolicy: ValidationPolicy) => {
		const registeredName = name.toLowerCase() + this.fileSuffix;
		this.policies[registeredName] = validationPolicy.addValidations(this.validatorHelper);
	}

	unregisterPolicy = (name: string) => {
		const registeredName = name.toLowerCase() + this.fileSuffix;
		delete this.policies[registeredName];
	}

	unregisterFormGroupPolicy = (groupName: string) => {
		delete this.formGroupPolicies[groupName];
	}

	unregisterPolicyGroup = (groupKey: string) => {
		delete this.policyGroups[groupKey];
	}

	registerPolicyGroup = (groupKey: string, config: PolicyGroupConfig) => {
		this.policyGroups[groupKey] = config;
	}

	/** Maps a form group name (groupName on policyValidator) to its validation policy. */
	registerFormGroupPolicy = (groupName: string, policyName: string) => {
		this.formGroupPolicies[groupName] = policyName;
	}

	private createPolicyFacade = (policy: Policy) => ({
		validate: policy.validate.bind(policy),
		checkModelRequired: policy.checkModelRequired.bind(policy),
		checkFormValid: policy.checkFormGroupValid.bind(policy),
		initializeRequiredFields: policy.initializeRequiredFields.bind(policy),
		updateConditionalRequiredFields: policy.updateConditionalRequiredFields.bind(policy),
		evaluateFormGroup: policy.evaluateFormGroup.bind(policy),
		getActivePropertyPaths: policy.getActivePropertyPaths.bind(policy)
	});

	hasPolicy(name: string): boolean {
		const registeredName = name.toLowerCase() + this.fileSuffix;
		return _.contains(Object.keys(this.policies), registeredName);
	}

	getPolicy = (name: string) => {
		const registeredName = name.toLowerCase() + this.fileSuffix;
		const policyRegistered = _.contains(Object.keys(this.policies), registeredName);

		if (!policyRegistered) {
			throw new Error(`Policy named '${name}' has not been registered`);
		}

		const policy = new Policy();
		policy.setPolicyVariables(name, this.policies[registeredName]);

		return this.createPolicyFacade(policy);
	}

	notifyValidationRefresh(model: any): void {
		this.validationRefreshSource.next(model);
	}

	onValidationRefresh(model: any): Observable<any> {
		return this.validationRefreshSource.asObservable().pipe(
			filter((refreshedModel) => refreshedModel === model)
		);
	}

	/** Evaluates a single form group badge (e.g. after blur when section becomes complete). */
	evaluateFormGroup(model: any, groupName: string, policyName?: string): void {
		const resolvedPolicyName = policyName ?? this.formGroupPolicies[groupName];
		if (!resolvedPolicyName || !this.hasPolicy(resolvedPolicyName)) {
			return;
		}

		const policy = this.getPolicy(resolvedPolicyName);
		policy.evaluateFormGroup(model, groupName, this.formGroup[groupName] || [], true);
	}

	evaluatePolicyFormGroups(model: any, policyName: string, markEvaluated = true): void {
		Object.keys(this.formGroupPolicies)
			.filter((groupName) => this.formGroupPolicies[groupName] === policyName)
			.forEach((groupName) => {
				this.getPolicy(policyName).evaluateFormGroup(
					model,
					groupName,
					this.formGroup[groupName] || [],
					markEvaluated
				);
			});
	}

	validateAll(
		model: any,
		policyName: string,
		options?: { showAllErrors?: boolean; evaluateGroups?: boolean; markEvaluated?: boolean }
	): Observable<any> {
		const policy = this.getPolicy(policyName);
		const showAllErrors = options?.showAllErrors ?? false;
		const evaluateGroups = options?.evaluateGroups ?? false;
		const markEvaluated = options?.markEvaluated ?? evaluateGroups;

		if (showAllErrors) {
			getValidationMeta(model).showAllErrors = true;
		}

		return policy.validate(model).pipe(
			switchMap(() => policy.checkModelRequired(model)),
			tap(() => {
				policy.updateConditionalRequiredFields(model);
				if (evaluateGroups) {
					this.evaluatePolicyFormGroups(model, policyName, markEvaluated);
				}
				this.notifyValidationRefresh(model);
			})
		);
	}

	evaluatePolicies(
		model: any,
		policyNames: string[],
		policyGroupKey?: string
	): Observable<any> {
		getValidationMeta(model).showAllErrors = true;

		return from(policyNames).pipe(
			concatMap((name) => this.validateAll(model, name, { evaluateGroups: true, markEvaluated: true })),
			last(),
			tap(() => {
				if (policyGroupKey) {
					this.updatePolicyGroupStatus(model, policyGroupKey);
				}
				this.notifyValidationRefresh(model);
			})
		);
	}

	updatePolicyGroupStatus(model: any, groupKey: string): void {
		const config = this.policyGroups[groupKey];
		if (!config) {
			return;
		}

		const errors = (model.validationResults || []).filter((result: { propertyName: string }) => {
			return config.formGroups.some((formGroupName) => {
				const policyName = this.formGroupPolicies[formGroupName];
				if (!policyName) {
					return (this.formGroup[formGroupName] || []).includes(result.propertyName);
				}
				const activePaths = this.getPolicy(policyName).getActivePropertyPaths(model);
				const paths = activePaths.length > 0 ? activePaths : (this.formGroup[formGroupName] || []);
				return paths.includes(result.propertyName);
			});
		});

		const allSectionsEvaluated = config.formGroups.every(
			(formGroupName) => !!model[formGroupName]?.isEvaluated
		);

		model[groupKey] = {
			isValid: errors.length === 0,
			isInValid: errors.length > 0,
			isEvaluated: allSectionsEvaluated || getValidationMeta(model).showAllErrors,
			errors
		};
	}

	resetFormGroups(): void {
		this.formGroup = {};
	}

	clearValidationState(model: any, policyNames: string[]): void {
		delete model.validationResults;
		delete model.requiredResults;
		resetValidationMeta(model);

		Object.keys(this.formGroup).forEach((groupName) => {
			delete model[groupName];
		});

		Object.keys(this.formGroupPolicies).forEach((groupName) => {
			delete model[groupName];
		});

		Object.keys(this.policyGroups).forEach((groupKey) => {
			delete model[groupKey];
		});

		policyNames.forEach((policyName) => {
			if (this.hasPolicy(policyName)) {
				this.getPolicy(policyName).updateConditionalRequiredFields(model);
			}
		});

		this.notifyValidationRefresh(model);
	}
}
