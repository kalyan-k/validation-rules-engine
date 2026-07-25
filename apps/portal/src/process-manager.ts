import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import type { ApplicationDefinition } from './applications.js';

export type ApplicationState = 'starting' | 'healthy' | 'failed' | 'stopped';

export interface ApplicationStatus extends ApplicationDefinition {
  state: ApplicationState;
  detail: string;
  startedAt?: string;
  checkedAt?: string;
  pid?: number;
}

interface ManagedApplication {
  definition: ApplicationDefinition;
  process?: ChildProcess;
  status: ApplicationStatus;
}

export class ApplicationProcessManager {
  private readonly applications = new Map<string, ManagedApplication>();
  private monitor?: NodeJS.Timeout;
  private stopping = false;

  constructor(
    definitions: ApplicationDefinition[],
    private readonly workspaceRoot: string,
    private readonly npmExecPath = process.env['npm_execpath']
  ) {
    definitions.forEach((definition) => {
      this.applications.set(definition.id, {
        definition,
        status: { ...definition, state: 'stopped', detail: 'Waiting to start' }
      });
    });
  }

  startAll(): void {
    for (const application of this.applications.values()) {
      this.start(application);
    }
    this.monitor = setInterval(() => void this.refreshHealth(), 1500);
    this.monitor.unref();
  }

  getStatuses(): ApplicationStatus[] {
    return [...this.applications.values()].map(({ status }) => ({ ...status }));
  }

  async refreshHealth(): Promise<void> {
    await Promise.all([...this.applications.values()].map(async (application) => {
      if (application.status.state === 'failed' || application.status.state === 'stopped') {
        return;
      }
      const healthy = await probe(application.definition.healthUrl);
      application.status = {
        ...application.status,
        state: healthy ? 'healthy' : 'starting',
        detail: healthy ? 'Ready' : 'Starting application',
        checkedAt: new Date().toISOString()
      };
    }));
  }

  async stopAll(): Promise<void> {
    this.stopping = true;
    if (this.monitor) {
      clearInterval(this.monitor);
    }
    await Promise.all([...this.applications.values()].map(async (application) => {
      const child = application.process;
      if (!child || child.exitCode !== null || child.pid === undefined) {
        return;
      }
      if (process.platform === 'win32') {
        await new Promise<void>((resolve) => {
          const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true
          });
          killer.once('exit', () => resolve());
          killer.once('error', () => resolve());
        });
      } else {
        child.kill('SIGTERM');
      }
      application.status = { ...application.status, state: 'stopped', detail: 'Stopped' };
    }));
  }

  private start(application: ManagedApplication): void {
    if (!this.npmExecPath) {
      application.status = {
        ...application.status,
        state: 'failed',
        detail: 'Start the portal through npm so applications can be launched.'
      };
      return;
    }
    const forwardedArgs = application.definition.startArgs?.length
      ? ['--', ...application.definition.startArgs]
      : [];
    const child = spawn(process.execPath, [this.npmExecPath, 'run', application.definition.startScript, ...forwardedArgs], {
      cwd: this.workspaceRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    application.process = child;
    application.status = {
      ...application.definition,
      state: 'starting',
      detail: 'Starting application',
      startedAt: new Date().toISOString(),
      pid: child.pid
    };

    const forward = (stream: NodeJS.ReadableStream | null, level: 'log' | 'error'): void => {
      stream?.on('data', (chunk: Buffer | string) => {
        const message = String(chunk).trimEnd();
        if (message) {
          console[level](`[${application.definition.shortTitle}] ${message}`);
        }
      });
    };
    forward(child.stdout, 'log');
    forward(child.stderr, 'error');

    child.once('error', (error) => {
      application.status = {
        ...application.status,
        state: 'failed',
        detail: error.message,
        checkedAt: new Date().toISOString()
      };
    });
    child.once('exit', (code) => {
      if (!this.stopping) {
        application.status = {
          ...application.status,
          state: 'failed',
          detail: `Application stopped unexpectedly${code === null ? '' : ` (exit ${code})`}`,
          checkedAt: new Date().toISOString()
        };
      }
    });
  }
}

function probe(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, { timeout: 1000 }, (response) => {
      response.resume();
      resolve((response.statusCode ?? 500) < 500);
    });
    request.once('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.once('error', () => resolve(false));
  });
}
