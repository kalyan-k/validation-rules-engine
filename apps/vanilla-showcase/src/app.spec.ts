import { describe, expect, it } from 'vitest';
import { createApp } from './app';

function renderApp(): { root: HTMLElement; cleanup: () => void } {
  const root = document.createElement('div');
  document.body.append(root);
  const cleanup = createApp(root);
  return {
    root,
    cleanup: () => {
      cleanup();
      root.remove();
    }
  };
}

function clickLink(name: string): void {
  const link = [...document.querySelectorAll('a')].find((node) => node.textContent?.trim() === name);
  expect(link).toBeTruthy();
  link!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

describe('Vanilla showcase application', () => {
  it('renders the shared layout, home content, and shell', () => {
    const { cleanup } = renderApp();
    expect(document.querySelector('nav[aria-label="Vanilla showcase pages"]')).toBeTruthy();
    expect(document.querySelector('h1')?.textContent).toBe('Policy validation without a UI framework.');
    expect(document.body.textContent).toContain('application -> @validation-rules-engine/core');
    expect(document.querySelector('validation-platform-shell')?.getAttribute('active-application')).toBe('vanilla-showcase');
    expect(document.querySelector('a[href*="/docs/core-package"]')?.textContent).toContain('core documentation');
    expect(document.body.textContent).toContain('Vanilla JS Showcase');
    expect(document.body.textContent).toContain('Forms showcase');
    cleanup();
  });

  it('navigates among Home, Simple, Complex, and Performance routes with active state', () => {
    const { cleanup } = renderApp();
    clickLink('Simple Form');
    expect(document.querySelector('h1')?.textContent).toBe('Simple contact form');
    expect(document.querySelector('a[aria-current="page"]')?.textContent).toBe('Simple Form');

    clickLink('Complex Form');
    expect(document.querySelector('h1')?.textContent).toBe('Complex enterprise profile');

    clickLink('Performance Form');
    expect(document.querySelector('h1')?.textContent).toBe('Large core-validated form');

    clickLink('Home');
    expect(document.querySelector('h1')?.textContent).toBe('Policy validation without a UI framework.');
    cleanup();
  });

  it('uses home example links as client-side navigation', () => {
    const { cleanup } = renderApp();
    clickLink('Open complex form ->');
    expect(document.querySelector('h1')?.textContent).toBe('Complex enterprise profile');
    cleanup();
  });
});
