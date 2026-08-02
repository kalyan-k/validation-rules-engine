const statusList = document.querySelector('#status-list');
const applicationGrid = document.querySelector('#application-grid');
const overallStatus = document.querySelector('#overall-status');
const playwrightResults = document.querySelector('#playwright-results');

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
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
    actions?.insertAdjacentHTML('beforebegin', `
      <details class="integration-links" data-integration-key="${escapeHtml(application.shortTitle)}"${openIntegrations.has(application.shortTitle) ? ' open' : ''}><summary>Explore ${escapeHtml(application.shortTitle)} integrations</summary><div>
        ${application.showcaseLinks.map((link) => `<span><a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a><a href="${escapeHtml(link.documentationUrl)}" aria-label="${escapeHtml(link.label)} documentation">Docs</a></span>`).join('')}
      </div></details>
    `);
  });
  const hasFailure = applications.some(({ state }) => state === 'failed');
  const allHealthy = applications.length > 0 && applications.every(({ state }) => state === 'healthy');
  overallStatus.textContent = hasFailure ? 'Attention' : allHealthy ? 'All ready' : 'Starting';
  overallStatus.className = `overall-status ${hasFailure ? 'failed' : allHealthy ? 'healthy' : 'starting'}`;
}

async function refreshStatus() {
  if (!statusList || !applicationGrid || !overallStatus) return;
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    const payload = await response.json();
    renderApplications(payload.applications);
  } catch {
    overallStatus.textContent = 'Disconnected';
    overallStatus.className = 'overall-status failed';
  }
}

async function loadMeta() {
  try {
    const response = await fetch('/api/meta', { cache: 'no-store' });
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
    const response = await fetch('/api/playwright/latest', { cache: 'no-store' });
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
        <a href="/automation/artifacts/${escapeHtml(payload.artifacts?.htmlReport || 'html-report/index.html')}">Open full HTML report</a>
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
        <a href="/automation/artifacts/${escapeHtml(payload.artifacts?.jsonReport || 'json/results.json')}">JSON</a>
        <a href="/automation/artifacts/${escapeHtml(payload.artifacts?.junitReport || 'junit/test-results.xml')}">JUnit</a>
        <a href="/automation/artifacts/${escapeHtml(payload.artifacts?.visualDiffs || 'visual-diffs')}">Visual diffs</a>
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
        <li><a href="/automation/artifacts/${escapeHtml(payload.artifacts?.htmlReport || 'html-report/index.html')}">HTML report</a> for human triage and debugging.</li>
        <li><a href="/automation/artifacts/${escapeHtml(payload.artifacts?.jsonReport || 'json/results.json')}">JSON results</a> for dashboards and APIs.</li>
        <li><a href="/automation/artifacts/${escapeHtml(payload.artifacts?.junitReport || 'junit/test-results.xml')}">JUnit XML</a> for CI systems and quality gates.</li>
        <li>Failure screenshots, videos, and traces are retained under <code>artifacts/playwright/test-results</code>.</li>
        <li>Visual regression diffs are retained under <code>artifacts/playwright/visual-diffs</code>.</li>
      </ul>
    </section>
  `;
}

function metric(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 0)}</strong></div>`;
}

function breakdown(label, entries) {
  if (!entries.length) return '';
  return `
    <section>
      <h4>${escapeHtml(label)}</h4>
      ${entries.map(([name, totals]) => `<p><span>${escapeHtml(name)}</span><strong>${escapeHtml(totals.passed || 0)}/${escapeHtml(totals.total || 0)} passed</strong></p>`).join('')}
    </section>
  `;
}

function compactBreakdown(label, entries) {
  if (!entries.length) return '';
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      ${entries.map(([name, totals]) => `<p><strong>${escapeHtml(name)}</strong> ${escapeHtml(totals.total || 0)}</p>`).join('')}
    </div>
  `;
}

function formatDuration(value) {
  const ms = Number(value || 0);
  if (!ms) return '0 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

void loadMeta();
void loadPlaywrightResults();
if (statusList && applicationGrid && overallStatus) {
  void refreshStatus();
  setInterval(refreshStatus, 2500);
}
