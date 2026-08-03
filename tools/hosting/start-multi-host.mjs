import { spawn } from 'node:child_process';

const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  console.error('Unable to start multi-host mode: npm_execpath is unavailable. Run this command through npm.');
  process.exit(1);
}

const child = spawn(process.execPath, [npmExecPath, 'run', 'serve:portal'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    VRE_STATIC_SHOWCASES: '1'
  },
  stdio: 'inherit',
  windowsHide: true
});

let stopping = false;

async function stop(exitCode) {
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
  process.exit(exitCode);
}

process.once('SIGINT', () => void stop(130));
process.once('SIGTERM', () => void stop(143));
child.once('error', (error) => {
  console.error(error);
  void stop(1);
});
child.once('exit', (code, signal) => {
  if (!stopping) {
    process.exit(code ?? (signal ? 1 : 0));
  }
});
