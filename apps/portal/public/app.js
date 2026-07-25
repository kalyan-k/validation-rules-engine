const statusList = document.querySelector('#status-list');
const applicationGrid = document.querySelector('#application-grid');
const overallStatus = document.querySelector('#overall-status');

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function renderApplications(applications) {
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
      <details class="integration-links"><summary>Explore ${escapeHtml(application.shortTitle)} integrations</summary><div>
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
    document.querySelector('#version').textContent = meta.version;
    document.querySelector('validation-platform-shell')?.setAttribute('version', meta.version);
    document.querySelector('#revision').textContent = meta.revision;
    document.querySelector('#build-time').textContent = meta.builtAt;
  } catch { /* Optional metadata does not block the portal. */ }
}

void loadMeta();
void refreshStatus();
setInterval(refreshStatus, 2500);
