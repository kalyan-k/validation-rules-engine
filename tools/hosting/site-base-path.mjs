/**
 * Optional public path prefix for hosts that are not at domain root
 * (e.g. GitHub Pages project sites: /validation-rules-engine).
 * Leave unset for local single/multi-host, Docker, and Azure Static Web Apps.
 */
export function getSiteBasePath(env = process.env) {
  const raw = String(env.VRE_SITE_BASE_PATH ?? '').trim();
  if (!raw || raw === '/') {
    return '';
  }
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.replace(/\/+$/u, '');
}

export function withSiteBase(pathname, siteBase = getSiteBasePath()) {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (!siteBase) {
    return normalized;
  }
  if (normalized === '/') {
    return `${siteBase}/`;
  }
  if (normalized === siteBase || normalized.startsWith(`${siteBase}/`)) {
    return normalized;
  }
  return `${siteBase}${normalized}`;
}

/**
 * Prefix root-absolute paths (href="/...", src='/...', url(/...)) with the site base.
 * Safe to run once; skips values that already start with the base path.
 */
export function prefixRootAbsolutePaths(content, siteBase = getSiteBasePath()) {
  if (!siteBase || typeof content !== 'string' || !content.includes('/')) {
    return content;
  }

  return content.replace(/(^|[\s(["'=]|url\()(\/)(?!\/)/gu, (full, lead, _slash, offset, source) => {
    const rest = source.slice(offset + lead.length);
    if (rest.startsWith(siteBase)) {
      return full;
    }
    return `${lead}${siteBase}/`;
  });
}
