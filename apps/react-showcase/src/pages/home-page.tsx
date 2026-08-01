import { platformUrl } from '../platform-urls';

export interface HomePageProps { navigate(path: string): void; }

export function HomePage({ navigate }: HomePageProps) {
  const showcaseLink = (path: string, label: string) => (
    <a href={path} onClick={(event) => { event.preventDefault(); navigate(path); }}>{label}</a>
  );
  return (
    <div className="vr-showcase-home">
      <header className="vr-showcase-home__header">
        <p className="vr-eyebrow">First-class React support</p>
        <h1>Policy validation that fits React.</h1>
        <p className="lead">
          The adapter connects functional components and controlled inputs to the framework-neutral core through a provider,
          focused hooks, and style-neutral accessible components.
        </p>
      </header>
      <div className="vr-showcase-home__grid">
        <article className="vr-showcase-home__card">
          <h2>One dependency direction</h2>
          <p><code>React application -&gt; @validation-rules-engine/react -&gt; @validation-rules-engine/core</code></p>
          <p>Policies stay reusable and React owns lifecycle, rendering, touch state, and native-control binding.</p>
        </article>
        <article className="vr-showcase-home__card">
          <h2>Bring your own UI</h2>
          <p>Use native controls, a design system, local state, reducers, Redux, Zustand, or another state layer.</p>
          <div className="vr-showcase-home__links">
            <a href={platformUrl('docs', '/docs/react-custom-components')}>Custom controls</a>
            <a href={platformUrl('docs', '/docs/core-package')}>Core package</a>
          </div>
        </article>
      </div>
      <article className="vr-showcase-home__card">
        <h2>Choose the Local State baseline</h2>
        <div className="vr-showcase-home__patterns">
          <div><h3>Simple Form</h3><p>Blur, change, submit, inline messages, summary, and reset.</p>{showcaseLink('/state/local-state/simple', 'Open simple form ->')}</div>
          <div><h3>Complex Form</h3><p>Nested paths, arrays, conditional rules, policies, groups, and dynamic sections.</p>{showcaseLink('/state/local-state/complex', 'Open complex form ->')}</div>
          <div><h3>Performance Form</h3><p>Generated fields and live timing/render metrics from the current browser.</p>{showcaseLink('/state/local-state/performance', 'Open performance form ->')}</div>
        </div>
      </article>
      <article className="vr-showcase-home__card">
        <h2>How the integration works</h2>
        <ol className="vr-showcase-home__steps">
          <li><strong>Provide</strong><span>Own or inject an engine.</span></li>
          <li><strong>Register</strong><span>Compose core policies.</span></li>
          <li><strong>Bind</strong><span>Use field props or custom controls.</span></li>
          <li><strong>Validate</strong><span>Change, blur, submit, or call directly.</span></li>
        </ol>
        <div className="vr-showcase-home__links">
          <a href={platformUrl('docs', '/docs/react-quick-start')}>React quick start</a>
          <a href={platformUrl('docs', '/docs/react-api')}>API reference</a>
        </div>
      </article>
    </div>
  );
}
