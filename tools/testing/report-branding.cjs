'use strict';

const fs = require('node:fs');
const path = require('node:path');
const shellRoot = path.join(__dirname, '..', 'platform-shell');
const shellStyles = fs.readFileSync(path.join(shellRoot, 'platform-shell.css'), 'utf8');
const shellScript = fs.readFileSync(path.join(shellRoot, 'platform-shell.js'), 'utf8');
const logoDataUri = `data:image/svg+xml;base64,${fs.readFileSync(path.join(shellRoot, 'validation-rules-mark.svg')).toString('base64')}`;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function reportHeadAssets() {
  const serializedStyles = JSON.stringify(shellStyles).replaceAll('<', '\\u003c');
  return `<meta name="theme-color" content="#10243e"><link rel="icon" href="${logoDataUri}" type="image/svg+xml">
  <style>${shellStyles}</style>
  <script>globalThis.validationPlatformShellStyles=${serializedStyles};${shellScript}</script>`;
}

function renderReportHeader({ applicationName, reportType, generatedAt, version }) {
  const summaryId = `report-summary-${String(applicationName).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return `<validation-platform-shell active-application="reports" application-name="Reports" version="${escapeHtml(version)}" brand-mark-url="${logoDataUri}">
    <section class="vr-report-summary" data-report-summary>
      <div class="vr-report-summary__heading">
        <div><span class="vr-report-eyebrow">${escapeHtml(applicationName)}</span><h1>${escapeHtml(reportType)}</h1></div>
        <button type="button" aria-expanded="true" aria-controls="${summaryId}"><span>Collapse details</span><i aria-hidden="true"></i></button>
      </div>
      <div class="vr-report-summary__details" id="${summaryId}"><dl class="vr-report-metadata">
        <div><dt>Application</dt><dd>${escapeHtml(applicationName)}</dd></div>
        <div><dt>Report</dt><dd>${escapeHtml(reportType)}</dd></div>
        <div><dt>Version</dt><dd>${escapeHtml(version)}</dd></div>
        <div><dt>Generated</dt><dd>${escapeHtml(generatedAt)}</dd></div>
      </dl></div>
    </section>
    <script>(()=>{const root=document.currentScript.previousElementSibling;const button=root.querySelector('button');const key='validation-rules:report-summary';const preference=sessionStorage.getItem(key);const setExpanded=(expanded,persist)=>{root.classList.toggle('collapsed',!expanded);button.setAttribute('aria-expanded',String(expanded));button.querySelector('span').textContent=expanded?'Collapse details':'Expand details';if(persist)sessionStorage.setItem(key,expanded?'expanded':'collapsed');};setExpanded(preference!=='collapsed',false);button.addEventListener('click',()=>setExpanded(button.getAttribute('aria-expanded')!=='true',true));if(preference===null)setTimeout(()=>setExpanded(false,false),10000);})();</script>`;
}

function renderReportSubnavigation({ dashboardHref, summaryHref, testsHref, coverageHref, junitHref }) {
  const links = [
    ['Summary', summaryHref || dashboardHref],
    ['Tests', testsHref],
    ['Coverage', coverageHref],
    ['JUnit XML', junitHref]
  ].filter(([, href]) => href);

  return `<nav class="vr-report-subnav" aria-label="Report navigation">${links
    .map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
    .join('')}</nav>`;
}

function renderReportFooter() {
  return '</validation-platform-shell>';
}

function reportStyles() {
  return `
    :root { color-scheme:light; --vr-ink:#17273c; --vr-muted:#52657a; --vr-line:#dbe3eb; --vr-panel:#fff; --vr-bg:#eef2f8; --vr-accent:#08736a; --vr-pass:#087443; --vr-warn:#b54708; --vr-fail:#b42318; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--vr-ink); background:var(--vr-bg); font:15px/1.5 Inter,system-ui,-apple-system,"Segoe UI",sans-serif; }
    .vr-report-summary { box-sizing:border-box; max-width:1600px; margin:0 auto; padding:24px 28px; border-bottom:1px solid var(--vr-line); background:#fff; }
    .vr-report-summary__heading { display:flex; align-items:center; justify-content:space-between; gap:24px; }
    .vr-report-summary__heading button { display:flex; align-items:center; gap:8px; padding:7px 10px; border:1px solid #c8d5df; border-radius:8px; color:#40556b; background:#f7fafb; font:inherit; font-size:11px; cursor:pointer; }
    .vr-report-summary__heading button:hover { color:#075f59; border-color:#8bc7c1; background:#eaf5f3; }
    .vr-report-summary__heading button i { width:7px; height:7px; border-right:1px solid; border-bottom:1px solid; transform:rotate(225deg); transition:transform .22s ease; }
    .vr-report-summary.collapsed .vr-report-summary__heading button i { transform:rotate(45deg); }
    .vr-report-summary__details { max-height:100px; overflow:hidden; opacity:1; transition:max-height .3s ease,opacity .22s ease,margin .3s ease; }
    .vr-report-summary.collapsed .vr-report-summary__details { max-height:0; margin:0; opacity:0; }
    .vr-report-eyebrow { color:#075f59; font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
    .vr-report-summary h1 { margin:5px 0 0; color:var(--vr-ink); font-size:30px; line-height:1.15; }
    .vr-report-metadata { display:grid; grid-template-columns:repeat(4,minmax(120px,1fr)); gap:8px 24px; margin:18px 0 0; }
    .vr-report-metadata div { min-width:0; }
    .vr-report-metadata dt { color:#52657a; font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
    .vr-report-metadata dd { margin:1px 0 0; color:#40556b; font-size:12px; overflow-wrap:anywhere; }
    .vr-report-subnav { display:flex; flex-wrap:wrap; gap:7px; max-width:1500px; margin:0 auto; padding:14px 28px; border-bottom:1px solid var(--vr-line); background:#fff; }
    .vr-report-subnav a { padding:7px 11px; border:1px solid #cbd9df; border-radius:8px; color:#08736a; background:#f8fbfb; font-size:13px; font-weight:700; text-decoration:none; }
    .vr-report-subnav a:hover { border-color:#8bc7c1; background:#eaf5f3; }
    @media (max-width:660px) { .vr-report-summary,.vr-report-subnav { padding-left:16px; padding-right:16px; } .vr-report-summary h1 { font-size:25px; } .vr-report-summary__heading button span { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); } .vr-report-metadata { grid-template-columns:1fr 1fr; } }
  `;
}

function renderCoverageWrapper({
  applicationName,
  generatedAt,
  version,
  projectName,
  dashboardHref = '../index.html',
  summaryHref = `../index.html#${projectName}/summary`
}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="report-project" content="${escapeHtml(projectName)}">
  ${reportHeadAssets()}
  <title>${escapeHtml(applicationName)} coverage report</title>
  <style>${reportStyles()}
    html,body { min-height:100%; }
    .coverage-frame { display:block; width:100%; height:calc(100vh - 250px); min-height:720px; border:0; background:#fff; }
  </style>
</head>
<body>
  ${renderReportHeader({ applicationName, reportType: 'Code coverage report', generatedAt, version })}
  ${renderReportSubnavigation({ dashboardHref, summaryHref, testsHref: './tests/index.html', coverageHref: './coverage.html', junitHref: './junit/test-results.xml' })}
  <iframe class="coverage-frame" src="./coverage/index.html" title="${escapeHtml(applicationName)} Istanbul coverage details"></iframe>
  ${renderReportFooter()}
</body>
</html>`;
}

module.exports = {
  escapeHtml,
  reportHeadAssets,
  renderCoverageWrapper,
  renderReportFooter,
  renderReportHeader,
  renderReportSubnavigation,
  reportStyles
};
