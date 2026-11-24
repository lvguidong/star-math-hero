import { test, expect } from '@playwright/test';

/**
 * 生产构建 + 本地静态服务下验证真正离线：
 * 首次加载注册 SW → 断网 → 刷新仍能玩。
 */
test('生产构建断网后仍可加载并闯关', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  try {
    // 生产产物由 config 的 webServer 提供？此处显式启动 preview 服务
    const { spawn } = await import('node:child_process');
    const server = spawn('pnpm', ['exec', 'vite', 'preview', '--port', '4174'], {
      cwd: process.cwd(), stdio: 'ignore', detached: false,
    });
    try {
      let ok = false;
      for (let i = 0; i < 40; i++) {
        try {
          const res = await page.request.get('http://localhost:4174/');
          if (res.ok()) { ok = true; break; }
        } catch { /* 等待启动 */ }
        await new Promise(r => setTimeout(r, 500));
      }
      expect(ok).toBeTruthy();

      await page.goto('http://localhost:4174/');
      await expect(page.getByRole('heading', { name: /选择你的星系/ })).toBeVisible();
      // 等待 SW 激活并缓存完毕
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.ready;
        if (reg.active?.state !== 'activated') {
          await new Promise<void>(resolve => {
            reg.active?.addEventListener('statechange', () => resolve());
            setTimeout(resolve, 3000);
          });
        }
        // 让 fetch 处理器完成预缓存
        await new Promise(r => setTimeout(r, 500));
      });

      // 断网并刷新
      await context.setOffline(true);
      await page.reload();
      await expect(page.getByRole('heading', { name: /选择你的星系/ })).toBeVisible();
      // 离线答题
      await page.locator('.level-node').first().click();
      await expect(page.getByText('第 1 / 8 题')).toBeVisible();
    } finally {
      server.kill();
      await context.setOffline(false);
    }
  } finally {
    await context.close();
  }
});
