const statusList = document.querySelector('#status-list');
const applicationGrid = document.querySelector('#application-grid');
const overallStatus = document.querySelector('#overall-status');
const playwrightResults = document.querySelector('#playwright-results');
const securityResults = document.querySelector('#security-results');

function configureStaticNavigation() {
  const urls = globalThis.vrePlatformConfig?.urls ?? {};
  document.querySelectorAll('[data-vre-url-base][data-vre-url-path]').forEach((link) => {
    const baseKey = link.getAttribute('data-vre-url-base');
    const path = link.getAttribute('data-vre-url-path');
    if (!(link instanceof HTMLAnchorElement) || !baseKey || !path) return;
    const configuredBase = typeof urls[baseKey] === 'string' && urls[baseKey].trim()
      ? urls[baseKey]
      : globalThis.location.origin;
    link.href = new URL(path.replace(/^\/+/, ''), `${configuredBase.replace(/\/$/, '')}/`).href;
  });
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function createIntegrationLinks(application, isOpen) {
  const details = document.createElement('details');
  details.className = 'integration-links';
  details.dataset.integrationKey = application.shortTitle;
  details.open = Boolean(isOpen);

  const summary = document.createElement('summary');
  summary.textContent = `Explore ${application.shortTitle} integrations`;

  const container = document.createElement('div');
  for (const link of application.showcaseLinks) {
    const row = document.createElement('span');
    const appLink = document.createElement('a');
    appLink.href = link.url;
    appLink.textContent = link.label;
    const docsLink = document.createElement('a');
    docsLink.href = link.documentationUrl;
    docsLink.setAttribute('aria-label', `${link.label} documentation`);
    docsLink.textContent = 'Docs';
    row.append(appLink, docsLink);
    container.append(row);
  }

  details.append(summary, container);
  return details;
}

function renderApplications(applications) {
  if (!statusList || !applicationGrid || !overallStatus) return;
  const openIntegrations = new Set(
    [...applicationGrid.querySelectorAll('details.integration-links[open]')]
      .map((details) => details.getAttribute('data-integration-key'))
      .filter(Boolean)
  );
  statusList.innerHTML = applications.map((application) => `
    <div class="status-row ${escapeHtml(application.state)}"><span class="status-dot" aria-hidden="true"></span><span><strong>${escapeHtml(application.shortTitle)}</strong><small>${escapeHtml(application.detail)}</small></span><a href="${escapeHtml(application.url)}">Open</a></div>
  `).join('');
  applicationGrid.innerHTML = applications.map((application, index) => `
    <article class="application-card"><div class="application-card-top"><span class="application-index">0${index + 1} - ${escapeHtml(application.kind)}</span><span class="application-state ${escapeHtml(application.state)}">${escapeHtml(application.state)}</span></div><h3>${escapeHtml(application.title)}</h3><p>${escapeHtml(application.description)}</p><div class="tag-list">${application.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div><div class="card-actions"><a href="${escapeHtml(application.url)}">Open application &rarr;</a><a href="${escapeHtml(application.documentationUrl)}">Read documentation</a></div></article>
  `).join('');
  applications.forEach((application, index) => {
    if (!application.showcaseLinks?.length) return;
    const actions = applicationGrid.children[index]?.querySelector('.card-actions');
    if (!actions) return;
    actions.before(createIntegrationLinks(application, openIntegrations.has(application.shortTitle)));
  });
  const hasFailure = applications.some(({ state }) => state === 'failed');
  const allHealthy = applications.length > 0 && applications.every(({ state }) => state === 'healthy');
  overallStatus.textContent = hasFailure ? 'Attention' : allHealthy ? 'All ready' : 'Starting';
  overallStatus.className = `overall-status ${hasFailure ? 'failed' : allHealthy ? 'healthy' : 'starting'}`;
}

function siteBasePath() {
  return typeof globalThis.vrePlatformConfig?.siteBase === 'string'
    ? globalThis.vrePlatformConfig.siteBase
    : '';
}

/** Root-absolute site path that works for Azure/local (no base) and GitHub Pages. */
function sitePath(pathname) {
  const siteBase = siteBasePath();
  let path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (!siteBase || path === siteBase || path.startsWith(`${siteBase}/`)) {
    return path;
  }
  return `${siteBase}${path}`;
}

function apiUrl(pathname) {
  const withJson = pathname.endsWith('.json') ? pathname : `${pathname}.json`;
  return sitePath(withJson);
}

async function refreshStatus() {
  if (!statusList || !applicationGrid || !overallStatus) return;
  try {
    const response = await fetch(apiUrl('/api/status'), { cache: 'no-store' });
    const payload = await response.json();
    renderApplications(payload.applications);
  } catch {
    overallStatus.textContent = 'Disconnected';
    overallStatus.className = 'overall-status failed';
  }
}

async function loadMeta() {
  try {
    const response = await fetch(apiUrl('/api/meta'), { cache: 'no-store' });
    const meta = await response.json();
    const version = document.querySelector('#version');
    const revision = document.querySelector('#revision');
    const buildTime = document.querySelector('#build-time');
    if (version) version.textContent = meta.version;
    document.querySelector('validation-platform-shell')?.setAttribute('version', meta.version);
    if (revision) revision.textContent = meta.revision;
    if (buildTime) buildTime.textContent = meta.builtAt;
  } catch { /* Optional metadata does not block the portal. */ }
}

async function loadPlaywrightResults() {
  if (!playwrightResults) return;
  try {
    const response = await fetch(apiUrl('/api/playwright/latest'), { cache: 'no-store' });
    const payload = await response.json();
    renderPlaywrightResults(payload);
  } catch {
    renderPlaywrightResults({
      available: false,
      message: 'Playwright report data could not be loaded.',
      command: 'npm run test:e2e:smoke'
    });
  }
}

function renderPlaywrightResults(payload) {
  const catalog = payload.catalog;
  if (payload.available === false) {
    playwrightResults.innerHTML = `
      <article class="playwright-empty">
        <h3>${escapeHtml(payload.message || 'No Playwright report data is available yet.')}</h3>
        <p>Generate local E2E data with <code>${escapeHtml(payload.command || 'npm run test:e2e:smoke')}</code>.</p>
        ${catalog ? renderCatalogCard(catalog) : ''}
      </article>
    `;
    return;
  }

  const totals = payload.totals || {};
  const execution = payload.execution || {};
  const browserTotals = Object.entries(payload.browserTotals || {});
  const applicationTotals = Object.entries(payload.applicationTotals || {});
  const failures = payload.failures || [];
  const status = payload.status || 'unknown';
  playwrightResults.innerHTML = `
    <article class="playwright-summary ${escapeHtml(status)}">
      <div class="playwright-summary-top">
        <div>
          <span class="application-index">Latest run</span>
          <h3>${escapeHtml(status.toUpperCase())}</h3>
          <p>${escapeHtml(payload.startTime || 'Unknown start time')} &middot; ${formatDuration(payload.durationMs)} &middot; ${escapeHtml(execution.scope || 'unknown')} run</p>
          ${execution.configuredTotal ? `<p class="playwright-run-scope">Executed ${escapeHtml(execution.executedTotal ?? totals.total ?? 0)} of ${escapeHtml(execution.configuredTotal)} configured tests.</p>` : ''}
        </div>
        <a href="${escapeHtml(sitePath(`/automation/artifacts/${payload.artifacts?.htmlReport || 'html-report/index.html'}`))}">Open full HTML report</a>
      </div>
      ${renderScopeNotice(execution)}
      <div class="playwright-metrics">
        ${metric('Executed', totals.total)}
        ${metric('Passed', totals.passed)}
        ${metric('Failed', totals.failed)}
        ${metric('Skipped', totals.skipped)}
        ${metric('Flaky', totals.flaky)}
      </div>
      <div class="playwright-breakdowns">
        ${breakdown('Browsers', browserTotals)}
        ${breakdown('Applications', applicationTotals)}
      </div>
      <div class="playwright-info-grid">
        ${catalog ? renderCatalogCard(catalog) : ''}
        ${renderEnterpriseReportPack(payload)}
      </div>
      ${failures.length ? `<div class="playwright-failures"><h4>Failure summary</h4>${failures.map((failure) => `<p><strong>${escapeHtml(failure.application || 'application')}</strong> ${escapeHtml(failure.title || '')}</p>`).join('')}</div>` : ''}
      <div class="playwright-links">
        <a href="${escapeHtml(sitePath(`/automation/artifacts/${payload.artifacts?.jsonReport || 'json/results.json'}`))}">JSON</a>
        <a href="${escapeHtml(sitePath(`/automation/artifacts/${payload.artifacts?.junitReport || 'junit/test-results.xml'}`))}">JUnit</a>
        <a href="${escapeHtml(sitePath(`/automation/artifacts/${payload.artifacts?.visualDiffs || 'visual-diffs'}/`))}">Visual diffs</a>
        ${payload.ci?.url ? `<a href="${escapeHtml(payload.ci.url)}">CI run</a>` : ''}
      </div>
    </article>
  `;
}

function renderScopeNotice(execution) {
  if (!execution?.configuredTotal || execution.scope !== 'focused') {
    return '';
  }
  return `
    <div class="playwright-scope-note">
      <strong>Focused latest execution:</strong>
      this run executed ${escapeHtml(execution.executedTotal || 0)} of ${escapeHtml(execution.configuredTotal)} configured tests
      (${escapeHtml(execution.coveragePercent ?? 0)}%). Run <code>${escapeHtml(execution.recommendedFullCommand || 'npm run test:e2e:full')}</code>
      to refresh the dashboard with every Playwright project.
    </div>
  `;
}

function renderCatalogCard(catalog) {
  const browserTotals = Object.entries(catalog.browserTotals || {});
  const applicationTotals = Object.entries(catalog.applicationTotals || {});
  return `
    <section class="playwright-catalog-card">
      <h4>Configured test catalog</h4>
      <p><strong>${escapeHtml(catalog.totals?.total ?? 0)}</strong> tests are configured across all Playwright projects.</p>
      <div class="playwright-mini-breakdowns">
        ${compactBreakdown('Projects', browserTotals)}
        ${compactBreakdown('Applications', applicationTotals)}
      </div>
    </section>
  `;
}

function renderEnterpriseReportPack(payload) {
  return `
    <section class="playwright-enterprise-card">
      <h4>Enterprise reporting pack</h4>
      <ul>
        <li><a href="${escapeHtml(sitePath(`/automation/artifacts/${payload.artifacts?.htmlReport || 'html-report/index.html'}`))}">HTML report</a> for human triage and debugging.</li>
        <li><a href="${escapeHtml(sitePath(`/automation/artifacts/${payload.artifacts?.jsonReport || 'json/results.json'}`))}">JSON results</a> for dashboards and APIs.</li>
        <li><a href="${escapeHtml(sitePath(`/automation/artifacts/${payload.artifacts?.junitReport || 'junit/test-results.xml'}`))}">JUnit XML</a> for CI systems and quality gates.</li>
        <li>Failure screenshots, videos, and traces are retained under <code>artifacts/playwright/test-results</code>.</li>
        <li>Visual regression diffs are retained under <code>artifacts/playwright/visual-diffs</code>.</li>
      </ul>
    </section>
  `;
}

function metric(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 0)}</strong></div>`;
}

function applicationLabel(name) {
  const labels = {
    vanilla: 'Vanilla JS Showcase',
    angular: 'Angular Showcase',
    react: 'React Showcase',
    documentation: 'Documentation',
    portal: 'Portal',
    reports: 'Reports',
    platform: 'Platform'
  };
  return labels[name] || name;
}

function breakdown(label, entries) {
  if (!entries.length) return '';
  return `
    <section>
      <h4>${escapeHtml(label)}</h4>
      ${entries.map(([name, totals]) => `<p><span>${escapeHtml(applicationLabel(name))}</span><strong>${escapeHtml(totals.passed || 0)}/${escapeHtml(totals.total || 0)} passed</strong></p>`).join('')}
    </section>
  `;
}

function compactBreakdown(label, entries) {
  if (!entries.length) return '';
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      ${entries.map(([name, totals]) => `<p><strong>${escapeHtml(applicationLabel(name))}</strong> ${escapeHtml(totals.total || 0)}</p>`).join('')}
    </div>
  `;
}

function formatDuration(value) {
  const ms = Number(value || 0);
  if (!ms) return '0 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

async function loadSecurityResults() {
  if (!securityResults) return;
  try {
    const response = await fetch(apiUrl('/api/security/latest'), { cache: 'no-store' });
    const payload = await response.json();
    renderSecurityResults(payload);
  } catch {
    renderSecurityResults({
      available: false,
      message: 'Security report data could not be loaded.',
      command: 'npm run security:full && npm run evidence:publish',
      checks: [],
      packages: [
        '@validation-rules-engine/core',
        '@validation-rules-engine/angular',
        '@validation-rules-engine/react'
      ]
    });
  }
}

function renderSecurityResults(payload) {
  if (!securityResults) return;
  const checks = Array.isArray(payload.checks) ? payload.checks : [];
  const totals = payload.totals || {};
  const packages = payload.packages || [];
  const statusClass = securityStatusClass(payload.label || 'UNAVAILABLE');

  if (!checks.length) {
    securityResults.innerHTML = `
      <article class="playwright-empty">
        <h3>${escapeHtml(payload.message || 'No security report data is available yet.')}</h3>
        <p>Generate and publish evidence with <code>${escapeHtml(payload.command || 'npm run security:full && npm run evidence:publish')}</code>.</p>
      </article>
    `;
    return;
  }

  securityResults.innerHTML = `
    <article class="playwright-summary security-summary ${escapeHtml(statusClass)}">
      <div class="playwright-summary-top">
        <div>
          <span class="application-index">Latest security gate</span>
          <h3>${escapeHtml(payload.label || 'UNAVAILABLE')}</h3>
          <p>${escapeHtml(payload.scannedAt || payload.generatedAt || 'Unknown scan time')}
            ${payload.profile ? ` &middot; profile <strong>${escapeHtml(payload.profile)}</strong>` : ''}</p>
          <p class="playwright-run-scope">${escapeHtml(payload.message || 'Security validation summary for public packages and the developer platform.')}</p>
        </div>
        <a href="${escapeHtml(sitePath('/security/artifacts/security-summary.json'))}">Open summary JSON</a>
      </div>
      <div class="playwright-metrics security-metrics">
        ${metric('Configured', totals.configured)}
        ${metric('Executed', totals.executed)}
        ${metric('Passed', totals.passed)}
        ${metric('Failed', totals.failed)}
        ${metric('Errors', totals.errored)}
      </div>
      <div class="playwright-info-grid">
        ${renderSecurityPackagesCard(packages, payload.compliance)}
        ${renderSecurityStandardsCard(payload.standards)}
      </div>
      ${renderSecurityChecksTable(checks)}
      <div class="playwright-links">
        <a href="${escapeHtml(sitePath('/security/artifacts/npm-audit/'))}">npm audit</a>
        <a href="${escapeHtml(sitePath('/security/artifacts/semgrep/'))}">Semgrep</a>
        <a href="${escapeHtml(sitePath('/security/artifacts/gitleaks/'))}">Gitleaks</a>
        <a href="${escapeHtml(sitePath('/security/artifacts/dependency-check/'))}">Dependency-Check</a>
        <a href="${escapeHtml(sitePath('/security/artifacts/sbom/'))}">SBOM</a>
        <a href="${escapeHtml(sitePath('/docs/security'))}">Security docs</a>
      </div>
    </article>
  `;
}

function securityStatusClass(label) {
  const normalized = String(label || '').toUpperCase();
  if (normalized === 'PASS') return 'pass';
  if (normalized === 'FAIL') return 'fail';
  if (normalized === 'ERROR') return 'error';
  return 'unavailable';
}

function securityBadgeClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PASS') return 'pass';
  if (normalized === 'FAIL') return 'fail';
  if (normalized === 'ERROR') return 'error';
  return 'info';
}

function renderSecurityPackagesCard(packages, compliance) {
  return `
    <section class="playwright-catalog-card">
      <h4>Package security posture</h4>
      <p>${escapeHtml(compliance?.summary || 'Public packages are released through synchronized quality and security gates.')}</p>
      <ul class="security-package-list">
        ${(packages || []).map((name) => `<li><code>${escapeHtml(name)}</code></li>`).join('')}
      </ul>
    </section>
  `;
}

function renderSecurityStandardsCard(standards) {
  const items = Array.isArray(standards) ? standards : [];
  return `
    <section class="playwright-enterprise-card">
      <h4>Controls &amp; standards</h4>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>SAST, SCA, secrets, SBOM, and release gates.</li>'}
        <li>CodeQL findings are tracked in GitHub Security / code scanning.</li>
        <li>Publish uses npm provenance from the tagged release workflow.</li>
      </ul>
    </section>
  `;
}

function renderSecurityChecksTable(checks) {
  if (!checks.length) return '';
  return `
    <div class="security-checks">
      <h4>Security checks</h4>
      <div class="security-check-table" role="table" aria-label="Security checks">
        <div class="security-check-row security-check-head" role="row">
          <span role="columnheader">Check</span>
          <span role="columnheader">Layer</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Summary</span>
        </div>
        ${checks.map((check) => `
          <div class="security-check-row" role="row">
            <span role="cell"><strong>${escapeHtml(check.name)}</strong><small>${escapeHtml(check.scope || '')}</small></span>
            <span role="cell">${escapeHtml(check.layer || '')}</span>
            <span role="cell"><em class="security-status ${escapeHtml(securityBadgeClass(check.status))}">${escapeHtml(check.status || 'UNKNOWN')}</em></span>
            <span role="cell">${escapeHtml(check.summary || check.description || '')}${renderSecurityArtifactLinks(check)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSecurityArtifactLinks(check) {
  const hints = Array.isArray(check.artifactHints) ? check.artifactHints.filter(Boolean) : [];
  if (!hints.length) return '';
  return `<span class="security-artifact-links">${hints.map((hint) => `<a href="${escapeHtml(sitePath(`/security/artifacts/${hint}`))}">${escapeHtml(hint.split('/').pop())}</a>`).join(' ')}</span>`;
}

configureStaticNavigation();
void loadMeta();
void loadPlaywrightResults();
void loadSecurityResults();
if (statusList && applicationGrid && overallStatus) {
  void refreshStatus();
  setInterval(refreshStatus, 2500);
}
