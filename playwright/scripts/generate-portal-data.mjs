import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const artifactsRoot = path.join(workspaceRoot, 'artifacts', 'playwright');
const jsonReportPath = process.env.PLAYWRIGHT_JSON_REPORT
  ? path.resolve(workspaceRoot, process.env.PLAYWRIGHT_JSON_REPORT)
  : path.join(artifactsRoot, 'json', 'results.json');
const catalogReportPath = path.join(artifactsRoot, 'catalog', 'results.json');
const outputPath = path.join(artifactsRoot, 'portal-data', 'latest-run.json');
const allowMissing = process.argv.includes('--allow-missing');

if (!fs.existsSync(jsonReportPath)) {
  if (allowMissing) {
    console.warn(`Playwright JSON report not found: ${path.relative(workspaceRoot, jsonReportPath)}`);
    process.exit(0);
  }
  throw new Error(`Playwright JSON report not found: ${jsonReportPath}`);
}

const report = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
const catalogReport = fs.existsSync(catalogReportPath)
  ? JSON.parse(fs.readFileSync(catalogReportPath, 'utf8'))
  : undefined;
const catalogTests = catalogReport ? collectTests(catalogReport.suites ?? [], [], { includeUnexecuted: true }) : [];
const catalog = summarizeCatalog(catalogTests);
const tests = collectTests(report.suites ?? []);
if (tests.length === 0) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({
    schemaVersion: 1,
    available: false,
    generatedAt: new Date().toISOString(),
    message: 'The Playwright JSON report contains no executed test results. Run an E2E command such as npm run test:e2e:smoke or npm run test:e2e.',
    command: 'npm run test:e2e:smoke',
    catalog
  }, null, 2)}\n`);
  console.log(`Wrote ${path.relative(workspaceRoot, outputPath)}`);
  process.exit(0);
}
const startTime = report.stats?.startTime ? new Date(report.stats.startTime) : new Date();
const durationMs = Number(report.stats?.duration ?? tests.reduce((total, test) => total + test.durationMs, 0));
const endTime = new Date(startTime.getTime() + durationMs);
const status = tests.some((test) => test.outcome === 'failed')
  ? 'failed'
  : tests.some((test) => test.outcome === 'flaky')
  ? 'flaky'
  : 'passed';

const manifest = {
  schemaVersion: 1,
  available: true,
  runId: process.env.GITHUB_RUN_ID ?? `local-${startTime.toISOString().replace(/[:.]/g, '-')}`,
  generatedAt: new Date().toISOString(),
  startTime: startTime.toISOString(),
  endTime: endTime.toISOString(),
  durationMs,
  status,
  execution: summarizeExecution(tests, catalogTests),
  catalog,
  totals: summarize(tests),
  browserTotals: summarizeBy(tests, (test) => test.browser),
  applicationTotals: summarizeBy(tests, (test) => test.application),
  suiteTotals: summarizeBy(tests, (test) => test.suite),
  angularStateTotals: summarizeBy(tests.filter((test) => test.application === 'angular'), (test) => test.stateManagement ?? 'general'),
  reactStateTotals: summarizeBy(tests.filter((test) => test.application === 'react'), (test) => test.stateManagement ?? 'general'),
  vanillaTotals: summarizeBy(tests.filter((test) => test.application === 'vanilla'), (test) => test.suite),
  accessibility: summarize(tests.filter((test) => test.tags.includes('@accessibility'))),
  visual: summarize(tests.filter((test) => test.tags.includes('@visual'))),
  failures: tests
    .filter((test) => test.outcome === 'failed')
    .slice(0, 20)
    .map((test) => ({
      title: test.title,
      project: test.browser,
      application: test.application,
      suite: test.suite,
      stateManagement: test.stateManagement,
      error: test.error,
      artifacts: test.artifacts
    })),
  artifacts: {
    htmlReport: 'html-report/index.html',
    jsonReport: 'json/results.json',
    junitReport: 'junit/test-results.xml',
    screenshots: 'test-results',
    videos: 'test-results',
    traces: 'test-results',
    visualDiffs: 'visual-diffs'
  },
  ci: process.env.GITHUB_RUN_ID
    ? {
        runId: process.env.GITHUB_RUN_ID,
        runNumber: process.env.GITHUB_RUN_NUMBER,
        url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
          ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
          : undefined
      }
    : undefined
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${path.relative(workspaceRoot, outputPath)}`);

function collectTests(suites, parents = [], options = {}, parentFile = '') {
  const tests = [];
  for (const suite of suites) {
    const filePath = suite.file || suite.location?.file || parentFile || '';
    const nextParents = [...parents, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) {
      const specTitle = [...nextParents, spec.title].filter(Boolean).join(' > ');
      const specFile = spec.file || spec.location?.file || filePath;
      for (const test of spec.tests ?? []) {
        const projectName = test.projectName ?? 'unknown';
        const results = test.results ?? [];
        if (results.length === 0) {
          if (!options.includeUnexecuted) {
            continue;
          }
        }
        const finalResult = results.at(-1);
        const retryPassed = results.length > 1 && finalResult?.status === 'passed';
        const outcome = results.length === 0
          ? 'catalog'
          : retryPassed ? 'flaky' : normalizeStatus(test.status ?? test.outcome ?? finalResult?.status);
        const tags = [...new Set((`${specTitle} ${test.title ?? ''}`.match(/@\S+/g) ?? []))];
        tests.push({
          title: specTitle,
          browser: projectName,
          application: applicationFromTags(tags, specTitle, specFile),
          suite: suiteFromTags(tags, specTitle),
          stateManagement: stateFromTags(tags, specTitle),
          tags,
          outcome,
          durationMs: results.reduce((total, result) => total + Number(result.duration ?? 0), 0),
          error: finalResult?.error?.message ? sanitizeText(finalResult.error.message) : undefined,
          artifacts: collectArtifacts(results)
        });
      }
    }
    tests.push(...collectTests(suite.suites ?? [], nextParents, options, filePath));
  }
  return tests;
}

function normalizeStatus(status) {
  if (status === 'passed' || status === 'expected') return 'passed';
  if (status === 'skipped') return 'skipped';
  if (status === 'flaky') return 'flaky';
  return 'failed';
}

function summarize(tests) {
  return tests.reduce((total, test) => {
    total.total += 1;
    total[test.outcome] += 1;
    return total;
  }, { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 });
}

function summarizeBy(tests, keySelector) {
  const groups = {};
  for (const test of tests) {
    const key = keySelector(test) || 'unknown';
    groups[key] ??= { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 };
    groups[key].total += 1;
    groups[key][test.outcome] += 1;
  }
  return groups;
}

function summarizeCatalog(tests) {
  if (!tests.length) {
    return undefined;
  }
  return {
    generatedAt: fs.statSync(catalogReportPath).mtime.toISOString(),
    totals: { total: tests.length },
    browserTotals: countBy(tests, (test) => test.browser),
    applicationTotals: countBy(tests, (test) => test.application),
    suiteTotals: countBy(tests, (test) => test.suite),
    angularStateTotals: countBy(tests.filter((test) => test.application === 'angular'), (test) => test.stateManagement ?? 'general'),
    reactStateTotals: countBy(tests.filter((test) => test.application === 'react'), (test) => test.stateManagement ?? 'general'),
    vanillaTotals: countBy(tests.filter((test) => test.application === 'vanilla'), (test) => test.suite)
  };
}

function summarizeExecution(tests, catalogTests) {
  const configuredTotal = catalogTests.length;
  const executedTotal = tests.length;
  return {
    scope: configuredTotal > 0 && executedTotal >= configuredTotal ? 'full' : configuredTotal > 0 ? 'focused' : 'unknown',
    executedTotal,
    configuredTotal: configuredTotal || undefined,
    coveragePercent: configuredTotal > 0 ? Number(((executedTotal / configuredTotal) * 100).toFixed(1)) : undefined,
    recommendedFullCommand: 'npm run test:e2e:full'
  };
}

function countBy(tests, keySelector) {
  const groups = {};
  for (const test of tests) {
    const key = keySelector(test) || 'unknown';
    groups[key] ??= { total: 0 };
    groups[key].total += 1;
  }
  return groups;
}

function collectArtifacts(results) {
  return results.flatMap((result) => result.attachments ?? [])
    .filter((attachment) => attachment.path)
    .map((attachment) => ({
      name: attachment.name,
      contentType: attachment.contentType,
      path: relativeArtifactPath(attachment.path)
    }))
    .filter((attachment) => attachment.path);
}

function relativeArtifactPath(artifactPath) {
  const relative = path.relative(artifactsRoot, path.resolve(artifactPath));
  return relative.startsWith('..') ? undefined : relative.replaceAll(path.sep, '/');
}

function applicationFromTags(tags, title, filePath = '') {
  const normalizedPath = String(filePath).replaceAll('\\', '/');
  if (normalizedPath.includes('/vanilla/')) return 'vanilla';
  if (normalizedPath.includes('/angular/')) return 'angular';
  if (normalizedPath.includes('/react/')) return 'react';
  const applicationTags = tags.filter((tag) => ['@angular', '@react', '@vanilla', '@docs', '@portal', '@reports'].includes(tag));
  if (applicationTags.length > 1) return 'platform';
  if (applicationTags.includes('@vanilla')) return 'vanilla';
  if (applicationTags.includes('@angular')) return 'angular';
  if (applicationTags.includes('@react')) return 'react';
  if (applicationTags.includes('@docs')) return 'documentation';
  if (applicationTags.includes('@portal')) return 'portal';
  if (applicationTags.includes('@reports')) return 'reports';
  if (title.includes('Vanilla')) return 'vanilla';
  if (title.includes('Angular')) return 'angular';
  if (title.includes('React')) return 'react';
  return 'platform';
}

function suiteFromTags(tags) {
  return tags.find((tag) => ['@smoke', '@regression', '@accessibility', '@visual', '@responsive'].includes(tag))?.slice(1) ?? 'regression';
}

function stateFromTags(tags) {
  return tags
    .map((tag) => tag.slice(1))
    .find((tag) => [
      'template-driven',
      'reactive-forms',
      'ngrx',
      'ngxs',
      'akita',
      'elf',
      'rx-angular-state',
      'signals',
      'custom-rxjs-store',
      'local-state',
      'redux-toolkit',
      'zustand',
      'jotai',
      'recoil',
      'mobx',
      'context'
    ].includes(tag));
}

function sanitizeText(value) {
  return String(value).replaceAll(process.cwd(), '<workspace>');
}
