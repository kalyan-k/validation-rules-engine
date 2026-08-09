import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const coreRoot = path.join(workspaceRoot, 'packages', 'core');
const angularRoot = path.join(workspaceRoot, 'packages', 'angular');
const reactRoot = path.join(workspaceRoot, 'packages', 'react');
const angularShowcaseRoot = path.join(workspaceRoot, 'apps', 'angular-showcase');
const reactShowcaseRoot = path.join(workspaceRoot, 'apps', 'react-showcase');
const vanillaShowcaseRoot = path.join(workspaceRoot, 'apps', 'vanilla-showcase');
const portalRoot = path.join(workspaceRoot, 'apps', 'portal');
const docsRoot = path.join(workspaceRoot, 'apps', 'docs');
const platformShellRoot = path.join(workspaceRoot, 'tools', 'platform-shell');
const failures = [];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walkFiles(directory, predicate) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath, predicate));
    } else if (entry.isFile() && predicate(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function sourceFiles(root) {
  return walkFiles(path.join(root, 'src'), (file) => file.endsWith('.ts') || file.endsWith('.tsx'));
}

function findSourceMatches(root, pattern) {
  return sourceFiles(root).filter((file) => pattern.test(fs.readFileSync(file, 'utf8')));
}

function relative(file) {
  return path.relative(workspaceRoot, file).replaceAll('\\', '/');
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

for (const root of [coreRoot, angularRoot, reactRoot, angularShowcaseRoot, reactShowcaseRoot, vanillaShowcaseRoot, portalRoot, docsRoot]) {
  expect(fs.existsSync(root), `Missing workspace project: ${relative(root)}`);
}
for (const file of [
  'platform-shell.js',
  'platform-shell.css',
  'platform-theme.css',
  'vre-mark.svg',
  'vre-icon-32.png',
  'vre-icon-180.png',
  'vre-icon-192.png',
  'vre-icon-512.png',
  'favicon.ico',
  'site.webmanifest'
]) {
  const shellFile = path.join(platformShellRoot, file);
  expect(fs.existsSync(shellFile), `Missing shared application-shell asset: ${relative(shellFile)}`);
}

if (failures.length === 0) {
  const corePackage = readJson(path.join(coreRoot, 'package.json'));
  const angularPackage = readJson(path.join(angularRoot, 'package.json'));
  const reactPackage = readJson(path.join(reactRoot, 'package.json'));
  const angularShowcasePackage = readJson(path.join(angularShowcaseRoot, 'package.json'));
  const reactShowcasePackage = readJson(path.join(reactShowcaseRoot, 'package.json'));
  const vanillaShowcasePackage = readJson(path.join(vanillaShowcaseRoot, 'package.json'));
  const portalPackage = readJson(path.join(portalRoot, 'package.json'));
  const docsPackage = readJson(path.join(docsRoot, 'package.json'));
  const coreDependencies = {
    ...corePackage.dependencies,
    ...corePackage.peerDependencies,
    ...corePackage.optionalDependencies
  };

  expect(corePackage.name === '@validation-rules-engine/core', 'Core package name must be @validation-rules-engine/core.');
  expect(angularPackage.name === '@validation-rules-engine/angular', 'Angular package name must be @validation-rules-engine/angular.');
  expect(reactPackage.name === '@validation-rules-engine/react', 'React package name must be @validation-rules-engine/react.');
  expect(
    angularPackage.peerDependencies?.['@validation-rules-engine/core'] === '^1.0.0',
    'Angular adapter must declare @validation-rules-engine/core as a peer dependency.'
  );
  expect(
    reactPackage.peerDependencies?.['@validation-rules-engine/core'] === '^1.0.0',
    'React adapter must declare @validation-rules-engine/core as a peer dependency.'
  );
  expect(typeof reactPackage.peerDependencies?.react === 'string', 'React adapter must declare React as a peer dependency.');
  expect(typeof reactPackage.peerDependencies?.['react-dom'] === 'string', 'React adapter must declare React DOM as a peer dependency.');
  expect(
    angularShowcasePackage.dependencies?.['@validation-rules-engine/angular'] === angularPackage.version,
    'Angular showcase must depend on the local Angular adapter version.'
  );
  expect(
    angularShowcasePackage.dependencies?.['@validation-rules-engine/core'] === undefined,
    'Angular showcase must consume framework-neutral APIs through @validation-rules-engine/angular.'
  );
  expect(reactShowcasePackage.private === true, 'React showcase must remain private.');
  expect(portalPackage.private === true, 'Portal must remain private.');
  expect(docsPackage.private === true, 'Documentation application must remain private.');
  for (const dependency of [
    '@ngrx/store',
    '@ngxs/store',
    '@datorama/akita',
    '@ngneat/elf',
    '@rx-angular/state'
  ]) {
    expect(
      typeof angularShowcasePackage.dependencies?.[dependency] === 'string',
      `Angular showcase must declare ${dependency} for state-management showcases.`
    );
  }
  expect(
    reactShowcasePackage.dependencies?.['@validation-rules-engine/react'] === reactPackage.version,
    'React showcase must depend on the local React adapter version.'
  );
  expect(
    reactShowcasePackage.dependencies?.['@validation-rules-engine/core'] === undefined,
    'React showcase must consume core APIs through @validation-rules-engine/react.'
  );
  expect(vanillaShowcasePackage.private === true, 'Vanilla showcase must remain private.');
  expect(
    vanillaShowcasePackage.dependencies?.['@validation-rules-engine/core'] === corePackage.version,
    'Vanilla showcase must depend on the local Core package version.'
  );
  expect(
    vanillaShowcasePackage.dependencies?.['@validation-rules-engine/angular'] === undefined,
    'Vanilla showcase must not depend on the Angular adapter.'
  );
  expect(
    vanillaShowcasePackage.dependencies?.['@validation-rules-engine/react'] === undefined,
    'Vanilla showcase must not depend on the React adapter.'
  );

  for (const dependency of Object.keys(coreDependencies)) {
    expect(!dependency.startsWith('@angular/'), `Core package cannot depend on Angular: ${dependency}`);
  }

  const forbiddenCoreFiles = findSourceMatches(
    coreRoot,
    /(?:from\s+|import\s*\()(['"])(?:@angular\/|react(?:-dom)?(?:\/|\1)|@validation-rules-engine\/(?:angular|react)|(?:\.\.\/)+(?:angular|react)(?:\/|\1))/
  );
  for (const file of forbiddenCoreFiles) {
    failures.push(`Core source has a forbidden framework dependency: ${relative(file)}`);
  }

  expect(
    findSourceMatches(angularRoot, /(['"])@validation-rules-engine\/core\1/).length > 0,
    'Angular adapter source must consume @validation-rules-engine/core.'
  );
  expect(
    findSourceMatches(reactRoot, /(['"])@validation-rules-engine\/core\1/).length > 0,
    'React adapter source must consume @validation-rules-engine/core.'
  );
  for (const file of findSourceMatches(angularRoot, /(['"])@validation-rules-engine\/react\1/)) {
    failures.push(`Angular adapter depends on React: ${relative(file)}`);
  }
  for (const file of findSourceMatches(reactRoot, /(['"])@validation-rules-engine\/angular\1/)) {
    failures.push(`React adapter depends on Angular: ${relative(file)}`);
  }
  expect(
    findSourceMatches(angularShowcaseRoot, /(['"])@validation-rules-engine\/angular\1/).length > 0,
    'Angular showcase source must consume @validation-rules-engine/angular.'
  );
  for (const file of findSourceMatches(angularShowcaseRoot, /(['"])@validation-rules-engine\/core\1/)) {
    failures.push(`Angular showcase bypasses the adapter: ${relative(file)}`);
  }
  for (const [dependency, label] of [
    ['@ngrx/store', 'NgRx'],
    ['@ngxs/store', 'NGXS'],
    ['@datorama/akita', 'Akita'],
    ['@ngneat/elf', 'Elf'],
    ['@rx-angular/state', 'RxAngular State']
  ]) {
    expect(
      findSourceMatches(angularShowcaseRoot, new RegExp(`(['"])${dependency.replaceAll('/', '\\/')}(?:\\/[^'"]*)?\\1`)).length > 0,
      `Angular showcase source must cover ${label}.`
    );
  }
  expect(
    findSourceMatches(reactShowcaseRoot, /(['"])@validation-rules-engine\/react\1/).length > 0,
    'React showcase source must consume @validation-rules-engine/react.'
  );
  for (const file of findSourceMatches(reactShowcaseRoot, /(['"])@validation-rules-engine\/core\1/)) {
    failures.push(`React showcase bypasses the adapter: ${relative(file)}`);
  }
  expect(
    findSourceMatches(vanillaShowcaseRoot, /(['"])@validation-rules-engine\/core\1/).length > 0,
    'Vanilla showcase source must consume @validation-rules-engine/core.'
  );
  for (const file of findSourceMatches(vanillaShowcaseRoot, /(['"])@validation-rules-engine\/(?:angular|react)\1/)) {
    failures.push(`Vanilla showcase must not import framework adapters: ${relative(file)}`);
  }
  for (const file of findSourceMatches(vanillaShowcaseRoot, /(?:from\s+|import\s*\()(['"])(?:@angular\/|react(?:-dom)?(?:\/|\1))/)) {
    failures.push(`Vanilla showcase has a forbidden framework dependency: ${relative(file)}`);
  }

  const angularImports = /(?:from\s+|import\s*\()(['"])(?:@angular\/|@ngrx\/|@validation-rules-engine\/angular)\S*\1/;
  for (const root of [portalRoot, docsRoot]) {
    for (const file of findSourceMatches(root, angularImports)) {
      failures.push(`Framework-neutral Node application has an Angular-specific dependency: ${relative(file)}`);
    }
  }

  const shellConsumers = [
    path.join(portalRoot, 'public', 'index.html'),
    path.join(docsRoot, 'src', 'server.ts'),
    path.join(angularShowcaseRoot, 'src', 'app', 'app.component.html'),
    path.join(reactShowcaseRoot, 'src', 'app.tsx'),
    path.join(vanillaShowcaseRoot, 'src', 'app.ts')
  ];
  for (const file of shellConsumers) {
    expect(
      fs.readFileSync(file, 'utf8').includes('validation-platform-shell'),
      `${relative(file)} must render the shared application shell.`
    );
  }

  const shellSource = fs.readFileSync(path.join(platformShellRoot, 'platform-shell.js'), 'utf8');
  for (const label of ['Home', 'Docs', 'Showcases', 'Reports', 'GitHub']) {
    expect(shellSource.includes(label), `Shared application shell must expose the ${label} navigation destination.`);
  }
  expect(
    shellSource.includes('/docs/roadmap') && shellSource.includes('/docs/faq'),
    'Shared documentation navigation must expose Roadmap and FAQ deep links.'
  );
  expect(
    fs.existsSync(path.join(docsRoot, 'src', 'search.ts'))
      && fs.existsSync(path.join(docsRoot, 'public', 'search.js')),
    'Documentation application must provide a client-side search index and controller.'
  );
  expect(
    !fs.existsSync(path.join(angularShowcaseRoot, 'src', 'app', 'pages', 'docs', 'docs.component.ts')),
    'Angular showcase must not duplicate the authoritative documentation application.'
  );
  expect(
    fs.readFileSync(path.join(workspaceRoot, 'docs', 'site', 'angular', 'angular.md'), 'utf8').includes('## Template-driven controls'),
    'Angular-specific documentation consolidated from the showcase must remain in the documentation application.'
  );
  expect(
    fs.existsSync(path.join(reactShowcaseRoot, 'src', 'pages', 'home-page.tsx')),
    'React showcase must provide a landing page parallel to the Angular showcases.'
  );
  for (const file of [
    path.join(angularShowcaseRoot, 'src', 'app', 'layout', 'showcase-shell.component.html'),
    path.join(reactShowcaseRoot, 'src', 'app.tsx'),
    path.join(vanillaShowcaseRoot, 'src', 'app.ts')
  ]) {
    expect(fs.readFileSync(file, 'utf8').includes('vr-showcase-shell'), `${relative(file)} must use the shared showcase layout.`);
  }

  expect(
    fs.existsSync(path.join(workspaceRoot, 'docs', 'site', 'react', 'react-overview.md')),
    'Documentation application must contain the React overview.'
  );
  expect(
    fs.existsSync(path.join(vanillaShowcaseRoot, 'src', 'pages', 'home.ts')),
    'Vanilla showcase must provide a landing page parallel to the Angular and React showcases.'
  );
  expect(
    shellSource.includes('Vanilla JS Showcase') && shellSource.includes('vanilla'),
    'Shared application shell must expose the Vanilla JS Showcase navigation destination.'
  );

  for (const framework of ['vue']) {
    expect(
      !fs.existsSync(path.join(workspaceRoot, 'packages', framework))
        && !fs.existsSync(path.join(workspaceRoot, 'apps', `${framework}-showcase`)),
      `Out-of-scope ${framework} placeholder detected.`
    );
  }
}

if (failures.length > 0) {
  console.error(`Architecture verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Verified dependency direction: Angular showcase -> angular adapter -> core engine.');
  console.log('Verified dependency direction: React showcase -> React adapter -> core engine.');
  console.log('Verified dependency direction: Vanilla showcase -> core engine.');
  console.log('Verified that the portal and documentation applications remain Angular-free.');
  console.log('Verified that @validation-rules-engine/core has no Angular dependency.');
  console.log('Verified that every application renders the shared platform shell.');
}
