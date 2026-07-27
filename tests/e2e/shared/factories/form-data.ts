/**
 * Factories for reusable form payloads used across Angular and React suites.
 * Prefer these over inlining large objects in individual specs.
 */

export function createSimpleValidData(overrides: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  date: string;
  role: string;
  contactPreference: string;
}> = {}) {
  return {
    firstName: 'Kalyan',
    lastName: 'Tester',
    email: 'kalyan.tester@example.com',
    phone: '(212) 555-0198',
    country: 'United States',
    date: '2026-07-26',
    role: 'Developer',
    contactPreference: 'Email',
    ...overrides
  };
}

export function createSimpleInvalidData(overrides: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}> = {}) {
  return {
    firstName: '',
    lastName: '',
    email: 'not-an-email',
    phone: '123',
    ...overrides
  };
}

export function createPerformanceConfig(overrides: Partial<{
  sections: string;
  controlsPerSection: string;
  seed: string;
}> = {}) {
  return {
    sections: '2',
    controlsPerSection: '3',
    seed: '17',
    ...overrides
  };
}

export function createBoundaryEmailValues() {
  return {
    empty: '',
    missingAt: 'not-an-email',
    missingDomain: 'user@',
    valid: 'kalyan.tester@example.com'
  };
}
