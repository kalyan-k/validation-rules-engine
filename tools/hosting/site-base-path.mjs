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

function prefixPath(pathname, siteBase) {
  if (!siteBase || typeof pathname !== 'string' || !pathname.startsWith('/')) {
    return pathname;
  }
  if (pathname.startsWith('//')) {
    return pathname;
  }
  if (pathname === siteBase || pathname.startsWith(`${siteBase}/`)) {
    return pathname;
  }
  return `${siteBase}${pathname}`;
}

/**
 * Prefix root-absolute paths in HTML attributes and CSS url(...) with the site base.
 * Only rewrites quoted attribute values and url() references — never bare `/.../` sequences,
 * which would corrupt JavaScript regex literals (e.g. /\/$/ or /^https?:$/u).
 */
export function prefixRootAbsolutePaths(content, siteBase = getSiteBasePath()) {
  if (!siteBase || typeof content !== 'string' || !content.includes('/')) {
    return content;
  }

  let result = content.replace(
    /\b((?:href|src|action|poster|formaction|cite|xlink:href|data-[\w-]+|(?:portal|docs|angular|react|vanilla)-url))=(["'])(\/(?!\/)[^"']*)\2/gu,
    (_full, attr, quote, pathname) => `${attr}=${quote}${prefixPath(pathname, siteBase)}${quote}`
  );

  result = result.replace(
    /url\(\s*(['"]?)(\/(?!\/)[^)"']*)\1\s*\)/gu,
    (_full, quote, pathname) => `url(${quote}${prefixPath(pathname, siteBase)}${quote})`
  );

  return result;
}
