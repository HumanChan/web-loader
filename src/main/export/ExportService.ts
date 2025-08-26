import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import { ResourceRecord } from '../../shared/types';
import { session, net as electronNet } from 'electron';
import http from 'node:http';
import https from 'node:https';

export interface ExportParams {
  tempDir: string;
  records: ResourceRecord[];
  targetDir: string;
  onProgress?: (p: { total: number; completed: number; failed: number; bytesTotal: number; bytesCompleted: number }) => void;
  sessionPartition?: string;
  exportAstcForPng?: boolean;
}

function getFileNameWithQuerySuffix(name: string, _queryHashSuffix?: string): string {
  // By request: do not append query-hash suffix; keep original filename
  return name;
}

export const ExportService = {
  async exportAll(params: ExportParams): Promise<void> {
    const { tempDir, records, targetDir, onProgress, sessionPartition, exportAstcForPng } = params;
    const filesRoot = path.join(tempDir, 'files');
    await fs.ensureDir(targetDir);

    const isPngEligible = (r: ResourceRecord): boolean => {
      try {
        const rel = r.normalized?.relativePathFromRoot || '';
        if (!rel || rel.startsWith('external/')) return false; // external 不需要
        const fileName = path.basename(rel).toLowerCase();
        if (fileName.endsWith('.png')) return true;
        if ((r.mimeType || '').toLowerCase().includes('image/png')) return true;
        return false;
      } catch {
        return false;
      }
    };

    const astcAttempts = exportAstcForPng ? records.filter((r) => isPngEligible(r)).length : 0;
    let total = records.length + astcAttempts;
    let completed = 0;
    let failed = 0;
    let bytesTotal = 0;
    let bytesCompleted = 0;

    const report = () => onProgress?.({ total, completed, failed, bytesTotal, bytesCompleted });

    const missingLogs: Array<{ id: string; url: string; type: string; rel: string; reason: string; message?: string }>= [];
    report();

    const buildAstcUrl = (originalUrl: string): string => {
      const u = new URL(originalUrl);
      const p = u.pathname;
      const idx = p.lastIndexOf('.');
      const newPath = idx >= 0 ? p.slice(0, idx) + '.astc' : (p + '.astc');
      u.pathname = newPath;
      return u.toString();
    };

    const downloadToTempWithSession = async (url: string, referer?: string): Promise<{ tmpFile: string | null; bytes: number }> => {
      const tmpFile = path.join(os.tmpdir(), `webloader_astc_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      try {
        const ses = sessionPartition ? session.fromPartition(sessionPartition) : undefined;
        const requester: any = (ses && (ses as any).net && (ses as any).net.request) ? (ses as any).net : electronNet;
        let urlToGet = url;
        for (let i = 0; i < 3; i++) {
          const bytes = await new Promise<number>((resolve, reject) => {
            const req = requester.request({ url: urlToGet, method: 'GET', headers: referer ? { Referer: referer } : {} });
            const ws = fs.createWriteStream(tmpFile);
            let acc = 0;
            req.on('response', (res: any) => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                try { urlToGet = String(res.headers.location); req.abort(); ws.close(); } catch {}
                resolve(-1);
                return;
              }
              res.on('data', (c: Buffer) => (acc += c.length));
              res.on('error', reject); ws.on('error', reject);
              ws.on('finish', () => resolve(acc));
              res.pipe(ws);
            });
            req.on('error', reject);
            req.end();
          });
          if (bytes === -1) continue; // followed redirect
          return { tmpFile, bytes };
        }
        return { tmpFile, bytes: 0 };
      } catch {
        // fallback using node http/https
        try {
          const u = new URL(url);
          const client = u.protocol === 'https:' ? https : http;
          const bytes = await new Promise<number>((resolve, reject) => {
            const req = client.get(url, (res) => {
              if ((res.statusCode || 0) >= 300 && (res.statusCode || 0) < 400 && res.headers.location) {
                const req2 = client.get(res.headers.location!, (res2) => {
                  const ws = fs.createWriteStream(tmpFile);
                  let b = 0; res2.on('data', (c) => (b += (c as Buffer).length));
                  res2.on('error', reject); ws.on('error', reject);
                  ws.on('finish', () => resolve(b));
                  res2.pipe(ws);
                });
                req2.on('error', reject);
                return;
              }
              const ws = fs.createWriteStream(tmpFile);
              let b = 0; res.on('data', (c) => (b += (c as Buffer).length));
              res.on('error', reject); ws.on('error', reject);
              ws.on('finish', () => resolve(b));
              res.pipe(ws);
            });
            req.on('error', reject);
          }).catch(() => 0);
          return { tmpFile, bytes };
        } catch {
          return { tmpFile: null, bytes: 0 };
        }
      }
    };

    for (const r of records) {
      // 仅排除文档；其余包括 xhr/json/audio 等均导出
      if (r.type === 'document') {
        // 记录非缺失原因的跳过，帮助排查
        missingLogs.push({ id: r.id, url: r.url, type: r.type, rel: r.normalized.relativePathFromRoot, reason: 'skipped:document' });
        continue;
      }
      try {
        const rel = r.normalized.relativePathFromRoot;
        const fileName = path.basename(rel);
        const dirName = path.dirname(rel);
        const finalName = getFileNameWithQuerySuffix(fileName, r.normalized.queryHashSuffix);
        const finalRel = path.join(dirName, finalName);
        const possibleRaw = path.join(filesRoot, 'raw');
        const srcPathWithAnyExt = async () => {
          // try id with any known extension in raw dir
          if (!(await fs.pathExists(possibleRaw))) return null;
          const base = path.join(possibleRaw, `${r.id}`);
          const exts = ['', '.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.m4a', '.ogg', '.json', '.bin'];
          for (const ext of exts) {
            const p = base + ext;
            if (await fs.pathExists(p)) return p;
          }
          return null;
        };

        let srcPath: string | null = r.tempFilePath || (await srcPathWithAnyExt());
        const dstPath = path.join(targetDir, finalRel);

        // Fallback: download now if not captured to temp
        if (!srcPath) {
          const tmpFile = path.join(os.tmpdir(), `webloader_${r.id}`);
          const downloaded = await (async () => {
            // Prefer Electron session.net.request to keep cookies/proxy consistent
            try {
              const ses = sessionPartition ? session.fromPartition(sessionPartition) : undefined;
              const requester: any = (ses && (ses as any).net && (ses as any).net.request) ? (ses as any).net : electronNet;
              let urlToGet = r.url;
              for (let i = 0; i < 3; i++) {
                const bytes = await new Promise<number>((resolve, reject) => {
                  const req = requester.request({ url: urlToGet, method: 'GET', headers: r.referrer ? { Referer: r.referrer } : {} });
                  const ws = fs.createWriteStream(tmpFile);
                  let acc = 0;
                  req.on('response', (res: any) => {
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                      try { urlToGet = String(res.headers.location); req.abort(); ws.close(); } catch {}
                      resolve(-1);
                      return;
                    }
                    res.on('data', (c: Buffer) => (acc += c.length));
                    res.on('error', reject); ws.on('error', reject);
                    ws.on('finish', () => resolve(acc));
                    res.pipe(ws);
                  });
                  req.on('error', reject);
                  req.end();
                });
                if (bytes === -1) continue; // followed redirect, try again
                return bytes;
              }
              return 0;
            } catch {
              // Fallback to node http/https (no cookies)
              const u = new URL(r.url);
              const client = u.protocol === 'https:' ? https : http;
              return await new Promise<number>((resolve, reject) => {
                const req = client.get(r.url, (res) => {
                  if ((res.statusCode || 0) >= 300 && (res.statusCode || 0) < 400 && res.headers.location) {
                    const req2 = client.get(res.headers.location, (res2) => {
                      const ws = fs.createWriteStream(tmpFile);
                      let b = 0; res2.on('data', (c) => (b += (c as Buffer).length));
                      res2.on('error', reject); ws.on('error', reject);
                      ws.on('finish', () => resolve(b));
                      res2.pipe(ws);
                    });
                    req2.on('error', reject);
                    return;
                  }
                  const ws = fs.createWriteStream(tmpFile);
                  let bytes = 0; res.on('data', (c) => (bytes += (c as Buffer).length));
                  res.on('error', reject); ws.on('error', reject);
                  ws.on('finish', () => resolve(bytes));
                  res.pipe(ws);
                });
                req.on('error', reject);
              }).catch(() => 0);
            }
          })();
          if (downloaded > 0) srcPath = tmpFile; else {
            missingLogs.push({ id: r.id, url: r.url, type: r.type, rel: finalRel, reason: 'download-failed' });
          }
        }

        if (srcPath && (await fs.pathExists(srcPath))) {
          const stat = await fs.stat(srcPath);
          bytesTotal += stat.size;
          await fs.ensureDir(path.dirname(dstPath));
          // 处理同名冲突：若目标已存在则追加 __n 序号
          let finalDst = dstPath;
          if (await fs.pathExists(finalDst)) {
            const { dir, name, ext } = path.parse(dstPath);
            let n = 1;
            while (await fs.pathExists(path.join(dir, `${name}__${n}${ext}`))) n++;
            finalDst = path.join(dir, `${name}__${n}${ext}`);
          }
          await fs.copy(srcPath, finalDst, { overwrite: false, errorOnExist: false });
          bytesCompleted += stat.size;
          // 回写实际大小到记录，便于统计面板与导出一致
          try { r.sizeOnDisk = stat.size; } catch {}
          completed += 1;

          // 若需要，为 PNG 附加导出同名 .astc（external/* 不处理）
          if (exportAstcForPng && isPngEligible(r)) {
            try {
              const astcRel = path.join(dirName, path.parse(fileName).name + '.astc');
              const astcDst = path.join(targetDir, astcRel);
              if (await fs.pathExists(astcDst)) {
                // 目标已存在：跳过写入，计作完成
                completed += 1;
              } else {
                const astcUrl = buildAstcUrl(r.url);
                const dl = await downloadToTempWithSession(astcUrl, r.referrer);
                if (dl.tmpFile && dl.bytes > 0 && (await fs.pathExists(dl.tmpFile))) {
                  await fs.ensureDir(path.dirname(astcDst));
                  await fs.copy(dl.tmpFile, astcDst, { overwrite: false, errorOnExist: false });
                  bytesTotal += dl.bytes;
                  bytesCompleted += dl.bytes;
                  completed += 1;
                } else {
                  failed += 1;
                  missingLogs.push({ id: r.id, url: astcUrl, type: 'astc', rel: astcRel, reason: 'astc-download-failed' });
                }
              }
            } catch (e: any) {
              failed += 1;
              const astcRel = path.join(dirName, path.parse(fileName).name + '.astc');
              const astcUrl = (() => { try { return buildAstcUrl(r.url); } catch { return r.url; } })();
              missingLogs.push({ id: r.id, url: astcUrl, type: 'astc', rel: astcRel, reason: 'astc-exception', message: String(e?.message || e) });
            }
          }
        } else {
          failed += 1;
          missingLogs.push({ id: r.id, url: r.url, type: r.type, rel: finalRel, reason: 'no-source-file' });
          // 若预先将 astc 计入 total，但 PNG 失败，这里也标记一次失败以抵消计数
          if (exportAstcForPng && isPngEligible(r)) {
            failed += 1;
            const astcRel = path.join(dirName, path.parse(fileName).name + '.astc');
            const astcUrl = (() => { try { return buildAstcUrl(r.url); } catch { return r.url; } })();
            missingLogs.push({ id: r.id, url: astcUrl, type: 'astc', rel: astcRel, reason: 'astc-skipped:png-failed' });
          }
        }
      } catch (e: any) {
        failed += 1;
        missingLogs.push({ id: r.id, url: r.url, type: r.type, rel: r.normalized.relativePathFromRoot, reason: 'exception', message: String(e?.message || e) });
      }
      report();
    }
    // 同步回 index.json，便于后续统计读取实际字节
    try {
      const idxPath = path.join(tempDir, 'index.json');
      await fs.writeJson(idxPath, records, { spaces: 2 });
    } catch {}
    // 输出缺失日志
    try {
      if (missingLogs.length > 0) {
        const logPath = path.join(targetDir, 'missing.log');
        const lines = missingLogs.map((m) => JSON.stringify(m)).join('\n');
        await fs.writeFile(logPath, lines, 'utf8');
      }
    } catch {}
  },
};


