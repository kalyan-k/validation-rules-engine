export type ShowcaseRoute = '/' | '/simple' | '/complex' | '/performance';

export function appBase(): string {
  const base = String(import.meta.env.BASE_URL || '/');
  return base.endsWith('/') ? base : `${base}/`;
}

export function routeHref(path: ShowcaseRoute | string): string {
  const normalized = path === '/' ? '' : path.replace(/^\//u, '');
  return `${appBase()}${normalized}`;
}

export function stripBase(pathname: string): string {
  const base = appBase().replace(/\/+$/u, '');
  let path = pathname;
  if (base && (path === base || path.startsWith(`${base}/`))) {
    path = path.slice(base.length) || '/';
  }
  return path.startsWith('/') ? path : `/${path}`;
}

export function normalizePath(pathname: string): ShowcaseRoute {
  const normalized = stripBase(pathname).replace(/\/+$/u, '') || '/';
  if (normalized === '/simple' || normalized === '/complex' || normalized === '/performance') {
    return normalized;
  }
  return '/';
}
