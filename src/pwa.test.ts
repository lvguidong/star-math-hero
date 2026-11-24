import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

describe('PWA 离线资源', () => {
  it('manifest 配置完整', () => {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../public/manifest.webmanifest'), 'utf-8'));
    expect(manifest.name).toContain('星际数学小勇士');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toHaveLength(2);
    expect(manifest.icons[0].src).toContain('icon-192');
  });

  it('Service Worker 预缓存应用外壳', () => {
    const sw = readFileSync(resolve(__dirname, '../public/sw.js'), 'utf-8');
    for (const path of ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']) {
      expect(sw).toContain(path);
    }
    expect(sw).toContain("'install'");
    expect(sw).toContain("'activate'");
    expect(sw).toContain("'fetch'");
  });

  it('图标文件存在且为有效 PNG', () => {
    for (const name of ['icon-192.png', 'icon-512.png']) {
      const buf = readFileSync(resolve(__dirname, '../public/icons', name));
      expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      const w = buf.readUInt32BE(16);
      expect(w).toBe(name.includes('192') ? 192 : 512);
    }
  });
});
