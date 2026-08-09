const panel = document.querySelector('#contact-form-panel');

function siteBasePath() {
  return typeof globalThis.vrePlatformConfig?.siteBase === 'string'
    ? globalThis.vrePlatformConfig.siteBase
    : '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeContactFormUrl(rawValue) {
  const value = String(rawValue ?? '').trim();
  if (!value) {
    return { ok: false, reason: 'missing' };
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: 'invalid', detail: 'URL could not be parsed.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'invalid', detail: 'Only https Google Form URLs are accepted.' };
  }

  if (parsed.hostname === 'forms.gle') {
    return {
      ok: false,
      reason: 'invalid',
      detail: 'Short forms.gle links are not embeddable. Open the form → Share → embed and copy the docs.google.com iframe src.'
    };
  }

  if (parsed.hostname !== 'docs.google.com' || !parsed.pathname.includes('/forms/')) {
    return {
      ok: false,
      reason: 'invalid',
      detail: `Host/path must be docs.google.com/forms/... (received ${parsed.hostname}${parsed.pathname}).`
    };
  }

  if (!parsed.searchParams.has('embedded')) {
    parsed.searchParams.set('embedded', 'true');
  }

  return { ok: true, url: parsed.toString() };
}

function renderConfiguredForm(embedUrl) {
  if (!(panel instanceof HTMLElement)) return;
  const safeUrl = escapeHtml(embedUrl);
  panel.innerHTML = `
    <iframe
      class="contact-frame"
      title="Contact Validation Rules Engine"
      src="${safeUrl}"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"></iframe>
    <p class="contact-note">If the embedded form does not load, <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">open the contact form in a new tab</a>.</p>
  `;
}

function renderMissingConfiguration(reason, detail) {
  if (!(panel instanceof HTMLElement)) return;
  const title = reason === 'invalid'
    ? 'Contact form URL is present but not a usable Google Form embed URL'
    : 'Contact form is not configured for this deployment';
  panel.innerHTML = `
    <article class="contact-empty">
      <h2>${escapeHtml(title)}</h2>
      <p>Set repository Actions secret <code>VRE_CONTACT_FORM_URL</code> (not only an Environment secret on <code>github-pages</code>, and not only a plain Actions variable unless the workflow reads <code>vars.*</code>).</p>
      <p>Then re-run the Azure / GitHub Pages workflow so <code>npm run build:site</code> regenerates <code>platform-config.js</code>. Secrets are injected at build time.</p>
      <p>Expected value shape:</p>
      <pre>https://docs.google.com/forms/d/e/FORM_ID/viewform?embedded=true</pre>
      ${detail ? `<p>${escapeHtml(detail)}</p>` : ''}
      <p>Base path for this host: <code>${escapeHtml(siteBasePath() || '/')}</code></p>
    </article>
  `;
}

const configured = normalizeContactFormUrl(globalThis.vrePlatformConfig?.contactFormEmbedUrl);
if (configured.ok) {
  renderConfiguredForm(configured.url);
} else {
  renderMissingConfiguration(configured.reason, configured.detail);
}
