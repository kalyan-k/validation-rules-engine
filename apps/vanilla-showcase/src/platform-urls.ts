type PlatformUrlKey = 'portal' | 'docs' | 'angular' | 'react' | 'vanilla';

interface VrePlatformConfig {
  urls?: Partial<Record<PlatformUrlKey, string>>;
  portalUrl?: string;
  docsUrl?: string;
  angularUrl?: string;
  reactUrl?: string;
  vanillaUrl?: string;
}

declare global {
  interface Window {
    vrePlatformConfig?: VrePlatformConfig;
  }
}

function developmentUrl(port: number): string {
  const url = new URL(window.location.origin);
  url.port = String(port);
  return url.origin;
}

const defaults: Record<PlatformUrlKey, string> = {
  portal: developmentUrl(4200),
  docs: developmentUrl(4201),
  angular: developmentUrl(4202),
  react: developmentUrl(4204),
  vanilla: developmentUrl(4205)
};

export function platformUrl(key: PlatformUrlKey, path = ''): string {
  const config = window.vrePlatformConfig ?? {};
  const configured = config.urls?.[key] ?? config[`${key}Url` as keyof VrePlatformConfig];
  const configuredValue = typeof configured === 'string' && configured.trim() ? configured : undefined;
  const base = String(configuredValue ?? defaults[key]).replace(/\/$/, '');
  return `${base}${path}` || '/';
}
