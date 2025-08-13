import path from 'node:path';
import fs from 'fs-extra';
import { nanoid } from 'nanoid';

export type SessionState = 'idle' | 'capturing' | 'paused' | 'exporting';

export interface SessionInfo {
  sessionId: string;
  partition: string;
  tempDir: string;
  startedAt: number;
  state: SessionState;
  url?: string;
}

let currentSession: SessionInfo | null = null;

function getSessionsRoot(): string {
  return path.join(process.cwd(), 'temp', 'sessions');
}

export const SessionManager = {
  startNewSession(url: string): SessionInfo {
    const sessionId = nanoid(10);
    const partition = `persist:webloader-${sessionId}`;
    const tempDir = path.join(getSessionsRoot(), sessionId);
    fs.ensureDirSync(tempDir);
    currentSession = {
      sessionId,
      partition,
      tempDir,
      startedAt: Date.now(),
      state: 'capturing',
      url,
    };
    return currentSession;
  },

  pause(): SessionInfo | null {
    if (currentSession) currentSession.state = 'paused';
    return currentSession;
  },

  resume(): SessionInfo | null {
    if (currentSession) currentSession.state = 'capturing';
    return currentSession;
  },

  stop(): SessionInfo | null {
    if (currentSession) currentSession.state = 'idle';
    return currentSession;
  },

  getCurrent(): SessionInfo | null {
    return currentSession;
  },
};


