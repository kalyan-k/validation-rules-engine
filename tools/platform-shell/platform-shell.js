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
      ['Testing, Coverage & Reports', '/docs/testing'],
      ['Migration', '/docs/migration'],
      ['Roadmap', '/docs/roadmap'],
      ['Troubleshooting', '/docs/troubleshooting'],
      ['FAQ', '/docs/faq']
    ]
  }
];

const showcaseItems = [
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
  return normalizedBase(configured, fallback);
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

function isDocsItemActive(item) {
  if (Array.isArray(item)) {
    return location.pathname === item[1];
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
  return location.pathname === pathname
    || (pathname.endsWith('/index.html') && location.pathname === pathname.replace(/index\.html$/u, ''))
    || (pathname.endsWith('/index.html') && location.pathname === pathname.replace(/\/index\.html$/u, ''));
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
    const version = this.getAttribute('version') || '0.0.0';
    const brandMarkUrl = this.getAttribute('brand-mark-url') || '/vre-mark.svg';
    const defaultPortalUrl = currentOriginWhen(activeApplication, ['portal', 'reports'], developmentOrigin(4200));
    const urls = {
      portal: configuredBase('portal', this.getAttribute('portal-url'), defaultPortalUrl),
      docs: configuredBase('docs', this.getAttribute('docs-url'), currentOriginWhen(activeApplication, ['documentation'], developmentOrigin(4201))),
      angular: configuredBase('angular', this.getAttribute('angular-url'), currentOriginWhen(activeApplication, ['angular-showcase'], developmentOrigin(4202))),
      react: configuredBase('react', this.getAttribute('react-url'), currentOriginWhen(activeApplication, ['react-showcase'], developmentOrigin(4204)))
    };
    const docsActive = activeApplication === 'documentation';
    const showcasesActive = activeApplication === 'angular-showcase' || activeApplication === 'react-showcase';
    const reportsActive = activeApplication === 'reports';
    const docsNavigation = documentationSections.map((section) => {
      const active = docsActive && isDocsSectionActive(section);
      return `<a href="${urls.docs}${firstDocsPath(section)}"${active ? ' aria-current="page" class="active"' : ''}>${section.label}</a>`;
    }).join('');
    const showcasesNavigation = showcaseItems.map(([label, target]) => {
      const applicationId = target === 'angular' ? 'angular-showcase' : 'react-showcase';
      const active = activeApplication === applicationId;
      return `<a href="${urls[target]}/"${active ? ' aria-current="page" class="active"' : ''}>${label}</a>`;
    }).join('');
    const reportsNavigation = [
      ['Tests & Coverage', '/reports/index.html'],
      ['Automation Testing', '/automation/']
    ].map(([label, pathname]) => {
      const active = reportsActive && isPathActive(pathname);
      return `<a href="${urls.portal}${pathname}"${active ? ' aria-current="page" class="active"' : ''}>${label}</a>`;
    }).join('');

    const root = this.attachShadow({ mode: 'open' });
    const injectedStyles = globalThis.validationPlatformShellStyles;
    root.innerHTML = `
      ${injectedStyles ? `<style>${injectedStyles}</style>` : '<link rel="stylesheet" href="/platform-shell.css">'}
      <header class="platform-header" part="header">
        <a class="platform-brand" href="${urls.portal || '/'}" aria-label="Validation Rules Engine home">
          <img class="platform-mark" src="${brandMarkUrl}" width="38" height="38" alt="">
          <span class="platform-brand-copy"><strong>Validation Rules Engine</strong><small>${applicationName}</small></span>
        </a>
        <span class="platform-version" data-version title="Workspace version">v${version}</span>
        <button class="platform-menu" type="button" aria-expanded="false" aria-controls="platform-navigation">Menu</button>
        <nav id="platform-navigation" class="platform-navigation" aria-label="Platform navigation">
          <a class="platform-nav-link ${activeApplication === 'portal' ? 'active' : ''}" href="${urls.portal}/"${activeApplication === 'portal' ? ' aria-current="page"' : ''}>Home</a>
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
          <a class="platform-nav-link" href="https://github.com/kalyan-k/validation-rules-engine">GitHub</a>
        </nav>
      </header>
      <div class="platform-content"><slot></slot></div>
      <footer class="platform-footer" part="footer">
        <div class="platform-footer-brand">
          <img class="platform-footer-mark" src="${brandMarkUrl}" width="30" height="30" alt="">
          <div><strong>Validation Rules Engine</strong><span>Reusable policy validation for Angular, React, and framework-neutral TypeScript.</span></div>
        </div>
        <div class="platform-footer-meta"><span data-version>v${version}</span><span>MIT License</span><a href="${urls.docs}/docs/overview">Docs</a><a href="${urls.portal}/reports/index.html">Reports</a><a href="https://github.com/kalyan-k/validation-rules-engine">GitHub</a></div>
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
  }

  attributeChangedCallback(name, _previous, current) {
    if (name === 'version' && this.shadowRoot) {
      this.shadowRoot.querySelectorAll('[data-version]').forEach((element) => {
        element.textContent = `v${current || '0.0.0'}`;
      });
    }
  }
}

if (!customElements.get('validation-platform-shell')) {
  customElements.define('validation-platform-shell', ValidationPlatformShell);
}
