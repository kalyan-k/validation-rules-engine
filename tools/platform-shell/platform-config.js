// Runtime deployment configuration for the Validation Rules platform.
// Replace or inject this file in deployed environments to point the shell,
// docs, portal, and showcases at production URLs without rebuilding application code.
globalThis.validationRulesPlatformConfig = globalThis.validationRulesPlatformConfig || {
  urls: {
    portal: '',
    docs: '',
    angular: '',
    react: ''
  }
};
