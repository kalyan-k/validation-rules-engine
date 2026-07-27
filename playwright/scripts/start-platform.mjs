import { spawn, spawnSync } from 'node:child_process';
import { applicationBaseUrls, portFromUrl } from '../config/applications.mjs';

const urls = applicationBaseUrls(process.env);
const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  console.error('Unable to start the Validation Rules platform: npm_execpath is not available. Run Playwright through npm scripts.');
  process.exit(1);
}

const childEnv = {
  ...process.env,
  VALIDATION_RULES_NO_OPEN: '1',
  DEMO_NO_OPEN: '1',
  VALIDATION_RULES_PORTAL_PORT: portFromUrl(urls.portal),
  VALIDATION_RULES_DOCS_PORT: portFromUrl(urls.docs),
  VALIDATION_RULES_ANGULAR_SHOWCASE_PORT: portFromUrl(urls.angular),
  VALIDATION_RULES_REACT_SHOWCASE_PORT: portFromUrl(urls.react),
  VALIDATION_RULES_PORTAL_URL: urls.portal,
  VALIDATION_RULES_DOCS_URL: urls.docs,
  VALIDATION_RULES_ANGULAR_SHOWCASE_URL: urls.angular,
  VALIDATION_RULES_REACT_SHOWCASE_URL: urls.react,
  VALIDATION_RULES_STATIC_SHOWCASES: '1'
};

if (process.env.PLAYWRIGHT_SKIP_PLATFORM_BUILD !== '1') {
  const build = spawnSync(process.execPath, [npmExecPath, 'run', 'build:all'], {
    cwd: process.cwd(),
    env: childEnv,
    stdio: 'inherit',
    windowsHide: true
  });

  if ((build.status ?? 1) !== 0) {
    process.exit(build.status ?? 1);
  }
}

const child = spawn(process.execPath, [npmExecPath, 'run', 'serve:portal'], {
  cwd: process.cwd(),
  env: childEnv,
  stdio: 'inherit',
  windowsHide: true
});

let stopping = false;

async function stop() {
  if (stopping) {
    return;
  }
  stopping = true;

  if (child.pid && child.exitCode === null) {
    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true
        });
        killer.once('exit', resolve);
        killer.once('error', resolve);
      });
    } else {
      child.kill('SIGTERM');
    }
  }
}

process.once('SIGINT', () => void stop().then(() => process.exit(130)));
process.once('SIGTERM', () => void stop().then(() => process.exit(143)));

child.once('exit', (code, signal) => {
  if (!stopping) {
    process.exit(code ?? (signal ? 1 : 0));
  }
});

child.once('error', (error) => {
  console.error(error);
  process.exit(1);
});
