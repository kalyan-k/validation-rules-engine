import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
});

afterEach(() => {
  document.body.innerHTML = '';
});
