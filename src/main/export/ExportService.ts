import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import { ResourceRecord } from '../../shared/types';
import http from 'node:http';
import https from 'node:https';

export interface ExportParams {
  tempDir: string;
  records: ResourceRecord[];
  targetDir: string;
  onProgress?: (p: { total: number; completed: number; failed: number; bytesTotal: number; bytesCompleted: number }) => void;
}

function getFileNameWithQuerySuffix(name: string, _queryHashSuffix?: string): string {
  // By request: do not append query-hash suffix; keep original filename
  return name;
}

export const ExportService = {
  async exportAll(params: ExportParams): Promise<void> {
    const { tempDir, records, targetDir, onProgress } = params;
    const filesRoot = path.join(tempDir, 'files');
    await fs.ensureDir(targetDir);

    const total = records.length;
    let completed = 0;
    let failed = 0;
    let bytesTotal = 0;
    let bytesCompleted = 0;

    const report = () => onProgress?.({ total, completed, failed, bytesTotal, bytesCompleted });
    report();

    for (const r of records) {
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
          const u = new URL(r.url);
          const client = u.protocol === 'https:' ? https : http;
          const downloaded = await new Promise<number>((resolve, reject) => {
            const req = client.get(r.url, (res) => {
              if ((res.statusCode || 0) >= 300 && (res.statusCode || 0) < 400 && res.headers.location) {
                // simple redirect follow once
                const req2 = client.get(res.headers.location, (res2) => {
                  const ws = fs.createWriteStream(tmpFile);
                  let b = 0; res2.on('data', (c) => (b += c.length));
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
          if (downloaded > 0) {
            srcPath = tmpFile;
          }
        }

        if (srcPath && (await fs.pathExists(srcPath))) {
          const stat = await fs.stat(srcPath);
          bytesTotal += stat.size;
          await fs.ensureDir(path.dirname(dstPath));
          await fs.copy(srcPath, dstPath, { overwrite: true, errorOnExist: false });
          bytesCompleted += stat.size;
          // 回写实际大小到记录，便于统计面板与导出一致
          try { r.sizeOnDisk = stat.size; } catch {}
          completed += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
      report();
    }
    // 同步回 index.json，便于后续统计读取实际字节
    try {
      const idxPath = path.join(tempDir, 'index.json');
      await fs.writeJson(idxPath, records, { spaces: 2 });
    } catch {}
  },
};


