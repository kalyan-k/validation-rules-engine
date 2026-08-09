const panel = document.querySelector('#contact-form-panel');

function siteBasePath() {
  return typeof globalThis.vrePlatformConfig?.siteBase === 'string'
    ? globalThis.vrePlatformConfig.siteBase
    : '';
}

function renderConfiguredForm(embedUrl) {
  if (!(panel instanceof HTMLElement)) return;
  panel.innerHTML = `
    <iframe
      class="contact-frame"
      title="Contact Validation Rules Engine"
      src="${embedUrl}"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"></iframe>
    <p class="contact-note">If the embedded form does not load, <a href="${embedUrl}" target="_blank" rel="noopener noreferrer">open the contact form in a new tab</a>.</p>
  `;
}

function renderMissingConfiguration() {
  if (!(panel instanceof HTMLElement)) return;
  panel.innerHTML = `
    <article class="contact-empty">
      <h2>Contact form is not configured for this deployment</h2>
      <p>Set the <code>VRE_CONTACT_FORM_URL</code> secret/environment variable to a Google Form embed URL during Azure or GitHub Pages deployment. The URL is injected into <code>platform-config.js</code> at build time and is not stored in the repository.</p>
      <p>Locally you can also create <code>apps/portal/public/contact.html</code> previews by exporting:</p>
      <pre>VRE_CONTACT_FORM_URL=https://docs.google.com/forms/d/e/.../viewform?embedded=true</pre>
      <p>Base path for this host: <code>${siteBasePath() || '/'}</code></p>
    </article>
  `;
}

const embedUrl = typeof globalThis.vrePlatformConfig?.contactFormEmbedUrl === 'string'
  ? globalThis.vrePlatformConfig.contactFormEmbedUrl.trim()
  : '';

if (embedUrl && /^https:\/\/docs\.google\.com\/forms\//u.test(embedUrl)) {
  renderConfiguredForm(embedUrl);
} else {
  renderMissingConfiguration();
}
