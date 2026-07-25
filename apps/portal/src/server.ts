import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationDefinitions, platformUrls, portalPort } from './applications.js';
import { ApplicationProcessManager } from './process-manager.js';

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(sourceDirectory, '..', '..', '..');
const publicRoot = path.join(workspaceRoot, 'apps', 'portal', 'public');
const shellRoot = path.join(workspaceRoot, 'tools', 'platform-shell');
const reportsRoot = path.join(workspaceRoot, 'reports');
const rootPackage = JSON.parse(readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8')) as { version?: string };

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8'
};

const platformAssets = new Set([
  'favicon.ico',
  'platform-shell.css',
  'platform-shell.js',
  'platform-theme.css',
  'site.webmanifest',
  'validation-rules-mark.svg',
  ...[16, 32, 64, 180, 192, 512].map((size) => `validation-rules-icon-${size}.png`)
]);

export function createPortalServer(manager: ApplicationProcessManager): http.Server {
  return http.createServer((request, response) => {
    void handleRequest(request, response, manager);
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  manager: ApplicationProcessManager
): Promise<void> {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
  if (requestUrl.pathname === '/health') {
    sendJson(response, 200, { status: 'healthy', service: 'portal' });
    return;
  }
  if (requestUrl.pathname === '/api/status') {
    await manager.refreshHealth();
    sendJson(response, 200, { applications: manager.getStatuses() });
    return;
  }
  if (requestUrl.pathname === '/api/meta') {
    sendJson(response, 200, {
      version: rootPackage.version ?? '0.0.0',
      revision: repositoryRevision(),
      builtAt: process.env['VALIDATION_RULES_BUILD_TIME'] ?? 'Local development',
      repository: 'https://github.com/kalyan-k/validation-rules',
      urls: platformUrls
    });
    return;
  }
  if (requestUrl.pathname === '/platform-config.js') {
    sendJavaScript(response, platformConfigScript());
    return;
  }
  if (requestUrl.pathname.startsWith('/reports/')) {
    serveFile(response, reportsRoot, requestUrl.pathname.slice('/reports/'.length));
    return;
  }
  if (platformAssets.has(requestUrl.pathname.slice(1))) {
    serveFile(response, shellRoot, requestUrl.pathname.slice(1));
    return;
  }
  const relativePath = requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.slice(1);
  serveFile(response, publicRoot, relativePath, true);
}

function serveFile(response: ServerResponse, root: string, requestedPath: string, fallbackToIndex = false): void {
  const resolvedRoot = path.resolve(root);
  let filePath = path.resolve(root, requestedPath);
  if (!filePath.startsWith(`${resolvedRoot}${path.sep}`) && filePath !== resolvedRoot) {
    sendText(response, 403, 'Forbidden');
    return;
  }
  if ((!existsSync(filePath) || !statSync(filePath).isFile()) && fallbackToIndex) {
    filePath = path.join(publicRoot, 'index.html');
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    sendText(response, 404, 'Not found');
    return;
  }
  if (root === publicRoot && path.basename(filePath) === 'index.html') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(rewriteConfiguredLinks(readFileSync(filePath, 'utf8')));
    return;
  }
  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': root === shellRoot ? 'public, max-age=3600' : 'no-store'
  });
  createReadStream(filePath).pipe(response);
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function sendText(response: ServerResponse, status: number, value: string): void {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(value);
}

function sendJavaScript(response: ServerResponse, value: string): void {
  response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(value);
}

function platformConfigScript(): string {
  return `globalThis.validationRulesPlatformConfig = ${JSON.stringify({ urls: platformUrls })};`;
}

function rewriteConfiguredLinks(html: string): string {
  return html
    .replaceAll('http://127.0.0.1:4200', platformUrls.portal)
    .replaceAll('http://127.0.0.1:4201', platformUrls.docs)
    .replaceAll('http://127.0.0.1:4202', platformUrls.angular)
    .replaceAll('http://127.0.0.1:4203', platformUrls.angular)
    .replaceAll('http://127.0.0.1:4204', platformUrls.react);
}

function repositoryRevision(): string {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    windowsHide: true
  });
  return result.status === 0 ? result.stdout.trim() : 'working tree';
}

function openPortal(url: string): void {
  if (process.env['VALIDATION_RULES_NO_OPEN'] === '1') {
    return;
  }
  const command = process.platform === 'win32' ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const opener = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  opener.unref();
}

async function main(): Promise<void> {
  const manager = new ApplicationProcessManager(applicationDefinitions, workspaceRoot);
  const server = createPortalServer(manager);
  server.listen(portalPort, '127.0.0.1', () => {
    console.log(`Validation Rules Portal: ${platformUrls.portal}`);
    manager.startAll();
    openPortal(platformUrls.portal);
  });

  let closing = false;
  const close = async (): Promise<void> => {
    if (closing) {
      return;
    }
    closing = true;
    await manager.stopAll();
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', () => void close());
  process.once('SIGTERM', () => void close());
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
