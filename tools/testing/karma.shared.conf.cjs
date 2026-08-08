'use strict';

const path = require('node:path');
const { applyKarmaGlobCompatibility } = require('./karma-glob-compat.cjs');
const persistentTestResultsReporter = require('./persistent-test-results-reporter.cjs');

applyKarmaGlobCompatibility();

const workspaceRoot = path.resolve(__dirname, '..', '..');
const reportsRoot = path.join(workspaceRoot, 'reports');
const reportPaths = {
  core: ['packages', 'core'],
  angular: ['packages', 'angular'],
  'angular-showcase': ['showcases', 'angular']
};

function reportPath(projectName) {
  const segments = reportPaths[projectName];
  if (!segments) {
    throw new Error(`Unknown Karma report project: ${projectName}`);
  }
  return path.join(reportsRoot, ...segments);
}

function href(fromDirectory, toFile) {
  const relativePath = path.relative(fromDirectory, toFile).replaceAll('\\', '/');
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function configureKarma(config, projectName) {
  const sourceRoots = {
    core: path.join(workspaceRoot, 'packages', 'core'),
    angular: path.join(workspaceRoot, 'packages', 'angular'),
    'angular-showcase': path.join(workspaceRoot, 'apps', 'angular-showcase')
  };
  const sourceRoot = sourceRoots[projectName];
  if (!sourceRoot) {
    throw new Error(`Unknown Karma project: ${projectName}`);
  }
  const outputDir = reportPath(projectName);
  const dashboardHref = href(path.join(outputDir, 'tests'), path.join(reportsRoot, 'index.html'));

  config.set({
    basePath: workspaceRoot,
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      persistentTestResultsReporter,
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      clearContext: false,
      jasmine: {
        random: true,
        seed: '20260715'
      }
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    persistentTestResultsReporter: {
      projectName,
      outputDir,
      dashboardHref,
      summaryHref: `${dashboardHref}#${projectName}/summary`,
      sourceRoot
    },
    coverageReporter: {
      dir: path.join(outputDir, 'coverage'),
      subdir: '.',
      fixWebpackSourcePaths: true,
      reporters: [
        { type: 'text-summary' },
        { type: 'html' },
        { type: 'lcovonly', file: 'lcov.info' },
        { type: 'json-summary', file: 'coverage-summary.json' }
      ],
      check: {
        global: {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90
        }
      }
    },
    reporters: ['progress', 'kjhtml', 'persistent-test-results'],
    browsers: ['ChromeHeadlessLocal'],
    customLaunchers: {
      ChromeHeadlessLocal: {
        base: 'ChromeHeadless',
        flags: ['--disable-gpu']
      },
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      }
    },
    browserDisconnectTolerance: 3,
    // Angular showcase coverage compiles a large instrumented bundle; keep CI patient.
    browserNoActivityTimeout: process.env.CI === 'true' ? 120000 : 60000,
    browserDisconnectTimeout: process.env.CI === 'true' ? 20000 : 10000,
    captureTimeout: process.env.CI === 'true' ? 300000 : 120000,
    processKillTimeout: 10000,
    restartOnFileChange: true
  });
}

module.exports = { configureKarma };
