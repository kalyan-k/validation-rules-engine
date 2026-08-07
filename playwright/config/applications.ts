export interface ApplicationBaseUrls {
  portal: string;
  docs: string;
  angular: string;
  react: string;
  vanilla: string;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '');
}

export const defaultBaseUrls: ApplicationBaseUrls = {
  portal: 'http://127.0.0.1:4300',
  docs: 'http://127.0.0.1:4301',
  angular: 'http://127.0.0.1:4302',
  react: 'http://127.0.0.1:4304',
  vanilla: 'http://127.0.0.1:4305'
};

export function applicationBaseUrls(env: NodeJS.ProcessEnv = process.env): ApplicationBaseUrls {
  return {
    portal: normalizeBaseUrl(env['PLAYWRIGHT_PORTAL_BASE_URL'] ?? defaultBaseUrls.portal),
    docs: normalizeBaseUrl(env['PLAYWRIGHT_DOCS_BASE_URL'] ?? defaultBaseUrls.docs),
    angular: normalizeBaseUrl(env['PLAYWRIGHT_ANGULAR_BASE_URL'] ?? defaultBaseUrls.angular),
    react: normalizeBaseUrl(env['PLAYWRIGHT_REACT_BASE_URL'] ?? defaultBaseUrls.react),
    vanilla: normalizeBaseUrl(env['PLAYWRIGHT_VANILLA_BASE_URL'] ?? defaultBaseUrls.vanilla)
  };
}

export function portFromUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.port) {
    return parsed.port;
  }
  return parsed.protocol === 'https:' ? '443' : '80';
}
