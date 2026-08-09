import * as _ from 'underscore';

export class ValidationHelper {

    constructor() { }

    isNullOrEmpty = (value: any) => {
        // Allow 0 and false as a valid input
        if (!value && value !== 0 && value !== false) {
            return true;
        }

        if (_.isArray(value) && value.length <= 0) {
            return true;
        }

        return false;
    }

    isChecked = (value: boolean) => {
        return value === true;
    }

    isNumber = (value: number) => {
        return isFinite(value);
    }

    isAboveMin = (min: number, value: number) => {
        if (!this.isNumber(value) || !this.isNumber(min)) {
            return false;
        }

        return (value >= min);
    }

    isBelowMax = (max: number, value: number) => {
        if (!this.isNumber(value) || !this.isNumber(max)) {
            return false;
        }

        return (value <= max);
    }

    regEx(pattern: string, value: string) {
        return this.regExpPriv(pattern, value);
    }

    regExLiteral(pattern: RegExp, value: string) {
        return pattern.test(value);
    }

    private regExpPriv(pattern: any, value: string): boolean {
        const regExp = new RegExp(pattern);
        return regExp.test(value);
    }

    isEmail = (value: string) => {
        // Linear-time pattern (no nested quantifiers) to avoid ReDoS on untrusted input.
        const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        return this.regExLiteral(pattern, value);
    }

    isDate = (value: any) => {
        // Because new Date(null) translates to Wed Dec 31 1969 18:00:00 GMT-0600 (CST) we have to check for it.
        if (!value) {
            return false;
        }

        const date = new Date(value);

        if (Object.prototype.toString.call(date) === '[object Date]') {
            if (isNaN(date.getTime())) {
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }

    isZipCode = (value: string) => {
        const pattern = /(^(?!0{5})(\d{5})(?!-?0{4})(|-\d{4})?$)/;

        return this.regExLiteral(pattern, value);
    }

    dateRange = (min: any, max: any, value: any) => {
        if (!this.isDate(min) || !this.isDate(max) || !this.isDate(value)) {
            return false;
        }

        const parsedMinDate = typeof min === 'number' ? min : Date.parse(min);
        const parsedMaxDate = typeof max === 'number' ? max : Date.parse(max);
        const parsedValue = typeof value === 'number' ? value : Date.parse(value);

        return (parsedMinDate <= parsedValue && parsedValue <= parsedMaxDate);
    }

    numberRange = (min: any, max: any, value: any) => {
        if (!this.isNumber(min) || !this.isNumber(max) || !this.isNumber(value)) {
            return false;
        }

        return (min <= value && value <= max);
    }

    isPhone = (value: string) => {
        const pattern = /^(?:\([2-9]\d{2}\) ?|[2-9]\d{2}(?:-?| ?))[2-9]\d{2}[- ]?\d{4}$/;

        return this.regExLiteral(pattern, value);
    }

    isVin = (value: string) => {
        /*
         The requirements are that the first 9 characters and the 11th character are alpha-numeric excluding i, I, o or O.
         The 10th character is the chassis year, and is alpha-numeric excluding i, I, o, O, q, Q, u, and U.
         The final 6 characters are numeric. The string is 17 characters in length
         */
        const pattern = /^(([a-h,A-H,j-n,J-N,p-z,P-Z,0-9]{9})([a-h,A-H,j-n,J-N,p,P,r-t,R-T,v-z,V-Z,0-9])([a-h,A-H,j-n,J-N,p-z,P-Z,0-9])(\d{6}))$/;

        return this.regExLiteral(pattern, value);
    }

    isSSN = (value: string) => {
        const pattern = /\b(?!000)(?!666)(?!9)[0-9]{3}[ -]?(?!00)[0-9]{2}[ -]?(?!0000)[0-9]{4}\b/;

        return this.regExLiteral(pattern, value);
    }

}
