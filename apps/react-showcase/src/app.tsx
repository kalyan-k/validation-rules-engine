import { useCallback, useEffect, useState } from 'react';
import { HomePage } from './pages/home-page';
import { platformUrl } from './platform-urls';
import { StateIntegrationRoute } from './state-integrations/state-integration-route';
import { findStrategy, strategies } from './state-integrations/strategies';
import type { StateShowcasePage } from './state-integrations/types';

const statePages = [
  { id: 'home', label: 'Overview' },
  { id: 'simple', label: 'Simple Form' },
  { id: 'complex', label: 'Complex Form' },
  { id: 'performance', label: 'Performance Form' }
] as const;

function normalizePath(pathname: string): string {
  const normalized = pathname.replace(/\/+$/u, '') || '/';
  if (normalized === '/') return normalized;
  const match = /^\/state\/([a-z-]+)(?:\/(simple|complex|performance))?$/u.exec(normalized);
  return match?.[1] && findStrategy(match[1]) ? normalized : '/';
}

export function App() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));
  useEffect(() => {
    const onPopState = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const navigate = useCallback((nextPath: string) => {
    window.history.pushState({}, '', nextPath);
    setPath(normalizePath(nextPath));
    window.scrollTo?.({ top: 0 });
  }, []);

  const stateMatch = /^\/state\/([a-z-]+)(?:\/(simple|complex|performance))?$/u.exec(path);
  const activeStrategy = stateMatch?.[1] ? findStrategy(stateMatch[1]) : undefined;
  const statePage = (stateMatch?.[2] ?? 'home') as StateShowcasePage;
  const page = activeStrategy
    ? <StateIntegrationRoute key={path} strategy={activeStrategy} page={statePage} navigate={navigate} />
    : <HomePage navigate={navigate} />;

  return (
    <validation-platform-shell
      active-application="react-showcase"
      application-name="React Showcase"
      version="0.0.0"
      portal-url={platformUrl('portal')}
      docs-url={platformUrl('docs')}
      angular-url={platformUrl('angular')}
      react-url={platformUrl('react')}
    >
      <div className="vr-showcase-shell">
        <aside className="vr-showcase-sidebar">
          <header className="vr-showcase-sidebar__intro">
            <p className="vr-showcase-sidebar__eyebrow">React adapter</p>
            <h2>Hooks-first validation</h2>
            <p>Controlled inputs, nested policies, accessible feedback, and measured large-form behavior.</p>
          </header>
          <nav className="vr-showcase-nav" aria-label="React showcase pages">
            <a
              className={`vr-showcase-nav__link${path === '/' ? ' active' : ''}`}
              href="/"
              aria-current={path === '/' ? 'page' : undefined}
              onClick={(event) => { event.preventDefault(); navigate('/'); }}
            >
              Home
            </a>
            <p className="vr-showcase-nav__section">Showcases</p>
            <div className="vr-showcase-nav__group">
              <p className="vr-showcase-nav__section">State management</p>
              <div className="vr-showcase-nav__children react-state-nav">
                {strategies.map((strategy) => {
                  const root = `/state/${strategy.id}`;
                  const active = activeStrategy?.id === strategy.id;
                  return (
                    <div key={strategy.id} className={`vr-showcase-nav__subgroup vr-showcase-nav__flyout${active ? ' active' : ''}`}>
                      <a
                        className={`vr-showcase-nav__link state-strategy-link${active && statePage === 'home' ? ' active' : ''}`}
                        href={root}
                        aria-current={path === root ? 'page' : undefined}
                        onClick={(event) => { event.preventDefault(); navigate(root); }}
                      >
                        {strategy.label}
                      </a>
                      <div className="vr-showcase-nav__children state-page-links vr-showcase-nav__flyout-menu">
                        {statePages.map((stateRoute) => {
                          const routePath = stateRoute.id === 'home' ? root : `${root}/${stateRoute.id}`;
                          return (
                            <a
                              key={routePath}
                              className={`vr-showcase-nav__link${path === routePath ? ' active' : ''}`}
                              href={routePath}
                              aria-label={`${strategy.label} ${stateRoute.label}`}
                              aria-current={path === routePath ? 'page' : undefined}
                              onClick={(event) => { event.preventDefault(); navigate(routePath); }}
                            >
                              {stateRoute.label}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </nav>
          <div className="vr-showcase-sidebar__footer">
            <a href={platformUrl('docs', '/docs/react-overview')}>React documentation &rarr;</a>
            <span>@validation-rules-engine/react - hooks-first policy validation</span>
          </div>
        </aside>
        <main className="vr-showcase-main">{page}</main>
      </div>
    </validation-platform-shell>
  );
}
