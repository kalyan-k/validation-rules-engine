import type { ReactNode } from 'react';
import { createPerformanceScenario } from '../performance/performance-generator';
import { COMPLEX_INITIAL_MODEL, SIMPLE_INITIAL_MODEL } from './models';
import { StateComplexPage } from './pages/state-complex-page';
import { StateHomePage } from './pages/state-home-page';
import { StatePerformancePage } from './pages/state-performance-page';
import { StateSimplePage } from './pages/state-simple-page';
import type { StateShowcasePage, StrategyDefinition } from './types';

export function StateIntegrationRoute({
  strategy,
  page,
  navigate
}: {
  strategy: StrategyDefinition;
  page: StateShowcasePage;
  navigate(path: string): void;
}) {
  const initialModel = page === 'simple'
    ? SIMPLE_INITIAL_MODEL
    : page === 'complex'
      ? COMPLEX_INITIAL_MODEL
      : page === 'performance'
        ? createPerformanceScenario().model
        : { walkthrough: '' };
  let content: ReactNode;
  switch (page) {
    case 'simple':
      content = <StateSimplePage strategy={strategy} navigate={navigate} />;
      break;
    case 'complex':
      content = <StateComplexPage strategy={strategy} navigate={navigate} />;
      break;
    case 'performance':
      content = <StatePerformancePage strategy={strategy} navigate={navigate} />;
      break;
    default:
      content = <StateHomePage strategy={strategy} navigate={navigate} />;
  }
  return (
    <strategy.Provider initialModel={initialModel}>
      {content}
    </strategy.Provider>
  );
}
