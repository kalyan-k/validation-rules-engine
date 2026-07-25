
import { Observable, Subject, forkJoin as observableForkJoin, of as observableOf } from 'rxjs';
import { map, take } from 'rxjs/operators';
import * as _ from 'underscore';
import { getValidationMeta, isValidationFailure, Validator } from '@validation-rules/core';
import { $parse } from './parser/expression-parser';

export class Policy {
    // tslint:disable:no-unused-variable
    private name: string | undefined;
    private validators: Validator[] = [];

    constructor() { }

    private handleAsyncCall = (model: any, validator: any, error: any) => {
        const propertyName = this.validators[validator].propertyName;

        // Check for duplicate error messages since the policy validate method can be called multiple times
        // before async validation resolves.
        // Only record actual validation failures (not the `true` success sentinel)
        if (isValidationFailure(error)
            && !this.isDuplicate(model, propertyName, error.message) && !!model.validationResults) {
            model.validationResults.push({
                'propertyName': propertyName,
                'error': error
            });
        }
    }

    private handleAsyncCallForRequiredCheck = (model: any, validator: any, checkIsRequired: any, errorMsg: any) => {
        const propertyName = this.validators[validator].propertyName;
        const hasRequiredError = isValidationFailure(errorMsg);

        if (model.requiredResults) {
            const reqResultIdx = _.findIndex(model.requiredResults, { 'propertyName': propertyName });

            if (reqResultIdx > -1) {

                if (model.requiredResults[reqResultIdx].hasRequiredError !== hasRequiredError
                    || !model.requiredResults[reqResultIdx].isRequired) {
                    model.requiredResults[reqResultIdx] = {
                        'propertyName': propertyName,
                        'isRequired': checkIsRequired,
                        'hasRequiredError': hasRequiredError
                    };
                }

            } else {
                model.requiredResults.push({
                    'propertyName': propertyName,
                    'isRequired': checkIsRequired,
                    'hasRequiredError': hasRequiredError
                });
            }
        }
    }

    private isDuplicate = (model: any, propertyName: any, errorMsg: any) => {
        let returnValue = false;

        if (model.validationResults) {
            const filteredArray = _.where(model.validationResults, { 'propertyName': propertyName });

            _.forEach(filteredArray, function (value) {
                if (value.error && value.error.message === errorMsg) {
                    returnValue = true;
                }
            });
        }

        return returnValue;
    }


    private parseValue = (model: any, property: any) => {
        const propertyArray = property.split('.');
        let returnValue = model;

        for (let i = 0; i < propertyArray.length; i++) {
            returnValue = returnValue[propertyArray[i]];
            if (!returnValue) { break; }
        }

        return returnValue;
    }

    private isDependencySatisfied = (model: any, validator: Validator) => {
        if (!validator.dependency) {
            return true;
        }

        if (_.isFunction(validator.dependency)) {
            return !!validator.dependency.call(this, model);
        }

        const getter = $parse(validator.dependency);
        return !!getter(model);
    }

    private canRunValidation = (model: any, value: any, validator: any, validationRule: any) => {
        if (validator.dependency && !this.isDependencySatisfied(model, validator)) {
            return false;
        }

        // Don't run validation if the rule is optional and doesn't have a value.
        if (validator.validatorsToRun[validationRule].isOptional && validator.validatorsToRun[validationRule].isNullOrEmpty(value)) {
            return false;
        }

        return true;
    }

    private runValidation = (model: any, validator: any, validationRule: any) => {
        // Check for dependency
        if (this.canRunValidation.call(this, model, this.parseValue(model, this.validators[validator].propertyName),
            this.validators[validator], validationRule)) {
            return this.validators[validator].validatorsToRun[validationRule]
                .isValid.call(model, this.parseValue(model, this.validators[validator].propertyName), model);
        }

        return;
    }

    public validate = (model: any, propertyName?: string) => {
        const self = this;
        const results: Array<Observable<any>> = [];

        if (propertyName) {
            model.validationResults = model.validationResults || [];

            // Only remove the passed in property's errors that is under validation
            let index = model.validationResults.length;
            while (index--) {
                if (model.validationResults[index].propertyName === propertyName) {
                    model.validationResults.splice(index, 1);
                }
            }

        } else {
            // Remove only this policy's property errors (supports multiple policies on one model)
            const policyProperties = _.uniq(this.validators.map((v) => v.propertyName));
            if (model.validationResults) {
                model.validationResults = model.validationResults.filter(
                    (result: { propertyName: string }) => !policyProperties.includes(result.propertyName)
                );
                if (model.validationResults.length <= 0) {
                    delete model.validationResults;
                }
            }
            model.validationResults = model.validationResults || [];
        }

        for (let validator = 0; validator < this.validators.length; validator++) {
            for (let validationRule = 0; validationRule < this.validators[validator].validatorsToRun.length; validationRule++) {
                // If there is a propertyName specified then only validate that property
                if (propertyName) {
                    if (this.validators[validator].propertyName === propertyName) {
                        const callBackFn = this.runValidation.call(self, model, validator, validationRule);
                        const observableFn = (callBackFn instanceof Subject) ? callBackFn : observableOf(callBackFn);

                        results.push(observableFn.pipe(map(_.bind(this.handleAsyncCall, self, model, validator))));
                    }
                } else {
                    const callBackFn = this.runValidation.call(self, model, validator, validationRule);
                    const observableFn = (callBackFn instanceof Subject) ? callBackFn : observableOf(callBackFn);

                    results.push(observableFn.pipe(map(_.bind(this.handleAsyncCall, self, model, validator))));
                }
            }
        }

        if (results.length === 0) {
            if (model.validationResults && model.validationResults.length <= 0) {
                delete model.validationResults;
            }
            return observableOf(model.validationResults).pipe(take(1));
        }

        const observable = observableForkJoin(results).pipe(
            map(function () {
                if (model.validationResults && model.validationResults.length <= 0) {
                    delete model.validationResults;
                }
                return model.validationResults;
            })
        );

        return observable;
    }

    public checkModelRequired = (model: any, propertyName?: any) => {
        const self = this;

        model.requiredResults = model.requiredResults || [];

        outer_loop:
        for (let validator = 0; validator < this.validators.length; validator++) {
            if (this.validators[validator]) {
                inner_loop:
                for (let validationRule = 0; validationRule < this.validators[validator].validatorsToRun.length; validationRule++) {
                    const checkIsRequired = this.validators[validator].validatorsToRun[validationRule].checkIsRequired;
                    if (checkIsRequired) {
                        // If there is a propertyName specified then only validate that property
                        if (propertyName) {
                            if (this.validators[validator].propertyName === propertyName) {
                                this.handleAsyncCallForRequiredCheck.call(self, model, validator, checkIsRequired, this.runValidation.call(self, model, validator, validationRule));
                                break outer_loop; // donot want to run any other validator for same property and other validators too
                            }
                        } else {
                            this.handleAsyncCallForRequiredCheck.call(self, model, validator, checkIsRequired, this.runValidation.call(self, model, validator, validationRule));
                            break inner_loop; // donot want to run any other validator for same property
                        }
                    }
                }
            }
        }

        // console.warn(model.requiredResults);
        // Delete the requiredResults property off of the model if it has no errors
        if (model.requiredResults && model.requiredResults.length <= 0) {
            delete model.requiredResults;
        }
        return observableOf(model.requiredResults).pipe(take(1));
    }

    /** Updates required markers respecting conditional dependencies. */
    public updateConditionalRequiredFields = (model: any, propertyName?: string) => {
        model.requiredResults = model.requiredResults || [];

        for (let validator = 0; validator < this.validators.length; validator++) {
            const fieldName = this.validators[validator].propertyName;
            if (!fieldName || (propertyName && fieldName !== propertyName)) {
                continue;
            }

            const hasRequiredRule = this.validators[validator].validatorsToRun.some((rule) => rule.checkIsRequired);
            const dependencyMet = this.isDependencySatisfied(model, this.validators[validator]);
            const shouldShowRequired = hasRequiredRule && dependencyMet;
            const reqResultIdx = _.findIndex(model.requiredResults, { 'propertyName': fieldName });

            if (reqResultIdx > -1) {
                model.requiredResults[reqResultIdx] = {
                    ...model.requiredResults[reqResultIdx],
                    propertyName: fieldName,
                    isRequired: shouldShowRequired,
                    hasRequiredError: shouldShowRequired
                        ? model.requiredResults[reqResultIdx].hasRequiredError
                        : false
                };
            } else if (shouldShowRequired) {
                model.requiredResults.push({
                    propertyName: fieldName,
                    isRequired: true,
                    hasRequiredError: false
                });
            }
        }

        if (model.requiredResults.length <= 0) {
            delete model.requiredResults;
        }
    }

    /** @deprecated Use updateConditionalRequiredFields */
    public initializeRequiredFields = (model: any) => {
        this.updateConditionalRequiredFields(model);
    }

    // model: The is the model passed in (the actualModel parameter passed to the validator directive).
    // formGroupList: This is the list of all the formGroup Names.
    public checkFormGroupValid = (model: any, formGroupList: any, markEvaluated = true) => {
        Object.keys(formGroupList).forEach((groupName) => {
            this.evaluateFormGroup(model, groupName, formGroupList[groupName] || [], markEvaluated);
        });
    }

    /** Returns property paths for this policy that are currently active (dependency satisfied). */
    public getActivePropertyPaths = (model: any): string[] => {
        const paths: string[] = [];

        for (let validator = 0; validator < this.validators.length; validator++) {
            const propertyName = this.validators[validator].propertyName;
            if (propertyName && this.isDependencySatisfied(model, this.validators[validator])) {
                paths.push(propertyName);
            }
        }

        return _.uniq(paths);
    }

    /**
     * Evaluates a single form group's validity. Uses policy property paths when registered
     * DOM paths are unavailable (e.g. billing fields hidden by conditional rendering).
     */
    public evaluateFormGroup = (
        model: any,
        groupName: string,
        registeredPaths: string[] = [],
        markEvaluated = true
    ) => {
        const policyPaths = this.getActivePropertyPaths(model);
        const pathsToCheck = policyPaths.length > 0
            ? policyPaths
            : _.uniq(registeredPaths);

        const meta = getValidationMeta(model);
        const groupErrors: Array<{ propertyName: string; error: { message: string } }> = [];

        pathsToCheck.forEach((propertyPath: string) => {
            const foundValidationErrorFields = _.where(model.validationResults || [], { 'propertyName': propertyPath });
            if (foundValidationErrorFields?.length) {
                groupErrors.push(...foundValidationErrorFields);
            }
        });

        const hasErrors = groupErrors.length > 0;
        const anyTouched = pathsToCheck.some((path) => !!meta.touchedFields[path]);
        const allTouched = pathsToCheck.length === 0 || pathsToCheck.every((path) => !!meta.touchedFields[path]);

        let isEvaluated = false;
        if (pathsToCheck.length === 0) {
            isEvaluated = markEvaluated;
        } else if (meta.showAllErrors) {
            isEvaluated = markEvaluated;
        } else if (hasErrors && anyTouched) {
            isEvaluated = markEvaluated;
        } else if (allTouched) {
            isEvaluated = markEvaluated;
        }

        model[groupName] = {
            isValid: isEvaluated && !hasErrors,
            isInValid: isEvaluated && hasErrors,
            isEvaluated,
            errors: groupErrors
        };
    }

    public setPolicyVariables = (name: string, validators: Validator[]) => {
        this.name = name.toLowerCase();
        this.validators = validators;
    }
}
