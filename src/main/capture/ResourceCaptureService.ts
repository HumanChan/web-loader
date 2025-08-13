import path from 'node:path';
import fs from 'fs-extra';
import { session, netLog } from 'electron';
import { normalizeUrl } from './UrlNormalizer';
import { ResourceRecord } from '../../shared/types';

export class ResourceCaptureService {
  constructor(private opts: { sessionPartition: string; tempDir: string; mainDocumentUrl: string }) {}

  async start(): Promise<void> {
    const ses = session.fromPartition(this.opts.sessionPartition);
    // TODO: later replace with interceptStreamProtocol to tee body to disk
    ses.webRequest.onCompleted((_details) => {
      // placeholder hook
    });
  }

  async stop(): Promise<void> {
    const ses = session.fromPartition(this.opts.sessionPartition);
    ses.webRequest.onCompleted(null as any);
  }
}


