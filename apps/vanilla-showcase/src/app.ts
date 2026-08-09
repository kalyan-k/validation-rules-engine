import { platformUrl } from './platform-urls';
import { clear, el } from './ui/render';
import * as homePage from './pages/home';
import * as simpleForm from './pages/simple-form';
import * as complexForm from './pages/complex-form';
import * as performanceForm from './pages/performance-form';
import { normalizePath, routeHref, type ShowcaseRoute } from './routes';

export type { ShowcaseRoute } from './routes';
export { routeHref } from './routes';

const NAV_ITEMS = [
  { path: '/', label: 'Home' },
  { path: '/simple', label: 'Simple Form' },
  { path: '/complex', label: 'Complex Form' },
  { path: '/performance', label: 'Performance Form' }
] as const;

function mountPage(path: ShowcaseRoute, host: HTMLElement, navigate: (next: string) => void): () => void {
  const ctx = { navigate };
  switch (path) {
    case '/simple':
      return simpleForm.mount(host, ctx);
    case '/complex':
      return complexForm.mount(host, ctx);
    case '/performance':
      return performanceForm.mount(host, ctx);
    default:
      return homePage.mount(host, ctx);
  }
}

export function createApp(root: HTMLElement): () => void {
  let path = normalizePath(window.location.pathname);
  let unmountPage = (): void => undefined;

  const main = el('main', { className: 'vr-showcase-main' });
  const nav = el('nav', { className: 'vr-showcase-nav', 'aria-label': 'Vanilla showcase pages' });

  const renderNav = (): void => {
    clear(nav);
    for (const item of NAV_ITEMS) {
      if (item.path === '/') {
        const active = path === '/';
        nav.append(el('a', {
          className: `vr-showcase-nav__link${active ? ' active' : ''}`,
          href: routeHref('/'),
          'aria-current': active ? 'page' : undefined,
          onClick: (event: Event) => {
            event.preventDefault();
            navigate('/');
          }
        }, ['Home']));
        nav.append(el('p', { className: 'vr-showcase-nav__section', textContent: 'Showcases' }));
        continue;
      }
      const active = path === item.path;
      nav.append(el('a', {
        className: `vr-showcase-nav__link${active ? ' active' : ''}`,
        href: routeHref(item.path),
        'aria-current': active ? 'page' : undefined,
        onClick: (event: Event) => {
          event.preventDefault();
          navigate(item.path);
        }
      }, [item.label]));
    }
  };

  const renderPage = (): void => {
    unmountPage();
    clear(main);
    unmountPage = mountPage(path, main, navigate);
    renderNav();
  };

  const navigate = (nextPath: string): void => {
    const normalized = normalizePath(nextPath);
    window.history.pushState({}, '', routeHref(normalized));
    path = normalized;
    window.scrollTo?.({ top: 0 });
    renderPage();
  };

  const shell = el('div', { className: 'vr-showcase-shell' }, [
    el('aside', { className: 'vr-showcase-sidebar' }, [
      el('header', { className: 'vr-showcase-sidebar__intro' }, [
        el('p', { className: 'vr-showcase-sidebar__eyebrow', textContent: 'Vanilla JS Showcase' }),
        el('h2', { textContent: 'Forms showcase' }),
        el('p', {
          textContent: 'Policy validation with imperative TypeScript bindings, nested groups, and measured large-form behavior.'
        })
      ]),
      nav,
      el('div', { className: 'vr-showcase-sidebar__footer' }, [
        el('a', { href: platformUrl('docs', '/docs/core-package') }, ['Read core documentation →']),
        el('span', { textContent: 'Policy-based validation for vanilla TypeScript forms' })
      ])
    ]),
    main
  ]);

  const platformShell = document.createElement('validation-platform-shell');
  platformShell.setAttribute('active-application', 'vanilla-showcase');
  platformShell.setAttribute('application-name', 'Vanilla JS Showcase');
  platformShell.setAttribute('version', '1.0.0');
  platformShell.setAttribute('portal-url', platformUrl('portal'));
  platformShell.setAttribute('docs-url', platformUrl('docs'));
  platformShell.setAttribute('angular-url', platformUrl('angular'));
  platformShell.setAttribute('react-url', platformUrl('react'));
  platformShell.setAttribute('vanilla-url', platformUrl('vanilla'));
  platformShell.append(shell);

  root.append(platformShell);
  renderPage();

  const onPopState = (): void => {
    path = normalizePath(window.location.pathname);
    renderPage();
  };
  window.addEventListener('popstate', onPopState);

  return () => {
    window.removeEventListener('popstate', onPopState);
    unmountPage();
    platformShell.remove();
  };
}
