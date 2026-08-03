import { spawn, spawnSync } from 'node:child_process';
import { applicationBaseUrls, portFromUrl } from '../config/applications.mjs';

const urls = applicationBaseUrls(process.env);
const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  console.error('Unable to start single-host Playwright verification: npm_execpath is unavailable.');
  process.exit(1);
}

const childEnv = {
  ...process.env,
  VRE_SINGLE_HOST: '1',
  VRE_NO_OPEN: '1',
  VRE_PORTAL_PORT: portFromUrl(urls.portal)
};

if (process.env.PLAYWRIGHT_SKIP_PLATFORM_BUILD !== '1') {
  const build = spawnSync(process.execPath, [npmExecPath, 'run', 'build:site'], {
    cwd: process.cwd(),
    env: childEnv,
    stdio: 'inherit',
    windowsHide: true
  });
  if ((build.status ?? 1) !== 0) {
    process.exit(build.status ?? 1);
  }
}

const child = spawn(process.execPath, ['dist/apps/portal/server.js', '--single-host'], {
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
