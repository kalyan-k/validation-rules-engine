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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function metric(coverage, name) {
  const value = coverage?.total?.[name]?.pct;
  return typeof value === 'number' ? `${value.toFixed(2)}%` : 'Unavailable';
}

function projectData(projectName) {
  const root = projectReportRoot(projectName);
  const tests = readJson(path.join(root, 'tests', 'summary.json'));
  const coverage = readJson(path.join(root, 'coverage', 'coverage-summary.json'));
  const missing = requiredProjectReports(projectName).filter((file) => !fs.existsSync(file));
  return { projectName, tests, coverage, missing };
}

function renderProject({ projectName, tests, coverage, missing }) {
  const projectHref = projectReportHref(projectName);
  const titles = {
    core: 'Core Engine',
    angular: 'Angular Adapter',
    react: 'React Adapter',
    'angular-showcase': 'Angular Showcase',
    'react-showcase': 'React Showcase'
  };
  const title = titles[projectName] || projectName;
  const summary = tests?.summary;
  const statusClass = (summary?.failed || tests?.runError || missing.length > 0) ? 'status-warning' : 'status-pass';
  const statusText = missing.length > 0
    ? `${missing.length} report file${missing.length === 1 ? '' : 's'} missing`
    : summary?.failed
      ? `${summary.failed} test${summary.failed === 1 ? '' : 's'} failed`
      : 'Complete';

  return `
    <section class="project-card">
      <div class="project-heading">
        <div><span class="eyebrow">${escapeHtml(projectName)}</span><h2>${escapeHtml(title)}</h2></div>
        <span class="project-status ${statusClass}">${escapeHtml(statusText)}</span>
      </div>
      <div class="report-links">
        <a href="./${projectHref}/tests/index.html"><strong>Test execution report</strong><span>Suites, cases, status, timing, and failure details</span></a>
        <a href="./${projectHref}/coverage/index.html"><strong>Code-coverage report</strong><span>Folders, source files, lines, and branch highlighting</span></a>
        <a class="secondary" href="./${projectHref}/junit/test-results.xml"><strong>JUnit XML</strong><span>CI-interoperable test results</span></a>
      </div>
      <div class="metrics" aria-label="${escapeHtml(title)} test summary">
        <div><span>Tests</span><strong>${summary?.total ?? '—'}</strong></div>
        <div><span>Passed</span><strong>${summary?.passed ?? '—'}</strong></div>
        <div><span>Failed</span><strong>${summary?.failed ?? '—'}</strong></div>
        <div><span>Skipped</span><strong>${summary?.skipped ?? '—'}</strong></div>
      </div>
      <div class="metrics coverage" aria-label="${escapeHtml(title)} coverage summary">
        <div><span>Statements</span><strong>${metric(coverage, 'statements')}</strong></div>
        <div><span>Branches</span><strong>${metric(coverage, 'branches')}</strong></div>
        <div><span>Functions</span><strong>${metric(coverage, 'functions')}</strong></div>
        <div><span>Lines</span><strong>${metric(coverage, 'lines')}</strong></div>
      </div>
      ${missing.length > 0 ? `<details class="missing"><summary>Missing outputs</summary><ul>${missing.map((file) => `<li>${escapeHtml(path.relative(workspaceRoot, file).replaceAll('\\', '/'))}</li>`).join('')}</ul></details>` : ''}
    </section>`;
}

function renderDashboard(data, generatedAt) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Validation Rules test reports</title>
  <style>
    :root { color-scheme:light; --ink:#172033; --muted:#667085; --line:#d7deea; --panel:#fff; --bg:#eef2f8; --accent:#3157d5; --pass:#087443; --warn:#b54708; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); background:var(--bg); font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; }
    header { padding:42px 28px 34px; text-align:center; color:#fff; background:linear-gradient(125deg,#172554,#3157d5 62%,#4f46e5); }
    header .eyebrow { color:#c7d7ff; } header h1 { margin:6px 0; font-size:34px; } header p { margin:0; color:#dce5ff; }
    main { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; max-width:1400px; margin:0 auto; padding:28px; }
    .project-card { padding:24px; border:1px solid var(--line); border-radius:16px; background:var(--panel); box-shadow:0 8px 28px rgba(23,32,51,.06); }
    .project-heading { display:flex; align-items:start; justify-content:space-between; gap:14px; }
    .eyebrow { color:var(--accent); font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
    h2 { margin:2px 0 18px; font-size:26px; }
    .project-status { padding:5px 10px; border-radius:999px; font-size:12px; font-weight:800; }
    .status-pass { color:var(--pass); background:#dff7ea; } .status-warning { color:var(--warn); background:#fff0d5; }
    .report-links { display:grid; gap:10px; }
    .report-links a { display:flex; flex-direction:column; padding:14px 16px; border:1px solid #cbd5ed; border-radius:11px; color:var(--accent); text-decoration:none; background:#f8faff; }
    .report-links a:hover { border-color:var(--accent); background:#f1f5ff; }
    .report-links a span { margin-top:2px; color:var(--muted); font-size:13px; }
    .report-links a.secondary { background:#fff; }
    .metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:18px; }
    .metrics div { padding:12px 8px; border-radius:9px; text-align:center; background:#f6f8fc; }
    .metrics span { display:block; color:var(--muted); font-size:11px; text-transform:uppercase; }
    .metrics strong { display:block; margin-top:3px; font-size:18px; }
    .coverage { margin-top:8px; }
    .missing { margin-top:16px; color:var(--warn); } .missing ul { margin-bottom:0; }
    footer { padding:0 28px 28px; text-align:center; color:var(--muted); }
    @media (max-width:1200px) { main { grid-template-columns:1fr; max-width:760px; } }
    @media (max-width:580px) { header h1 { font-size:27px; } main { padding:14px; } .project-card { padding:18px; } .metrics { grid-template-columns:repeat(2,1fr); } }
  </style>
</head>
<body>
  <header>
    <span class="eyebrow">Validation Rules monorepo</span>
    <h1>Test and code-coverage reports</h1>
    <p>Independent reports for the core engine, Angular adapter, and both showcase applications</p>
  </header>
  <main>${data.map(renderProject).join('\n')}</main>
  <footer>Generated ${escapeHtml(generatedAt)}</footer>
</body>
</html>`;
}

export function generateReportIndex() {
  fs.mkdirSync(reportsRoot, { recursive: true });
  const data = projects.map(projectData);
  const generatedAt = new Date().toISOString();
  const output = path.join(reportsRoot, 'index.html');
  fs.writeFileSync(output, renderDashboard(data, generatedAt), 'utf8');
  return {
    output,
    missing: data.flatMap(({ missing }) => missing)
  };
}

if (isDirectModule(import.meta.url)) {
  try {
    const { output, missing } = generateReportIndex();
    console.log(`Generated report dashboard: ${path.relative(workspaceRoot, output)}`);
    if (missing.length > 0) {
      console.error(`Dashboard generated with ${missing.length} missing report file(s).`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
}
