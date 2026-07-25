'use strict';

const fs = require('node:fs');
const path = require('node:path');
const reportBranding = require('./report-branding.cjs');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function cdata(value) {
  return `<![CDATA[${String(value ?? '').replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}

function formatDuration(milliseconds) {
  const value = Number(milliseconds) || 0;
  if (value < 1000) {
    return `${Math.round(value)} ms`;
  }
  return `${(value / 1000).toFixed(2)} s`;
}

function slug(value, index) {
  const normalized = String(value || 'top-level')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `suite-${normalized || 'top-level'}-${index}`;
}

function walkSpecFiles(directory) {
  if (!directory || !fs.existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSpecFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      files.push(entryPath);
    }
  }
  return files;
}

function attachSourceFiles(specs, sourceRoot, workspaceRoot) {
  const indexedFiles = walkSpecFiles(sourceRoot).map((filePath) => ({
    filePath,
    relativePath: path.relative(workspaceRoot, filePath).replaceAll('\\', '/'),
    contents: fs.readFileSync(filePath, 'utf8')
  }));

  for (const spec of specs) {
    let matches = indexedFiles.filter(({ contents }) =>
      contents.includes(spec.description)
      && spec.suite.every((suiteName) => contents.includes(suiteName)));

    if (matches.length === 0) {
      matches = indexedFiles.filter(({ contents }) => contents.includes(spec.description));
    }

    spec.sourceFiles = [...new Set(matches.map(({ relativePath }) => relativePath))];
  }
}

function groupSpecs(specs) {
  const groups = new Map();
  for (const spec of specs) {
    const name = spec.suite.length > 0 ? spec.suite.join(' › ') : 'Top-level tests';
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name).push(spec);
  }
  return [...groups.entries()];
}

function countStatuses(specs) {
  return {
    total: specs.length,
    passed: specs.filter((spec) => spec.status === 'passed').length,
    failed: specs.filter((spec) => spec.status === 'failed').length,
    skipped: specs.filter((spec) => spec.status === 'skipped').length
  };
}

function defaultReportOutputDir(workspaceRoot, projectName) {
  const reportPaths = {
    core: ['packages', 'core'],
    angular: ['packages', 'angular'],
    react: ['packages', 'react'],
    'angular-showcase': ['showcases', 'angular'],
    'react-showcase': ['showcases', 'react']
  };
  return path.join(workspaceRoot, 'reports', ...(reportPaths[projectName] || [projectName]));
}

function renderSpec(spec) {
  const sources = spec.sourceFiles.length > 0
    ? spec.sourceFiles.map((file) => `<code>${escapeHtml(file)}</code>`).join(', ')
    : '<span class="muted">Not exposed by the runner</span>';
  const failure = spec.logs.length > 0
    ? `<details class="failure" open><summary>Failure details and stack trace</summary><pre>${escapeHtml(spec.logs.join('\n\n'))}</pre></details>`
    : '';

  return `
    <article class="test test-${spec.status}" data-status="${spec.status}">
      <div class="test-heading">
        <span class="status status-${spec.status}">${spec.status}</span>
        <strong>${escapeHtml(spec.description)}</strong>
        <span class="duration">${escapeHtml(formatDuration(spec.durationMs))}</span>
      </div>
      <div class="source">Source: ${sources}</div>
      ${failure}
    </article>`;
}

function renderHtml(report) {
  const dashboardHref = report.dashboardHref || '../../index.html';
  const summaryHref = report.summaryHref || `${dashboardHref}#${report.projectName}/summary`;
  const groups = groupSpecs(report.specs);
  const navigation = groups.map(([name, specs], index) => {
    const counts = countStatuses(specs);
    return `<li><a href="#${slug(name, index)}">${escapeHtml(name)}</a><span>${counts.passed}/${counts.total}</span></li>`;
  }).join('\n');
  const suiteSections = groups.map(([name, specs], index) => {
    const counts = countStatuses(specs);
    return `
      <section class="suite" id="${slug(name, index)}">
        <details open>
          <summary><span>${escapeHtml(name)}</span><span>${counts.passed} passed · ${counts.failed} failed · ${counts.skipped} skipped</span></summary>
          <div class="suite-tests">${specs.map(renderSpec).join('\n')}</div>
        </details>
      </section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="report-project" content="${escapeHtml(report.projectName)}">
  ${reportBranding.reportHeadAssets()}
  <title>${escapeHtml(report.displayName)} test results</title>
  <style>
    ${reportBranding.reportStyles()}
    :root { color-scheme: light; --ink:#172033; --muted:#667085; --line:#d7deea; --panel:#fff; --bg:#f5f7fb; --pass:#087443; --fail:#b42318; --skip:#805500; --accent:#3157d5; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { margin:0; color:var(--ink); background:var(--bg); font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; }
    .layout { display:grid; grid-template-columns:minmax(220px,280px) minmax(0,1fr); gap:24px; max-width:1500px; margin:0 auto; padding:24px; }
    aside { position:sticky; top:16px; align-self:start; max-height:calc(100vh - 32px); overflow:auto; padding:18px; border:1px solid var(--line); border-radius:12px; background:var(--panel); }
    aside h2 { margin:0 0 10px; font-size:14px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
    aside ul { margin:0; padding:0; list-style:none; }
    aside li { display:flex; justify-content:space-between; gap:12px; padding:7px 0; border-bottom:1px solid #edf0f5; }
    aside a { color:var(--accent); text-decoration:none; }
    aside span { color:var(--muted); white-space:nowrap; }
    main { min-width:0; }
    .cards { display:grid; grid-template-columns:repeat(6,minmax(100px,1fr)); gap:12px; margin-bottom:18px; }
    .card { padding:16px; border:1px solid var(--line); border-radius:12px; background:var(--panel); }
    .card .label { display:block; color:var(--muted); font-size:12px; text-transform:uppercase; }
    .card strong { display:block; margin-top:4px; font-size:23px; }
    .card-pass strong { color:var(--pass); } .card-fail strong { color:var(--fail); } .card-skip strong { color:var(--skip); }
    .toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:18px; }
    button { padding:8px 13px; border:1px solid var(--line); border-radius:999px; background:#fff; color:var(--ink); cursor:pointer; }
    button.active { color:#fff; border-color:var(--accent); background:var(--accent); }
    .metadata { margin-left:auto; color:var(--muted); }
    .suite { margin-bottom:14px; border:1px solid var(--line); border-radius:12px; background:var(--panel); overflow:hidden; }
    .suite > details > summary { display:flex; justify-content:space-between; gap:20px; padding:15px 18px; cursor:pointer; font-weight:700; background:#f9fafc; }
    .suite > details > summary span:last-child { color:var(--muted); font-weight:500; }
    .suite-tests { padding:8px 18px 16px; }
    .test { padding:13px 0; border-bottom:1px solid #edf0f5; }
    .test:last-child { border-bottom:0; }
    .test-heading { display:flex; align-items:center; gap:10px; }
    .status { min-width:62px; padding:2px 8px; border-radius:999px; text-align:center; text-transform:uppercase; font-size:11px; font-weight:800; }
    .status-passed { color:var(--pass); background:#dff7ea; } .status-failed { color:var(--fail); background:#fee4e2; } .status-skipped { color:var(--skip); background:#fff1c2; }
    .duration { margin-left:auto; color:var(--muted); white-space:nowrap; }
    .source { margin:5px 0 0 72px; color:var(--muted); font-size:12px; }
    .source code { color:#344054; }
    .failure { margin:10px 0 0 72px; border-left:4px solid var(--fail); padding:8px 12px; background:#fff6f5; }
    .failure summary { color:var(--fail); cursor:pointer; font-weight:700; }
    pre { max-height:420px; overflow:auto; white-space:pre-wrap; word-break:break-word; font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace; }
    .muted { color:var(--muted); }
    .test[hidden], .suite[hidden] { display:none; }
    html.embedded-report validation-platform-shell::part(header),html.embedded-report validation-platform-shell::part(footer),html.embedded-report .vr-report-summary,html.embedded-report .vr-report-subnav { display:none; }
    html.embedded-report .layout { max-width:none; margin:0; padding:18px; }
    @media (max-width:1000px) { .layout { grid-template-columns:1fr; } aside { position:static; max-height:none; } .cards { grid-template-columns:repeat(3,1fr); } }
    @media (max-width:620px) { .layout { padding:14px; } .cards { grid-template-columns:repeat(2,1fr); } .metadata { width:100%; margin-left:0; } .source,.failure { margin-left:0; } }
  </style>
  <script>if(new URLSearchParams(location.search).get('embed')==='1')document.documentElement.classList.add('embedded-report');</script>
</head>
<body>
  ${reportBranding.renderReportHeader({
    applicationName: report.displayName,
    reportType: 'Test execution report',
    generatedAt: report.finishedAt,
    version: report.version || 'unknown',
    dashboardHref,
    coverageHref: '../coverage.html'
  })}
  ${reportBranding.renderReportSubnavigation({
    dashboardHref,
    summaryHref,
    testsHref: './index.html',
    coverageHref: '../coverage.html',
    junitHref: '../junit/test-results.xml'
  })}
  <div class="layout">
    <aside aria-label="Test suite navigation">
      <h2>Test suites</h2>
      <ul>${navigation || '<li>No suites were reported.</li>'}</ul>
    </aside>
    <main>
      <div class="cards" aria-label="Test summary">
        <div class="card"><span class="label">Total</span><strong>${report.summary.total}</strong></div>
        <div class="card card-pass"><span class="label">Passed</span><strong>${report.summary.passed}</strong></div>
        <div class="card card-fail"><span class="label">Failed</span><strong>${report.summary.failed}</strong></div>
        <div class="card card-skip"><span class="label">Skipped</span><strong>${report.summary.skipped}</strong></div>
        <div class="card"><span class="label">Duration</span><strong>${escapeHtml(formatDuration(report.durationMs))}</strong></div>
        <div class="card"><span class="label">Suites</span><strong>${groups.length}</strong></div>
      </div>
      <div class="toolbar" aria-label="Test status filters">
        <button type="button" class="active" data-filter="all">All</button>
        <button type="button" data-filter="passed">Passed</button>
        <button type="button" data-filter="failed">Failed</button>
        <button type="button" data-filter="skipped">Skipped</button>
        <span class="metadata">Browser: ${escapeHtml(report.browsers.join(', ') || 'not reported')} · Started: ${escapeHtml(report.startedAt)}</span>
      </div>
      ${suiteSections || '<section class="suite"><div class="suite-tests">No test cases were reported.</div></section>'}
    </main>
  </div>
  ${reportBranding.renderReportFooter({ version: report.version || 'unknown' })}
  <script>
    const buttons = [...document.querySelectorAll('[data-filter]')];
    const suites = [...document.querySelectorAll('.suite')];
    for (const button of buttons) {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        buttons.forEach((candidate) => candidate.classList.toggle('active', candidate === button));
        document.querySelectorAll('.test').forEach((test) => {
          test.hidden = filter !== 'all' && test.dataset.status !== filter;
        });
        suites.forEach((suite) => {
          suite.hidden = !suite.querySelector('.test:not([hidden])');
        });
      });
    }
  </script>
</body>
</html>`;
}

function renderJUnit(report) {
  const testCases = report.specs.map((spec) => {
    const className = spec.suite.length > 0 ? spec.suite.join('.') : report.displayName;
    const fileAttribute = spec.sourceFiles[0] ? ` file="${escapeXml(spec.sourceFiles[0])}"` : '';
    let body = '';
    if (spec.status === 'failed') {
      const details = spec.logs.join('\n\n');
      const message = details.split(/\r?\n/, 1)[0] || 'Test failed';
      body = `<failure message="${escapeXml(message)}">${cdata(details)}</failure>`;
    } else if (spec.status === 'skipped') {
      body = '<skipped />';
    }
    return `    <testcase classname="${escapeXml(className)}" name="${escapeXml(spec.description)}" time="${(spec.durationMs / 1000).toFixed(3)}"${fileAttribute}>${body}</testcase>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${escapeXml(report.displayName)}" tests="${report.summary.total}" failures="${report.summary.failed}" skipped="${report.summary.skipped}" time="${(report.durationMs / 1000).toFixed(3)}">
  <testsuite name="${escapeXml(report.displayName)}" tests="${report.summary.total}" failures="${report.summary.failed}" skipped="${report.summary.skipped}" timestamp="${escapeXml(report.startedAt)}" time="${(report.durationMs / 1000).toFixed(3)}">
${testCases}
  </testsuite>
</testsuites>
`;
}

function PersistentTestResultsReporter(baseReporterDecorator, config, logger) {
  baseReporterDecorator(this);
  const log = logger.create('reporter:persistent-test-results');
  const options = config.persistentTestResultsReporter || {};
  const projectName = options.projectName || 'tests';
  const displayNames = {
    core: 'Core Engine',
    angular: 'Angular Adapter',
    react: 'React Adapter',
    'angular-showcase': 'Angular Showcase',
    'react-showcase': 'React Showcase'
  };
  const displayName = displayNames[projectName] || projectName;
  const workspaceRoot = config.basePath || process.cwd();
  const outputDir = options.outputDir || defaultReportOutputDir(workspaceRoot, projectName);
  const dashboardHref = options.dashboardHref || '../../index.html';
  const summaryHref = options.summaryHref || `${dashboardHref}#${projectName}/summary`;
  let workspaceVersion = 'unknown';
  try {
    workspaceVersion = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8')).version || workspaceVersion;
  } catch {
    // A missing package manifest should not prevent report generation.
  }
  let startedAt;
  let specs;
  let browserNames;

  this.onRunStart = () => {
    startedAt = new Date();
    specs = [];
    browserNames = new Set();
  };

  this.onBrowserStart = (browser) => {
    browserNames.add(browser.name || browser.fullName || String(browser));
  };

  this.onSpecComplete = (browser, result) => {
    browserNames.add(browser.name || browser.fullName || String(browser));
    specs.push({
      suite: Array.isArray(result.suite) ? result.suite.map(String) : [],
      description: String(result.description || 'Unnamed test'),
      status: result.skipped ? 'skipped' : result.success ? 'passed' : 'failed',
      durationMs: Number(result.time) || 0,
      logs: Array.isArray(result.log) ? result.log.map(String) : [],
      sourceFiles: []
    });
  };

  this.onRunComplete = (_browsers, results) => {
    const finishedAt = new Date();
    try {
      attachSourceFiles(specs, options.sourceRoot, workspaceRoot);
      const report = {
        projectName,
        displayName,
        version: workspaceVersion,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        summary: countStatuses(specs),
        browsers: [...browserNames],
        runError: Boolean(results.error || results.disconnected),
        dashboardHref,
        summaryHref,
        specs
      };
      const testsDir = path.join(outputDir, 'tests');
      const junitDir = path.join(outputDir, 'junit');
      fs.mkdirSync(testsDir, { recursive: true });
      fs.mkdirSync(junitDir, { recursive: true });
      fs.writeFileSync(path.join(testsDir, 'index.html'), renderHtml(report), 'utf8');
      fs.writeFileSync(path.join(testsDir, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      fs.writeFileSync(path.join(junitDir, 'test-results.xml'), renderJUnit(report), 'utf8');
      log.info('Wrote persistent test and JUnit reports for %s', projectName);
    } catch (error) {
      log.error('Unable to write persistent reports for %s: %s', projectName, error.stack || error);
      throw error;
    }
  };
}

PersistentTestResultsReporter.$inject = ['baseReporterDecorator', 'config', 'logger'];

const plugin = {
  'reporter:persistent-test-results': ['type', PersistentTestResultsReporter]
};

Object.defineProperties(plugin, {
  renderHtml: { value: renderHtml },
  renderJUnit: { value: renderJUnit }
});

module.exports = plugin;
