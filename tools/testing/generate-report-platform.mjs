import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  isDirectModule,
  projectDashboardHref,
  projectReportHref,
  projectReportRoot,
  projectTestsDashboardHref,
  projects,
  reportsRoot,
  requiredProjectReports,
  workspaceRoot
} from './report-paths.mjs';

const require = createRequire(import.meta.url);
const reportBranding = require('./report-branding.cjs');
const persistentReporter = require('./persistent-test-results-reporter.cjs');
const projectTitles = Object.freeze({
  core: 'Core Engine',
  angular: 'Angular Adapter',
  react: 'React Adapter',
  'angular-showcase': 'Angular Showcase',
  'react-showcase': 'React Showcase'
});
const reportGroups = Object.freeze([
  { label: 'Packages', projects: ['core', 'angular', 'react'] },
  { label: 'Showcase Applications', projects: ['angular-showcase', 'react-showcase'] }
]);

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

function formatDuration(milliseconds) {
  const value = Number(milliseconds) || 0;
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`;
}

function projectData(projectName, workspaceVersion) {
  const root = projectReportRoot(projectName);
  const tests = readJson(path.join(root, 'tests', 'summary.json'));
  const coverage = readJson(path.join(root, 'coverage', 'coverage-summary.json'));
  const missing = requiredProjectReports(projectName).filter((file) => !fs.existsSync(file));
  return {
    projectName,
    title: projectTitles[projectName] || projectName,
    tests,
    coverage,
    version: tests?.version || workspaceVersion,
    missing
  };
}

function renderProject({ projectName, title, tests, coverage, missing }) {
  const projectHref = projectReportHref(projectName);
  const summary = tests?.summary;
  const failed = Boolean(summary?.failed || tests?.runError || missing.length > 0);
  const statusText = missing.length > 0
    ? `${missing.length} report file${missing.length === 1 ? '' : 's'} missing`
    : summary?.failed
      ? `${summary.failed} test${summary.failed === 1 ? '' : 's'} failed`
      : 'Passing';

  return `<section class="project-card" data-project="${reportBranding.escapeHtml(projectName)}">
    <div class="project-heading">
      <div><span class="eyebrow">${reportBranding.escapeHtml(projectName)}</span><h2>${reportBranding.escapeHtml(title)}</h2></div>
      <span class="project-status ${failed ? 'status-warning' : 'status-pass'}">${reportBranding.escapeHtml(statusText)}</span>
    </div>
    <p class="project-generation">Generated ${reportBranding.escapeHtml(tests?.finishedAt || 'Unavailable')} · ${reportBranding.escapeHtml(formatDuration(tests?.durationMs))}</p>
    <div class="report-links">
      <a href="./${projectHref}/tests/index.html"><strong>Test execution report</strong><span>Suites, cases, timing, source mapping, and failure details</span></a>
      <a href="./${projectHref}/coverage.html"><strong>Code-coverage report</strong><span>Branded report shell with original Istanbul details preserved</span></a>
      <a class="secondary" href="./${projectHref}/junit/test-results.xml"><strong>JUnit XML</strong><span>CI-interoperable test results</span></a>
    </div>
    <div class="metrics" aria-label="${reportBranding.escapeHtml(title)} test summary">
      <div><span>Tests</span><strong>${summary?.total ?? '—'}</strong></div>
      <div><span>Passed</span><strong>${summary?.passed ?? '—'}</strong></div>
      <div><span>Failed</span><strong>${summary?.failed ?? '—'}</strong></div>
      <div><span>Skipped</span><strong>${summary?.skipped ?? '—'}</strong></div>
    </div>
    <div class="metrics coverage-metrics" aria-label="${reportBranding.escapeHtml(title)} coverage summary">
      <div><span>Statements</span><strong>${metric(coverage, 'statements')}</strong></div>
      <div><span>Branches</span><strong>${metric(coverage, 'branches')}</strong></div>
      <div><span>Functions</span><strong>${metric(coverage, 'functions')}</strong></div>
      <div><span>Lines</span><strong>${metric(coverage, 'lines')}</strong></div>
    </div>
    ${missing.length > 0 ? `<details class="missing"><summary>Missing outputs</summary><ul>${missing.map((file) => `<li>${reportBranding.escapeHtml(path.relative(workspaceRoot, file).replaceAll('\\', '/'))}</li>`).join('')}</ul></details>` : ''}
  </section>`;
}

function renderProjectSummary({ projectName, title, tests, coverage, missing }) {
  const summary = tests?.summary;
  return `<section class="workspace-summary" data-summary-project="${projectName}" hidden>
    <div class="project-heading"><div><span class="eyebrow">${projectName}</span><h2>${reportBranding.escapeHtml(title)}</h2></div><span class="project-status ${missing.length || summary?.failed ? 'status-warning' : 'status-pass'}">${missing.length ? 'Incomplete' : summary?.failed ? 'Attention' : 'Passing'}</span></div>
    <p class="project-generation">Generated ${reportBranding.escapeHtml(tests?.finishedAt || 'Unavailable')} · ${reportBranding.escapeHtml(formatDuration(tests?.durationMs))}</p>
    <div class="metrics"><div><span>Tests</span><strong>${summary?.total ?? '—'}</strong></div><div><span>Passed</span><strong>${summary?.passed ?? '—'}</strong></div><div><span>Failed</span><strong>${summary?.failed ?? '—'}</strong></div><div><span>Skipped</span><strong>${summary?.skipped ?? '—'}</strong></div></div>
    <div class="metrics coverage-metrics"><div><span>Statements</span><strong>${metric(coverage, 'statements')}</strong></div><div><span>Branches</span><strong>${metric(coverage, 'branches')}</strong></div><div><span>Functions</span><strong>${metric(coverage, 'functions')}</strong></div><div><span>Lines</span><strong>${metric(coverage, 'lines')}</strong></div></div>
  </section>`;
}

function renderReportTree(data) {
  const projectsByName = new Map(data.map((project) => [project.projectName, project]));
  return reportGroups.map((group) => `<details class="report-tree-group" open>
    <summary>${reportBranding.escapeHtml(group.label)}<span aria-hidden="true"></span></summary>
    <div>${group.projects.map((projectName) => {
      const project = projectsByName.get(projectName);
      const projectHref = projectReportHref(projectName);
      return `<section class="report-tree-project"><strong>${reportBranding.escapeHtml(project?.title || projectName)}</strong><div>
        <button type="button" data-project="${projectName}" data-view="summary">Summary</button>
        <button type="button" data-project="${projectName}" data-view="tests" data-source="./${projectHref}/tests/index.html?embed=1">Tests</button>
        <button type="button" data-project="${projectName}" data-view="coverage" data-source="./${projectHref}/coverage/index.html">Coverage</button>
      </div></section>`;
    }).join('')}</div>
  </details>`).join('');
}

function renderDashboard(data, generatedAt, workspaceVersion) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="report-project" content="workspace">
  ${reportBranding.reportHeadAssets()}
  <title>Validation Rules test reports</title>
  <style>${reportBranding.reportStyles()}
    .report-workspace { display:grid; grid-template-columns:260px minmax(0,1fr); gap:20px; max-width:1600px; margin:0 auto 36px; padding:22px 28px 6px; }
    .report-tree { position:sticky; top:16px; align-self:start; max-height:calc(100vh - 32px); overflow:auto; padding:16px; border:1px solid var(--vr-line); border-radius:13px; background:#fff; box-shadow:0 8px 28px rgba(23,32,51,.06); }
    .report-tree-group { border-top:1px solid #e5ebf0; }
    .report-tree-group:first-child { border-top:0; }
    .report-tree-group>summary { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 4px; color:#52657a; list-style:none; font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; }
    .report-tree-group>summary::-webkit-details-marker { display:none; }
    .report-tree-group>summary span { width:7px; height:7px; margin-right:4px; border-right:1px solid; border-bottom:1px solid; transform:rotate(45deg); transition:transform .18s ease; }
    .report-tree-group[open]>summary span { transform:rotate(225deg); }
    .report-tree-project { padding:9px 0 11px 8px; border-top:1px solid #edf0f5; }
    .report-tree-group>div>.report-tree-project:first-child { border-top:0; }
    .report-tree-project strong { display:block; margin-bottom:5px; font-size:13px; }
    .report-tree-project div { display:grid; gap:2px; padding-left:8px; }
    .report-tree button { padding:7px 9px; border:0; border-radius:6px; color:#52667c; background:transparent; text-align:left; font:inherit; font-size:12px; cursor:pointer; }
    .report-tree button:hover,.report-tree button.active { color:#075f59; background:#e5f3f1; }
    .report-content { min-width:0; }
    .report-content-header { display:flex; align-items:end; justify-content:space-between; gap:20px; margin-bottom:12px; padding:4px 2px; }
    .report-content-header h2 { margin:2px 0 0; font-size:24px; }
    .report-tabs { display:flex; gap:5px; padding:4px; border:1px solid var(--vr-line); border-radius:10px; background:#fff; }
    .report-tabs button { padding:8px 13px; border:0; border-radius:7px; color:#52667c; background:transparent; font:inherit; font-size:12px; font-weight:750; cursor:pointer; }
    .report-tabs button.active { color:#fff; background:var(--vr-accent); }
    .report-frame-panel,.workspace-summary { overflow:hidden; border:1px solid var(--vr-line); border-radius:14px; background:#fff; box-shadow:0 8px 28px rgba(23,32,51,.06); }
    .report-frame { display:block; width:100%; height:calc(100vh - 220px); min-height:720px; border:0; background:#fff; }
    .workspace-summary { padding:24px; }
    .project-heading { display:flex; align-items:start; justify-content:space-between; gap:14px; }
    .eyebrow { color:var(--vr-accent); font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
    h2 { margin:2px 0 0; font-size:26px; }
    .project-generation { margin:4px 0 18px; color:var(--vr-muted); font-size:12px; }
    .project-status { padding:5px 10px; border-radius:999px; font-size:12px; font-weight:800; }
    .status-pass { color:var(--vr-pass); background:#dff7ea; } .status-warning { color:var(--vr-warn); background:#fff0d5; }
    .metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:18px; }
    .metrics div { padding:12px 8px; border-radius:9px; text-align:center; background:#f6f8fc; }
    .metrics span { display:block; color:var(--vr-muted); font-size:10px; text-transform:uppercase; }
    .metrics strong { display:block; margin-top:3px; font-size:17px; }
    .coverage-metrics { margin-top:8px; }
    @media (max-width:900px) { .report-workspace { grid-template-columns:1fr; padding:16px; } .report-tree { position:static; max-height:none; } .report-content-header { align-items:flex-start; flex-direction:column; } }
    @media (max-width:560px) { .report-tabs { width:100%; } .report-tabs button { flex:1; } .metrics { grid-template-columns:repeat(2,1fr); } .report-frame { min-height:620px; } }
  </style>
</head>
<body>
  ${reportBranding.renderReportHeader({ applicationName: 'Reports', reportType: 'Test and coverage workspace', generatedAt, version: workspaceVersion, dashboardHref: './index.html', coverageHref: './index.html' })}
  <div class="report-workspace">
    <aside class="report-tree" aria-label="Report projects">${renderReportTree(data)}</aside>
    <main class="report-content">
      <div class="report-content-header"><div><span class="eyebrow">Selected report</span><h2 id="report-content-title">Core Engine</h2></div><div class="report-tabs" role="tablist" aria-label="Report views"><button type="button" role="tab" data-tab="summary">Summary</button><button type="button" role="tab" data-tab="tests">Tests</button><button type="button" role="tab" data-tab="coverage">Coverage</button></div></div>
      <section class="report-frame-panel" hidden><iframe id="report-frame" class="report-frame" title="Selected report content"></iframe></section>
      <div id="report-summaries">${data.map(renderProjectSummary).join('')}</div>
    </main>
  </div>
  ${reportBranding.renderReportFooter({ version: workspaceVersion })}
  <script>
    (() => {
      const projects = ${JSON.stringify(Object.fromEntries(data.map(({ projectName, title }) => [projectName, { title }]))).replaceAll('<', '\\u003c')};
      const frame = document.querySelector('#report-frame');
      const framePanel = document.querySelector('.report-frame-panel');
      const title = document.querySelector('#report-content-title');
      const projectButtons = [...document.querySelectorAll('[data-project][data-view]')];
      const tabs = [...document.querySelectorAll('[data-tab]')];
      const summaries = [...document.querySelectorAll('[data-summary-project]')];
      let selectedProject = 'core';
      let selectedView = 'summary';
      const select = (project, view, updateHistory = true) => {
        if (!projects[project] || !['coverage', 'tests', 'summary'].includes(view)) return;
        selectedProject = project; selectedView = view; title.textContent = projects[project].title;
        projectButtons.forEach((button) => button.classList.toggle('active', button.dataset.project === project && button.dataset.view === view));
        tabs.forEach((tab) => { const active = tab.dataset.tab === view; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
        summaries.forEach((summary) => { summary.hidden = summary.dataset.summaryProject !== project || view !== 'summary'; });
        framePanel.hidden = view === 'summary';
        if (view !== 'summary') frame.src = projectButtons.find((button) => button.dataset.project === project && button.dataset.view === view)?.dataset.source;
        if (updateHistory) history.pushState({ project, view }, '', '#' + project + '/' + view);
      };
      projectButtons.forEach((button) => button.addEventListener('click', () => select(button.dataset.project, button.dataset.view)));
      tabs.forEach((tab) => tab.addEventListener('click', () => select(selectedProject, tab.dataset.tab)));
      addEventListener('popstate', () => { const [project, view] = location.hash.slice(1).split('/'); select(project || 'core', view || 'summary', false); });
      const [initialProject, initialView] = location.hash.slice(1).split('/');
      select(initialProject || 'core', initialView || 'summary', false);
    })();
  </script>
</body>
</html>`;
}

export function generateReportIndex() {
  fs.mkdirSync(reportsRoot, { recursive: true });
  const workspaceVersion = readJson(path.join(workspaceRoot, 'package.json'))?.version || 'unknown';
  const data = projects.map((projectName) => projectData(projectName, workspaceVersion));
  const generatedAt = new Date().toISOString();

  for (const project of data) {
    fs.mkdirSync(projectReportRoot(project.projectName), { recursive: true });
    if (project.tests) {
      const dashboardHref = projectTestsDashboardHref(project.projectName);
      fs.writeFileSync(
        path.join(projectReportRoot(project.projectName), 'tests', 'index.html'),
        persistentReporter.renderHtml({
          ...project.tests,
          dashboardHref,
          summaryHref: `${dashboardHref}#${project.projectName}/summary`
        }),
        'utf8'
      );
    }
    fs.writeFileSync(
      path.join(projectReportRoot(project.projectName), 'coverage.html'),
      reportBranding.renderCoverageWrapper({
        applicationName: project.title,
        generatedAt: project.tests?.finishedAt || generatedAt,
        version: project.version,
        projectName: project.projectName,
        dashboardHref: projectDashboardHref(project.projectName),
        summaryHref: `${projectDashboardHref(project.projectName)}#${project.projectName}/summary`
      }),
      'utf8'
    );
  }

  const output = path.join(reportsRoot, 'index.html');
  fs.writeFileSync(output, renderDashboard(data, generatedAt, workspaceVersion), 'utf8');
  return { output, missing: data.flatMap(({ missing }) => missing) };
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
