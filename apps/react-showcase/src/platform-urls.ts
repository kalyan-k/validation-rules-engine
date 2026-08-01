type PlatformUrlKey = 'portal' | 'docs' | 'angular' | 'react';

interface VrePlatformConfig {
  urls?: Partial<Record<PlatformUrlKey, string>>;
  portalUrl?: string;
  docsUrl?: string;
  angularUrl?: string;
  reactUrl?: string;
}

declare global {
  interface Window {
    vrePlatformConfig?: VrePlatformConfig;
  }
}

const defaults: Record<PlatformUrlKey, string> = {
  portal: 'http://127.0.0.1:4200',
  docs: 'http://127.0.0.1:4201',
  angular: 'http://127.0.0.1:4202',
  react: 'http://127.0.0.1:4204'
};

export function platformUrl(key: PlatformUrlKey, path = ''): string {
  const config = window.vrePlatformConfig ?? {};
  const configured = config.urls?.[key] ?? config[`${key}Url` as keyof VrePlatformConfig];
  const base = String(configured || defaults[key]).replace(/\/$/, '');
  return `${base}${path}`;
}
