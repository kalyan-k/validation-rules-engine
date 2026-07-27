import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const workspaceRoot = process.cwd();
const root = path.resolve(workspaceRoot, args.root ?? '');
const host = args.host ?? '127.0.0.1';
const port = Number.parseInt(args.port ?? '', 10);
const name = args.name ?? 'static-app';
const spa = args.spa === '1' || args.spa === 'true' || args.spa === undefined;

if (!args.root || !Number.isFinite(port) || port <= 0) {
  console.error('Usage: node playwright/scripts/static-server.mjs --root <directory> --port <port> [--host 127.0.0.1] [--name app] [--spa true]');
  process.exit(1);
}

if (!root.startsWith(`${workspaceRoot}${path.sep}`) || !existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Static root is not available inside the workspace: ${args.root}`);
  process.exit(1);
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8'
};

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`);

  if (requestUrl.pathname === '/health') {
    sendJson(response, 200, { status: 'healthy', service: name });
    return;
  }

  if (requestUrl.pathname === '/platform-config.js') {
    sendJavaScript(response, platformConfigScript());
    return;
  }

  const requestedPath = requestUrl.pathname === '/' ? 'index.html' : decodeURIComponent(requestUrl.pathname.slice(1));
  serveFile(response, requestedPath);
});

server.listen(port, host, () => {
  console.log(`${name}: http://${host}:${port}`);
});

process.once('SIGINT', () => server.close(() => process.exit(0)));
process.once('SIGTERM', () => server.close(() => process.exit(0)));

function serveFile(response, requestedPath) {
  let filePath = path.resolve(root, requestedPath);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    if (!spa) {
      sendText(response, 404, 'Not found');
      return;
    }
    filePath = path.join(root, 'index.html');
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    sendText(response, 404, 'Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store'
  });

  if (path.basename(filePath) === 'index.html') {
    response.end(rewriteConfiguredLinks(readFileSync(filePath, 'utf8')));
    return;
  }

  createReadStream(filePath).pipe(response);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value?.startsWith('--')) {
      continue;
    }
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function platformConfigScript() {
  return `globalThis.validationRulesPlatformConfig = ${JSON.stringify({
    urls: {
      portal: process.env.VALIDATION_RULES_PORTAL_URL ?? '',
      docs: process.env.VALIDATION_RULES_DOCS_URL ?? '',
      angular: process.env.VALIDATION_RULES_ANGULAR_SHOWCASE_URL ?? '',
      react: process.env.VALIDATION_RULES_REACT_SHOWCASE_URL ?? ''
    }
  })};`;
}

function rewriteConfiguredLinks(html) {
  return html
    .replaceAll('http://127.0.0.1:4200', process.env.VALIDATION_RULES_PORTAL_URL ?? 'http://127.0.0.1:4200')
    .replaceAll('http://127.0.0.1:4201', process.env.VALIDATION_RULES_DOCS_URL ?? 'http://127.0.0.1:4201')
    .replaceAll('http://127.0.0.1:4202', process.env.VALIDATION_RULES_ANGULAR_SHOWCASE_URL ?? 'http://127.0.0.1:4202')
    .replaceAll('http://127.0.0.1:4203', process.env.VALIDATION_RULES_ANGULAR_SHOWCASE_URL ?? 'http://127.0.0.1:4202')
    .replaceAll('http://127.0.0.1:4204', process.env.VALIDATION_RULES_REACT_SHOWCASE_URL ?? 'http://127.0.0.1:4204');
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

function sendJavaScript(response, value) {
  response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(value);
}

function sendText(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(value);
}
