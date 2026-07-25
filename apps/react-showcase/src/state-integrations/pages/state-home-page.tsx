import type { StrategyDefinition } from '../types';
import { useShowcaseState } from '../types';
import { StatePageFrame } from './page-frame';

export function StateHomePage({ strategy, navigate }: { strategy: StrategyDefinition; navigate(path: string): void }) {
  const state = useShowcaseState();
  const open = (path: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(path);
  };
  return (
    <StatePageFrame
      strategy={strategy}
      page="home"
      pageLabel="Overview"
      title={`${strategy.label} + Validation Rules`}
      description={strategy.shortDescription}
      navigate={navigate}
    >
      <div className="state-home-grid">
        <article className="vr-showcase-home__card">
          <p className="vr-eyebrow">Architecture</p>
          <h2>A thin state bridge</h2>
          <p>{strategy.architecture}</p>
          <p>The validation policy stays framework-neutral; only model ownership and updates belong to {strategy.label}.</p>
        </article>
        <article className="vr-showcase-home__card">
          <p className="vr-eyebrow">Library primitives</p>
          <h2>What this module shows</h2>
          <div className="primitive-list">{strategy.primitives.map((primitive) => <code key={primitive}>{primitive}</code>)}</div>
          <button type="button" onClick={() => state.setModel({ ...state.model, walkthrough: `Update ${state.revision + 1}` })}>Dispatch sample update</button>
        </article>
      </div>
      <article className="vr-showcase-home__card state-example-card">
        <h2>Compare identical validation workflows</h2>
        <div className="vr-showcase-home__patterns">
          {(['simple', 'complex', 'performance'] as const).map((page) => (
            <div key={page}>
              <h3>{page[0]?.toUpperCase()}{page.slice(1)} Form</h3>
              <p>{page === 'simple' ? 'Field and submit validation.' : page === 'complex' ? 'Nested data, dynamic rows, and groups.' : 'Eighty fields with live measurements.'}</p>
              <a href={`/state/${strategy.id}/${page}`} onClick={open(`/state/${strategy.id}/${page}`)}>Open {page} form -&gt;</a>
            </div>
          ))}
        </div>
      </article>
    </StatePageFrame>
  );
}
