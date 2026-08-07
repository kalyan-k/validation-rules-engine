import { routeHref } from '../routes';
import { platformUrl } from '../platform-urls';
import { el } from '../ui/render';

export interface PageContext {
  navigate(path: string): void;
}

export function mount(container: HTMLElement, ctx: PageContext): () => void {
  const open = (path: '/' | '/simple' | '/complex' | '/performance') => (event: Event) => {
    event.preventDefault();
    ctx.navigate(path);
  };

  const root = el('div', { className: 'vr-showcase-home' }, [
    el('header', { className: 'vr-showcase-home__header' }, [
      el('p', { className: 'vr-eyebrow', textContent: 'Framework-free core' }),
      el('h1', { textContent: 'Policy validation without a UI framework.' }),
      el('p', {
        className: 'lead',
        textContent: 'This showcase drives the same policy contracts through imperative DOM bindings and the local ValidationEngine, with @validation-rules-engine/core as the only package dependency.'
      })
    ]),
    el('div', { className: 'vr-showcase-home__grid' }, [
      el('article', { className: 'vr-showcase-home__card' }, [
        el('h2', { textContent: 'One dependency direction' }),
        el('p', {}, [
          el('code', { textContent: 'application -> @validation-rules-engine/core' })
        ]),
        el('p', {
          textContent: 'No React or Angular adapter is involved. Policies, validators, and group status come straight from the core package.'
        })
      ]),
      el('article', { className: 'vr-showcase-home__card' }, [
        el('h2', { textContent: 'Imperative bindings' }),
        el('p', {
          textContent: 'Own your model as a mutable object, subscribe to engine revisions, and update field messages in place without a virtual DOM.'
        }),
        el('div', { className: 'vr-showcase-home__links' }, [
          el('a', { href: platformUrl('docs', '/docs/core-package') }, ['Core package']),
          el('a', { href: platformUrl('docs', '/docs/core-quick-start') }, ['Core quick start'])
        ])
      ])
    ]),
    el('article', { className: 'vr-showcase-home__card' }, [
      el('h2', { textContent: 'Explore the same workflows' }),
      el('div', { className: 'vr-showcase-home__patterns' }, [
        el('div', {}, [
          el('h3', { textContent: 'Simple Form' }),
          el('p', { textContent: 'Blur, change, submit, inline messages, summary, and reset.' }),
          el('a', { href: routeHref('/simple'), onClick: open('/simple') }, ['Open simple form ->'])
        ]),
        el('div', {}, [
          el('h3', { textContent: 'Complex Form' }),
          el('p', { textContent: 'Nested paths, arrays, conditional rules, policies, groups, and dynamic sections.' }),
          el('a', { href: routeHref('/complex'), onClick: open('/complex') }, ['Open complex form ->'])
        ]),
        el('div', {}, [
          el('h3', { textContent: 'Performance Form' }),
          el('p', { textContent: 'Generated fields and live timing/render metrics from the current browser.' }),
          el('a', { href: routeHref('/performance'), onClick: open('/performance') }, ['Open performance form ->'])
        ])
      ])
    ]),
    el('article', { className: 'vr-showcase-home__card' }, [
      el('h2', { textContent: 'How the vanilla integration works' }),
      el('ol', { className: 'vr-showcase-home__steps' }, [
        el('li', {}, [el('strong', { textContent: 'Register' }), el('span', { textContent: 'Compose core policies on the engine.' })]),
        el('li', {}, [el('strong', { textContent: 'Bind' }), el('span', { textContent: 'Wire native controls to nested model paths.' })]),
        el('li', {}, [el('strong', { textContent: 'Validate' }), el('span', { textContent: 'Change, blur, submit, or call groups directly.' })]),
        el('li', {}, [el('strong', { textContent: 'Refresh' }), el('span', { textContent: 'Subscribe and update messages in place.' })])
      ])
    ])
  ]);

  container.append(root);
  return () => root.remove();
}
