import type { PropsWithChildren, ReactNode } from 'react';
import { platformUrl } from '../../platform-urls';
import type { StateShowcasePage, StrategyDefinition } from '../types';
import { useShowcaseState } from '../types';

const STATE_PAGE_LINKS: Array<{ page: StateShowcasePage; label: string; path: string }> = [
  { page: 'home', label: 'Overview', path: '' },
  { page: 'simple', label: 'Simple Form', path: '/simple' },
  { page: 'complex', label: 'Complex Form', path: '/complex' },
  { page: 'performance', label: 'Performance Form', path: '/performance' }
];

export function StatePageFrame({
  strategy,
  page,
  pageLabel,
  title,
  description,
  navigate,
  children,
  actions
}: PropsWithChildren<{
  strategy: StrategyDefinition;
  page: StateShowcasePage;
  pageLabel: string;
  title: string;
  description: string;
  navigate(path: string): void;
  actions?: ReactNode;
}>) {
  return (
    <div className="showcase-page state-showcase-page">
      <div className="vr-breadcrumb">
        <a href="/">React Showcase</a><span>/</span>
        <a href={`/state/${strategy.id}`}>{strategy.label}</a><span>/</span><span>{pageLabel}</span>
      </div>
      <header className="vr-page-heading state-page-heading">
        <div>
          <p className="vr-eyebrow">{strategy.label} integration</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <a className="docs-button" href={platformUrl('docs', `/docs/react-state-${strategy.id}`)}>Read Documentation</a>
      </header>
      <nav className="state-showcase-tabs" aria-label="State showcase pages">
        {STATE_PAGE_LINKS.map((link) => {
          const href = `/state/${strategy.id}${link.path}`;
          const active = page === link.page;
          return (
            <a
              key={link.page}
              className={active ? 'active' : ''}
              href={href}
              aria-current={active ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigate(href);
              }}
            >
              {link.label}
            </a>
          );
        })}
      </nav>
      <section className="state-showcase-runtime">
        <div className="state-showcase-runtime__body">
          <div>
            <strong>State mechanism in this route</strong>
            <p>{strategy.label} owns the form model while the shared Validation Rules hook evaluates the current state snapshot.</p>
          </div>
          <StateReadout />
        </div>
      </section>
      {actions}
      {children}
    </div>
  );
}

export function StateReadout() {
  const state = useShowcaseState();
  return (
    <section className="state-readout" aria-label="State store activity">
      <span>Store revision <strong>{state.revision}</strong></span>
      <span>Populated values <strong>{state.populatedValues}</strong></span>
    </section>
  );
}
