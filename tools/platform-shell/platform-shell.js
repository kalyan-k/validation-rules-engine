const documentationSections = [
  {
    label: 'Introduction',
    items: [
      ['What is Validation Rules Engine (VRE)?', '/docs/overview'],
      ['Installation & Quick Start', '/docs/getting-started']
    ]
  },
  {
    label: 'Core Package',
    items: [
      ['Overview', '/docs/core-package'],
      ['Installation', '/docs/core-installation'],
      ['Quick Start', '/docs/core-quick-start'],
      ['Architecture', '/docs/core-architecture'],
      ['Validation Policies', '/docs/core-validation-policies'],
      ['Validation Rules', '/docs/core-validation-rules'],
      ['Validation Groups', '/docs/core-validation-groups'],
      ['Public API', '/docs/core-public-api'],
      ['Examples', '/docs/core-examples'],
      ['Best Practices', '/docs/core-best-practices'],
      ['Troubleshooting', '/docs/core-troubleshooting'],
      ['FAQ', '/docs/core-faq']
    ]
  },
  {
    label: 'Angular Package',
    items: [
      ['Overview', '/docs/angular'],
      ['Installation', '/docs/angular-installation'],
      ['Quick Start', '/docs/angular-quick-start'],
      ['Architecture', '/docs/angular-architecture'],
      ['Services', '/docs/angular-services'],
      ['Components', '/docs/angular-components'],
      ['Directives', '/docs/angular-directives'],
      ['Validation Policies', '/docs/angular-validation-policies'],
      ['Validation Groups', '/docs/angular-validation-groups'],
      {
        label: 'State Management',
        items: [
          ['Template Driven Forms', '/docs/angular-ngmodel'],
          ['Reactive Forms', '/docs/angular-reactive-forms'],
          ['NgRx', '/docs/angular-state-ngrx'],
          ['NGXS', '/docs/angular-state-ngxs'],
          ['Akita', '/docs/angular-state-akita'],
          ['Elf', '/docs/angular-state-elf'],
          ['RxAngular State', '/docs/angular-state-rx-angular'],
          ['Signals', '/docs/angular-state-signals'],
          ['Custom RxJS Store', '/docs/angular-state-custom-rxjs-store']
        ]
      },
      ['Examples', '/docs/angular-examples'],
      ['Best Practices', '/docs/angular-best-practices'],
      ['Troubleshooting', '/docs/angular-troubleshooting'],
      ['FAQ', '/docs/angular-faq']
    ]
  },
  {
    label: 'Angular Showcase',
    items: [
      ['Overview', '/docs/angular-showcase-overview'],
      ['Examples', '/docs/angular-showcase-examples']
    ]
  },
  {
    label: 'React Package',
    items: [
      ['Overview', '/docs/react-overview'],
      ['Installation', '/docs/react-installation'],
      ['Quick Start', '/docs/react-quick-start'],
      ['Architecture', '/docs/react-architecture'],
      ['Provider', '/docs/react-provider'],
      ['Core Hooks', '/docs/react-hooks'],
      ['Field Validation', '/docs/react-field-validation'],
      ['Form Validation', '/docs/react-form-validation'],
      ['Validation Policies', '/docs/react-policies'],
      ['Validation Groups', '/docs/react-groups'],
      {
        label: 'State Management',
        items: [
          ['Local State', '/docs/react-state-local-state'],
          ['Redux Toolkit', '/docs/react-state-redux-toolkit'],
          ['Zustand', '/docs/react-state-zustand'],
          ['Jotai', '/docs/react-state-jotai'],
          ['Recoil', '/docs/react-state-recoil'],
          ['MobX', '/docs/react-state-mobx'],
          ['Context API', '/docs/react-state-context']
        ]
      },
      ['Controlled Inputs', '/docs/react-controlled-inputs'],
      ['Custom Inputs', '/docs/react-custom-components'],
      ['Dynamic Fields', '/docs/react-dynamic-fields'],
      ['Multiple Forms', '/docs/react-multiple-forms'],
      ['Performance', '/docs/react-performance'],
      ['Strict Mode', '/docs/react-strict-mode'],
      ['Testing', '/docs/react-testing'],
      ['Public API', '/docs/react-api'],
      ['Migration and Compatibility', '/docs/react-migration'],
      ['Examples', '/docs/react-examples'],
      ['Best Practices', '/docs/react-best-practices'],
      ['Troubleshooting', '/docs/react-troubleshooting'],
      ['FAQ', '/docs/react-faq']
    ]
  },
  {
    label: 'React Showcase',
    items: [
      ['Overview', '/docs/react-showcase-overview'],
      ['Examples', '/docs/react-showcase-examples']
    ]
  },
  {
    label: 'Vanilla JS Showcase',
    items: [
      ['Overview', '/docs/vanilla-overview'],
      ['Quick Start', '/docs/vanilla-quick-start'],
      ['Examples', '/docs/vanilla-examples']
    ]
  },
  {
    label: 'Guides',
    items: [
      ['Policies & Rules', '/docs/policies-and-rules'],
      ['Validation Groups', '/docs/validation-groups'],
      ['Advanced Examples', '/docs/advanced']
    ]
  },
  {
    label: 'Reference',
    items: [
      ['Public API Reference', '/docs/public-api']
    ]
  },
  {
    label: 'Project',
    items: [
      ['Architecture', '/docs/architecture'],
      ['Single-Host Deployment', '/docs/single-host-deployment'],
      ['Release & Versioning', '/docs/release-versioning'],
      ['Testing, Coverage & Reports', '/docs/testing'],
      ['Playwright E2E Testing', '/docs/playwright'],
      ['Migration', '/docs/migration'],
      ['Roadmap', '/docs/roadmap'],
      ['Troubleshooting', '/docs/troubleshooting'],
      ['FAQ', '/docs/faq']
    ]
  }
];

const showcaseItems = [
  ['Vanilla JS Showcase', 'vanilla'],
  ['Angular Showcase', 'angular'],
  ['React Showcase', 'react']
];

function normalizedBase(value, fallback) {
  return String(value ?? fallback).replace(/\/$/, '');
}

function configuredUrls() {
  const config = globalThis.vrePlatformConfig || {};
  return config.urls || config;
}

function configuredBase(key, attributeValue, fallback) {
  const urls = configuredUrls();
  const configured = [attributeValue, urls[key], urls[`${key}Url`]]
    .find((value) => typeof value === 'string' && value.trim());
  const base = normalizedBase(configured, fallback);
  // Root-relative attribute/config values (e.g. docs angular-url="/showcases/angular")
  // must include the GitHub Pages project base path when present.
  if (typeof base === 'string' && base.startsWith('/') && !base.startsWith('//')) {
    return withSiteBasePath(base);
  }
  return base;
}

function currentOriginWhen(activeApplication, applications, fallback) {
  return applications.includes(activeApplication) && /^https?:$/u.test(location.protocol)
    ? location.origin
    : fallback;
}

function developmentOrigin(port) {
  if (!/^https?:$/u.test(location.protocol)) {
    return '';
  }
  const url = new URL(location.origin);
  url.port = String(port);
  return url.origin;
}

function flattenDocsItems(items) {
  return items.flatMap((item) => (Array.isArray(item) ? [item] : flattenDocsItems(item.items)));
}

function siteBasePrefix() {
  return String(globalThis.vrePlatformConfig?.siteBase || '').replace(/\/$/, '');
}

function withSiteBasePath(pathname) {
  const base = siteBasePrefix();
  if (!base || typeof pathname !== 'string' || !pathname.startsWith('/')) {
    return pathname;
  }
  if (pathname === base || pathname.startsWith(`${base}/`)) {
    return pathname;
  }
  return `${base}${pathname}`;
}

function isDocsItemActive(item) {
  if (Array.isArray(item)) {
    return location.pathname === withSiteBasePath(item[1]);
  }
  return item.items.some((child) => isDocsItemActive(child));
}

function firstDocsPath(section) {
  return flattenDocsItems(section.items)[0]?.[1] || '/docs/overview';
}

function isDocsSectionActive(section) {
  return section.items.some((item) => isDocsItemActive(item));
}

function isPathActive(pathname) {
  const resolved = withSiteBasePath(pathname);
  return location.pathname === resolved
    || (resolved.endsWith('/index.html') && location.pathname === resolved.replace(/index\.html$/u, ''))
    || (resolved.endsWith('/index.html') && location.pathname === resolved.replace(/\/index\.html$/u, ''));
}

function joinPortalPath(portalBase, pathname) {
  const relative = String(pathname || '').replace(/^\//u, '');
  if (!portalBase) {
    return withSiteBasePath(`/${relative}`);
  }
  if (/^https?:\/\//u.test(portalBase)) {
    return new URL(relative, `${portalBase.replace(/\/$/u, '')}/`).href;
  }
  return `${portalBase.replace(/\/$/u, '')}/${relative}`;
}

function docsHref(docsBase, pathname) {
  const relative = String(pathname || '').replace(/^\//u, '');
  if (!docsBase) {
    return withSiteBasePath(`/${relative}`);
  }
  if (/^https?:\/\//u.test(docsBase)) {
    return new URL(relative, `${docsBase.replace(/\/$/u, '')}/`).href;
  }
  return `${docsBase.replace(/\/$/u, '')}/${relative}`;
}

function docsSearchEnabled(activeApplication, host) {
  if (host.getAttribute('docs-search') === 'false') {
    return false;
  }
  const config = globalThis.vrePlatformConfig || {};
  if (config.features?.docsSearch === false) {
    return false;
  }
  if (activeApplication === 'documentation') {
    return true;
  }
  // Only show when platform-config explicitly provides docs (single/multi/Azure/Pages).
  // Standalone showcase launches without platform-config keep search hidden.
  return Boolean(config.urls && Object.prototype.hasOwnProperty.call(config.urls, 'docs'));
}

function bindDocsSearch(root, docsBase) {
  const searchRoot = root.querySelector('[data-platform-docs-search]');
  const input = root.querySelector('[data-platform-docs-search-input]');
  const resultsPanel = root.querySelector('[data-platform-docs-search-results]');
  const clearButton = root.querySelector('[data-platform-docs-search-clear]');
  if (!searchRoot || !input || !resultsPanel || !clearButton) {
    return;
  }

  let documentsPromise;
  let activeIndex = -1;
  const indexUrl = docsHref(docsBase, '/docs/search-index.json');

  const loadDocuments = () => {
    documentsPromise ??= fetch(indexUrl, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Search index returned ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => payload.documents ?? [])
      .catch(() => {
        searchRoot.hidden = true;
        return [];
      });
    return documentsPromise;
  };

  const termsFor = (value) => value.toLocaleLowerCase().trim().split(/\s+/u).filter(Boolean);
  const score = (document, terms) => {
    if (!terms.every((term) => document.searchableText.includes(term))) return 0;
    const title = document.title.toLocaleLowerCase();
    const heading = document.heading.toLocaleLowerCase();
    return terms.reduce((total, term) => total
      + (title === term ? 30 : title.includes(term) ? 14 : 0)
      + (heading === term ? 24 : heading.includes(term) ? 12 : 0)
      + document.searchableText.split(term).length - 1, 0);
  };

  const closeResults = () => {
    resultsPanel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  };

  const syncClearButton = () => {
    clearButton.hidden = input.value.length === 0;
  };

  const setActive = (index) => {
    const options = [...resultsPanel.querySelectorAll('[role="option"]')];
    if (options.length === 0) return;
    activeIndex = (index + options.length) % options.length;
    options.forEach((option, optionIndex) => option.classList.toggle('active', optionIndex === activeIndex));
    const active = options[activeIndex];
    input.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  };

  const renderResults = (matches, query) => {
    resultsPanel.replaceChildren();
    if (matches.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'platform-search-empty';
      empty.textContent = query ? `No documentation matches “${query}”.` : 'Type to search documentation.';
      resultsPanel.append(empty);
      resultsPanel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }
    matches.forEach((match, index) => {
      const option = document.createElement('a');
      option.id = `platform-docs-search-option-${index}`;
      option.setAttribute('role', 'option');
      option.href = docsHref(docsBase, `/docs/${match.slug}`);
      option.innerHTML = `<small>${match.section}</small><strong></strong><span></span>`;
      option.querySelector('strong').textContent = match.title;
      option.querySelector('span').textContent = match.heading === match.title ? match.summary : match.heading;
      resultsPanel.append(option);
    });
    resultsPanel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    activeIndex = -1;
  };

  input.addEventListener('input', async () => {
    syncClearButton();
    const query = input.value.trim();
    if (!query) {
      closeResults();
      return;
    }
    const documents = await loadDocuments();
    const terms = termsFor(query);
    const matches = documents
      .map((document) => ({ document, score: score(document, terms) }))
      .filter(({ score: value }) => value > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8)
      .map(({ document }) => document);
    renderResults(matches, query);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      resultsPanel.querySelectorAll('[role="option"]')[activeIndex]?.click();
    } else if (event.key === 'Escape') {
      closeResults();
    }
  });

  clearButton.addEventListener('click', () => {
    input.value = '';
    syncClearButton();
    closeResults();
    input.focus();
  });

  document.addEventListener('click', (event) => {
    if (!event.composedPath().includes(searchRoot)) {
      closeResults();
    }
  });

  if (typeof fetch === 'function') {
    void loadDocuments();
  }
}

class ValidationPlatformShell extends HTMLElement {
  static get observedAttributes() {
    return ['version'];
  }

  connectedCallback() {
    if (this.shadowRoot) {
      return;
    }

    const activeApplication = this.getAttribute('active-application') || '';
    const applicationName = this.getAttribute('application-name') || 'Platform';
    const version = this.getAttribute('version') || '1.0.0';
    const brandMarkUrl = this.getAttribute('brand-mark-url') || withSiteBasePath('/vre-mark.svg');
    const defaultPortalUrl = currentOriginWhen(activeApplication, ['portal', 'reports'], developmentOrigin(4200));
    const urls = {
      portal: configuredBase('portal', this.getAttribute('portal-url'), defaultPortalUrl),
      docs: configuredBase('docs', this.getAttribute('docs-url'), currentOriginWhen(activeApplication, ['documentation'], developmentOrigin(4201))),
      angular: configuredBase('angular', this.getAttribute('angular-url'), currentOriginWhen(activeApplication, ['angular-showcase'], developmentOrigin(4202))),
      react: configuredBase('react', this.getAttribute('react-url'), currentOriginWhen(activeApplication, ['react-showcase'], developmentOrigin(4204))),
      vanilla: configuredBase('vanilla', this.getAttribute('vanilla-url'), currentOriginWhen(activeApplication, ['vanilla-showcase'], developmentOrigin(4205)))
    };
    const contactHref = joinPortalPath(urls.portal, '/contact/');
    const searchEnabled = docsSearchEnabled(activeApplication, this);
    const docsActive = activeApplication === 'documentation';
    const showcasesActive = activeApplication === 'angular-showcase'
      || activeApplication === 'react-showcase'
      || activeApplication === 'vanilla-showcase';
    const reportsActive = activeApplication === 'reports';
    const contactActive = activeApplication === 'contact';
    const docsNavigation = documentationSections.map((section) => {
      const active = docsActive && isDocsSectionActive(section);
      return `<a href="${docsHref(urls.docs, firstDocsPath(section))}"${active ? ' aria-current="page" class="active"' : ''}>${section.label}</a>`;
    }).join('');
    const showcasesNavigation = showcaseItems.map(([label, target]) => {
      const applicationId = `${target}-showcase`;
      const active = activeApplication === applicationId;
      return `<a href="${urls[target]}/"${active ? ' aria-current="page" class="active"' : ''}>${label}</a>`;
    }).join('');
    const reportsNavigation = [
      ['Tests & Coverage', '/reports/index.html'],
      ['Automation Testing', '/automation/']
    ].map(([label, pathname]) => {
      const active = reportsActive && isPathActive(pathname);
      return `<a href="${joinPortalPath(urls.portal, pathname)}"${active ? ' aria-current="page" class="active"' : ''}>${label}</a>`;
    }).join('');
    const searchMarkup = searchEnabled ? `
          <div class="platform-docs-search" data-platform-docs-search>
            <label class="platform-docs-search-label" for="platform-docs-search-input">Search documentation</label>
            <div class="platform-docs-search-control">
              <input id="platform-docs-search-input" data-platform-docs-search-input type="search" role="combobox" placeholder="Search docs..." autocomplete="off" aria-autocomplete="list" aria-controls="platform-docs-search-results" aria-expanded="false">
              <button data-platform-docs-search-clear class="platform-docs-search-clear" type="button" aria-label="Clear documentation search" hidden>&times;</button>
            </div>
            <div id="platform-docs-search-results" data-platform-docs-search-results class="platform-docs-search-results" role="listbox" hidden></div>
          </div>` : '';

    const root = this.attachShadow({ mode: 'open' });
    const injectedStyles = globalThis.validationPlatformShellStyles;
    root.innerHTML = `
      ${injectedStyles ? `<style>${injectedStyles}</style>` : `<link rel="stylesheet" href="${withSiteBasePath('/platform-shell.css')}">`}
      <header class="platform-header" part="header">
        <a class="platform-brand" href="${urls.portal || withSiteBasePath('/')}" aria-label="Validation Rules Engine home">
          <img class="platform-mark" src="${brandMarkUrl}" width="38" height="38" alt="">
          <span class="platform-brand-copy"><strong>Validation Rules Engine</strong><small>${applicationName}</small></span>
        </a>
        <span class="platform-version" data-version title="Workspace version">v${version}</span>
        ${searchMarkup}
        <button class="platform-menu" type="button" aria-expanded="false" aria-controls="platform-navigation">Menu</button>
        <nav id="platform-navigation" class="platform-navigation" aria-label="Platform navigation">
          <a class="platform-nav-link ${activeApplication === 'portal' ? 'active' : ''}" href="${joinPortalPath(urls.portal, '/')}"${activeApplication === 'portal' ? ' aria-current="page"' : ''}>Home</a>
          <details class="platform-nav-group ${docsActive ? 'active' : ''}">
            <summary>Docs<span aria-hidden="true"></span></summary>
            <div class="platform-dropdown platform-docs-dropdown">${docsNavigation}</div>
          </details>
          <details class="platform-nav-group ${showcasesActive ? 'active' : ''}">
            <summary>Showcases<span aria-hidden="true"></span></summary>
            <div class="platform-dropdown">${showcasesNavigation}</div>
          </details>
          <details class="platform-nav-group ${reportsActive ? 'active' : ''}">
            <summary>Reports<span aria-hidden="true"></span></summary>
            <div class="platform-dropdown">${reportsNavigation}</div>
          </details>
          <a class="platform-nav-link ${contactActive ? 'active' : ''}" href="${contactHref}"${contactActive ? ' aria-current="page"' : ''}>Contact</a>
          <a class="platform-nav-link" href="https://github.com/kalyan-k/validation-rules-engine">GitHub</a>
        </nav>
      </header>
      <div class="platform-content"><slot></slot></div>
      <footer class="platform-footer" part="footer">
        <div class="platform-footer-brand">
          <img class="platform-footer-mark" src="${brandMarkUrl}" width="30" height="30" alt="">
          <div>
            <strong>Validation Rules Engine</strong>
            <span>Reusable policy validation for Angular, React, Vanilla JS, and framework-neutral TypeScript.</span>
          </div>
        </div>
        <div class="platform-footer-columns">
          <section>
            <h2>Product</h2>
            <a href="${joinPortalPath(urls.portal, '/')}">Portal</a>
            <a href="${docsHref(urls.docs, '/docs/overview')}">Documentation</a>
            <a href="${contactHref}">Contact</a>
          </section>
          <section>
            <h2>Showcases</h2>
            <a href="${urls.vanilla}/">Vanilla JS</a>
            <a href="${urls.angular}/">Angular</a>
            <a href="${urls.react}/">React</a>
          </section>
          <section>
            <h2>Project</h2>
            <a href="${joinPortalPath(urls.portal, '/reports/index.html')}">Tests &amp; Coverage</a>
            <a href="${joinPortalPath(urls.portal, '/automation/')}">Automation Testing</a>
            <a href="${docsHref(urls.docs, '/docs/architecture')}">Architecture</a>
            <a href="https://github.com/kalyan-k/validation-rules-engine">GitHub</a>
          </section>
          <section>
            <h2>Legal</h2>
            <span data-version>v${version}</span>
            <span>MIT License</span>
            <a href="https://github.com/kalyan-k/validation-rules-engine/blob/master/LICENSE">License</a>
          </section>
        </div>
      </footer>`;

    const button = root.querySelector('.platform-menu');
    const nav = root.querySelector('.platform-navigation');
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('open', !expanded);
    });

    const groups = [...root.querySelectorAll('.platform-nav-group')];
    groups.forEach((group) => group.addEventListener('toggle', () => {
      if (group.open) {
        groups.filter((candidate) => candidate !== group).forEach((candidate) => { candidate.open = false; });
      }
    }));
    root.querySelectorAll('.platform-dropdown a').forEach((link) => link.addEventListener('click', () => {
      groups.forEach((group) => { group.open = false; });
      button.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    }));
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const openGroup = groups.find((group) => group.open);
        groups.forEach((group) => { group.open = false; });
        if (nav.classList.contains('open')) {
          nav.classList.remove('open');
          button.setAttribute('aria-expanded', 'false');
          button.focus();
        } else {
          openGroup?.querySelector('summary')?.focus();
        }
      }
    });
    document.addEventListener('click', (event) => {
      const path = event.composedPath();
      if (!groups.some((group) => path.includes(group))) {
        groups.forEach((group) => { group.open = false; });
      }
    });

    if (searchEnabled) {
      bindDocsSearch(root, urls.docs);
    }
  }

  attributeChangedCallback(name, _previous, current) {
    if (name === 'version' && this.shadowRoot) {
      this.shadowRoot.querySelectorAll('[data-version]').forEach((element) => {
        element.textContent = `v${current || '1.0.0'}`;
      });
    }
  }
}

if (!customElements.get('validation-platform-shell')) {
  customElements.define('validation-platform-shell', ValidationPlatformShell);
}
