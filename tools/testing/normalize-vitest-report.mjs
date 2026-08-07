import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  assertProject,
  projectReportRoot,
  projectTestsDashboardHref,
  workspaceRoot
} from './report-paths.mjs';

const require = createRequire(import.meta.url);
const persistentReporter = require('./persistent-test-results-reporter.cjs');
const displayNames = Object.freeze({
  react: 'React Adapter',
  'react-showcase': 'React Showcase',
  'vanilla-showcase': 'Vanilla Showcase'
});
const projectName = process.argv[2];

assertProject(projectName);
if (!displayNames[projectName]) throw new Error(`Vitest normalization is not configured for ${projectName}.`);

const root = projectReportRoot(projectName);
const dashboardHref = projectTestsDashboardHref(projectName);
const resultPath = path.join(root, 'tests', 'results.json');
const outputPath = path.join(root, 'tests', 'summary.json');
const workspacePackage = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'));
const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
const specs = (result.testResults ?? []).flatMap((suite) => {
  const sourceFile = path.relative(workspaceRoot, suite.name).replaceAll('\\', '/');
  return (suite.assertionResults ?? []).map((assertion) => ({
    suite: assertion.ancestorTitles ?? [],
    description: assertion.title ?? assertion.fullName ?? 'Unnamed test',
    status: assertion.status === 'passed' ? 'passed' : assertion.status === 'pending' || assertion.status === 'skipped' || assertion.status === 'todo' ? 'skipped' : 'failed',
    durationMs: assertion.duration ?? 0,
    logs: assertion.failureMessages ?? [],
    sourceFiles: [sourceFile]
  }));
});
const summary = {
  total: specs.length,
  passed: specs.filter(({ status }) => status === 'passed').length,
  failed: specs.filter(({ status }) => status === 'failed').length,
  skipped: specs.filter(({ status }) => status === 'skipped').length
};
const startedAt = new Date(result.startTime ?? Date.now()).toISOString();
const durationMs = Number(result.testResults?.reduce((total, suite) => total + (suite.endTime && suite.startTime ? suite.endTime - suite.startTime : 0), 0)) || 0;
const report = {
  projectName,
  displayName: displayNames[projectName],
  version: workspacePackage.version ?? '0.0.0',
  startedAt,
  finishedAt: new Date().toISOString(),
  durationMs,
  browsers: ['Vitest · jsdom'],
  runError: result.success === false && summary.failed === 0,
  dashboardHref,
  summaryHref: `${dashboardHref}#${projectName}/summary`,
  summary,
  specs
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(path.join(root, 'tests', 'index.html'), persistentReporter.renderHtml(report), 'utf8');
console.log(`Normalized ${summary.total} ${projectName} Vitest cases into the shared report format.`);
