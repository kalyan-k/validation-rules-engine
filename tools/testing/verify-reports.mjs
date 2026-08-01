import fs from 'node:fs';
import path from 'node:path';
import {
  isDirectModule,
  projectReportHref,
  projectReportRoot,
  projects,
  reportsRoot,
  requiredProjectReports,
  workspaceRoot
} from './report-paths.mjs';

const coverageMetrics = Object.freeze(['statements', 'branches', 'functions', 'lines']);

function walkFiles(directory, extension) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(entryPath);
    }
  }
  return files;
}

function relative(filePath) {
  return path.relative(workspaceRoot, filePath).replaceAll('\\', '/');
}

function readJson(filePath, failures) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    failures.push(`${relative(filePath)} is not valid JSON: ${error.message}`);
    return null;
  }
}

function requireText(text, token, filePath, failures) {
  if (!text.includes(token)) {
    failures.push(`${relative(filePath)} does not contain ${JSON.stringify(token)}`);
  }
}

function verifyLocalLinks(htmlFile, failures) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const linkSource = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '');
  const attributes = linkSource.matchAll(/\b(?:href|src)=(['"])(.*?)\1/giu);
  for (const match of attributes) {
    const target = match[2];
    if (!target || /^(?:#|data:|https?:|javascript:|mailto:)/iu.test(target)) {
      continue;
    }

    const decodedTarget = decodeURIComponent(target.split(/[?#]/u, 1)[0]);
    const targetPath = path.resolve(path.dirname(htmlFile), decodedTarget);
    if (!fs.existsSync(targetPath)) {
      failures.push(`${relative(htmlFile)} has a broken local link: ${target}`);
    }
  }
}

function verifyProject(projectName, failures) {
  const projectRoot = projectReportRoot(projectName);
  const testHtmlPath = path.join(projectRoot, 'tests', 'index.html');
  const testSummaryPath = path.join(projectRoot, 'tests', 'summary.json');
  const coverageRoot = path.join(projectRoot, 'coverage');
  const coverageWrapperPath = path.join(projectRoot, 'coverage.html');
  const coverageIndexPath = path.join(coverageRoot, 'index.html');
  const coverageSummaryPath = path.join(coverageRoot, 'coverage-summary.json');
  const junitPath = path.join(projectRoot, 'junit', 'test-results.xml');
  let missing = false;

  for (const requiredFile of requiredProjectReports(projectName)) {
    if (!fs.existsSync(requiredFile)) {
      failures.push(`${relative(requiredFile)} is missing`);
      missing = true;
    }
  }
  if (missing) {
    return;
  }

  if (!fs.existsSync(coverageWrapperPath)) {
    failures.push(`${relative(coverageWrapperPath)} is missing`);
  }

  const testSummary = readJson(testSummaryPath, failures);
  const coverageSummary = readJson(coverageSummaryPath, failures);
  const testHtml = fs.readFileSync(testHtmlPath, 'utf8');
  const coverageIndex = fs.readFileSync(coverageIndexPath, 'utf8');
  const coverageWrapper = fs.existsSync(coverageWrapperPath)
    ? fs.readFileSync(coverageWrapperPath, 'utf8')
    : '';
  const junit = fs.readFileSync(junitPath, 'utf8');
  const workspaceVariants = [workspaceRoot, workspaceRoot.replaceAll('\\', '/')];

  if (!testSummary || testSummary.projectName !== projectName) {
    failures.push(`${relative(testSummaryPath)} has the wrong or missing project name`);
  } else {
    const counts = testSummary.summary;
    if (!counts || counts.total !== testSummary.specs?.length) {
      failures.push(`${relative(testSummaryPath)} has inconsistent test totals`);
    }
    if (!testSummary.version || !testSummary.finishedAt) {
      failures.push(`${relative(testSummaryPath)} has incomplete report metadata`);
    }
    if ((counts?.passed ?? 0) + (counts?.failed ?? 0) + (counts?.skipped ?? 0) !== counts?.total) {
      failures.push(`${relative(testSummaryPath)} has inconsistent status counts`);
    }
    for (const spec of testSummary.specs ?? []) {
      if (!Array.isArray(spec.sourceFiles) || spec.sourceFiles.length === 0) {
        failures.push(`${relative(testSummaryPath)} does not map ${JSON.stringify(spec.description)} to a spec source file`);
      }
      for (const sourceFile of spec.sourceFiles ?? []) {
        if (path.isAbsolute(sourceFile) || !fs.existsSync(path.join(workspaceRoot, sourceFile))) {
          failures.push(`${relative(testSummaryPath)} contains an invalid source path: ${sourceFile}`);
        }
      }
    }
  }

  requireText(testHtml, 'aria-label="Test suite navigation"', testHtmlPath, failures);
  requireText(testHtml, 'data-filter="failed"', testHtmlPath, failures);
  requireText(testHtml, 'data-filter="skipped"', testHtmlPath, failures);
  requireText(testHtml, 'Source:', testHtmlPath, failures);
  requireText(testHtml, 'aria-label="Platform navigation"', testHtmlPath, failures);
  requireText(testHtml, 'Validation Rules Engine', testHtmlPath, failures);
  requireText(testHtml, 'data-report-summary', testHtmlPath, failures);
  requireText(testHtml, 'vre:report-summary', testHtmlPath, failures);
  requireText(testHtml, 'data:image/svg+xml;base64', testHtmlPath, failures);
  requireText(testHtml, '<validation-platform-shell active-application="reports"', testHtmlPath, failures);
  requireText(coverageWrapper, 'aria-label="Platform navigation"', coverageWrapperPath, failures);
  requireText(coverageWrapper, 'src="./coverage/index.html"', coverageWrapperPath, failures);
  requireText(coverageWrapper, 'data-report-summary', coverageWrapperPath, failures);
  requireText(coverageWrapper, 'vre:report-summary', coverageWrapperPath, failures);
  requireText(coverageWrapper, 'data:image/svg+xml;base64', coverageWrapperPath, failures);
  requireText(coverageWrapper, '<validation-platform-shell active-application="reports"', coverageWrapperPath, failures);
  requireText(junit, '<testsuites ', junitPath, failures);
  requireText(junit, '<testcase ', junitPath, failures);

  for (const metric of coverageMetrics) {
    const percentage = coverageSummary?.total?.[metric]?.pct;
    if (typeof percentage !== 'number' || percentage < 90) {
      failures.push(`${relative(coverageSummaryPath)} has ${metric} coverage below 90% or unavailable`);
    }
    requireText(coverageIndex, metric[0].toUpperCase() + metric.slice(1), coverageIndexPath, failures);
  }

  const coverageSourcePages = walkFiles(coverageRoot, '.html')
    .filter((filePath) => filePath !== coverageIndexPath && !filePath.endsWith(`${path.sep}index.html`));
  if (coverageSourcePages.length === 0) {
    failures.push(`${relative(coverageRoot)} has no browsable source pages`);
  } else {
    const sourcePage = fs.readFileSync(coverageSourcePages[0], 'utf8');
    requireText(sourcePage, 'cline-any', coverageSourcePages[0], failures);
    if (!/(?:cline-yes|cline-no|cbranch-no|cstat-no)/u.test(sourcePage)) {
      failures.push(`${relative(coverageSourcePages[0])} has no line or branch coverage highlighting`);
    }
  }

  for (const machinePath of workspaceVariants) {
    if (testHtml.includes(machinePath) || junit.includes(machinePath)) {
      failures.push(`${projectName} test output exposes an absolute workspace path`);
    }
  }
}

export function verifyReports() {
  const failures = [];
  const dashboardPath = path.join(reportsRoot, 'index.html');
  if (!fs.existsSync(dashboardPath)) {
    failures.push('reports/index.html is missing');
  }

  for (const projectName of projects) {
    verifyProject(projectName, failures);
  }

  if (fs.existsSync(dashboardPath)) {
    const dashboard = fs.readFileSync(dashboardPath, 'utf8');
    requireText(dashboard, 'aria-label="Report projects"', dashboardPath, failures);
    requireText(dashboard, 'role="tablist"', dashboardPath, failures);
    requireText(dashboard, 'data-tab="coverage"', dashboardPath, failures);
    requireText(dashboard, 'data-tab="tests"', dashboardPath, failures);
    requireText(dashboard, 'data-tab="summary"', dashboardPath, failures);
    requireText(dashboard, '<details class="report-tree-group" open>', dashboardPath, failures);
    requireText(dashboard, 'Packages', dashboardPath, failures);
    requireText(dashboard, 'Showcase Applications', dashboardPath, failures);
    requireText(dashboard, 'data-report-summary', dashboardPath, failures);
    requireText(dashboard, 'setTimeout(()=>setExpanded(false,false),10000)', dashboardPath, failures);
    requireText(dashboard, "let selectedView = 'summary'", dashboardPath, failures);
    const summaryTab = dashboard.indexOf('data-tab="summary"');
    const testsTab = dashboard.indexOf('data-tab="tests"');
    const coverageTab = dashboard.indexOf('data-tab="coverage"');
    if (!(summaryTab >= 0 && summaryTab < testsTab && testsTab < coverageTab)) {
      failures.push(`${relative(dashboardPath)} does not order report tabs as Summary, Tests, Coverage`);
    }
    for (const projectName of projects) {
      const projectHref = projectReportHref(projectName);
      requireText(dashboard, `./${projectHref}/tests/index.html`, dashboardPath, failures);
      requireText(dashboard, `./${projectHref}/coverage/index.html`, dashboardPath, failures);
      requireText(dashboard, `data-summary-project="${projectName}"`, dashboardPath, failures);
      requireText(dashboard, `data-project="${projectName}" data-view="summary"`, dashboardPath, failures);
    }
  }

  for (const htmlFile of walkFiles(reportsRoot, '.html')) {
    verifyLocalLinks(htmlFile, failures);
  }

  return failures;
}

if (isDirectModule(import.meta.url)) {
  const failures = verifyReports();
  if (failures.length > 0) {
    console.error(`Report verification failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log('Verified the branded single-page report workspace, collapsible metadata, test reports, coverage wrappers, JUnit XML, source mappings, and local links.');
  }
}
