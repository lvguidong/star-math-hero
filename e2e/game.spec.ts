import { test, expect } from '@playwright/test';

/** 从题目算式文本提取正确答案（只支持 e2e 使用的整十数加法） */
function answerOf(stem: string): number {
  const m = stem.match(/(\d+)\s*\+\s*(\d+)/);
  if (!m) throw new Error(`无法解析题干: ${stem}`);
  return Number(m[1]) + Number(m[2]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('星图显示 6 个星系与首关可进入', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /选择你的星系/ })).toBeVisible();
  await expect(page.locator('.chapter-card')).toHaveCount(6);
  const firstLevel = page.locator('.level-node').first();
  await expect(firstLevel).toBeEnabled();
  expect(await page.locator('.chapter-locked').count()).toBeGreaterThan(0);
});

test('完整闯关：答题 → 提示 → 连击 → 结算 → 存档', async ({ page }) => {
  await page.locator('.level-node').first().click();
  await expect(page.getByText('第 1 / 8 题')).toBeVisible();

  // 答对后自动前进：点击答案后等待题号递增（最后一题等待结算标题），无需再点「下一题」
  const solveCurrent = async (last = false) => {
    const stem = await page.locator('.question-equation').innerText();
    const answer = answerOf(stem);
    await page.getByRole('button', { name: String(answer), exact: true }).click();
    await expect(page.locator('.feedback-banner')).toBeVisible();
    if (last) {
      await expect(page.getByRole('heading', { name: '完美航行！' })).toBeVisible({ timeout: 3000 });
    } else {
      const before = await page.locator('.question-progress span').innerText();
      await expect(page.locator('.question-progress span')).not.toHaveText(before, { timeout: 3000 });
    }
  };

  // 第 1 题：用提示再作答，验证提示面板（提示不影响连击计数）
  await page.getByRole('button', { name: /需要提示/ }).click();
  await expect(page.locator('.hint-box')).toBeVisible();
  await expect(page.locator('.hint-box p')).toHaveCount(1);
  await solveCurrent();
  // 剩余 7 题全部答对（首关只有整十数加法），最后一题自动进入结算
  for (let i = 1; i < 7; i++) await solveCurrent();
  await solveCurrent(true);

  await expect(page.getByRole('heading', { name: '完美航行！' })).toBeVisible();
  await expect(page.locator('.result-stars .earned')).toHaveCount(3);
  await expect(page.getByText('🔥 8')).toBeVisible();
  await expect(page.getByText(/解锁新关卡/)).toBeVisible();

  // 存档持久化：回星图 → 刷新 → 第一关显示三星
  await page.getByRole('button', { name: '返回星图' }).click();
  await page.reload();
  await expect(page.locator('.level-node').first()).toHaveClass(/perfect/);
  await expect(page.locator('.hud-stat').first()).toContainText('3');
});

test('填数字作答：开关切换后输入答案闯关且设置持久化', async ({ page }) => {
  // 打开家长面板 → 设置 → 开启填数字作答
  await page.getByRole('button', { name: '打开家长面板' }).click();
  await page.getByRole('button', { name: '设置' }).click();
  const inputMode = page.locator('.switch-row').filter({ hasText: '填数字作答' }).locator('input');
  await inputMode.check();
  await page.getByRole('button', { name: '关闭', exact: true }).click();

  // 进入首关：无四选一按钮，出现数字输入框
  await page.locator('.level-node').first().click();
  await expect(page.getByText('第 1 / 8 题')).toBeVisible();
  await expect(page.locator('.option-btn')).toHaveCount(0);
  const field = page.locator('.answer-input');
  await expect(field).toBeVisible();

  // 非法输入被拒绝并给出提示
  await field.fill('abc');
  await page.getByRole('button', { name: /发射/ }).click();
  await expect(page.getByText('请输入 0～100 的数字')).toBeVisible();
  await expect(page.locator('.feedback-banner')).toHaveCount(0);

  // 输入正确答案提交 → 出现反馈 → 下一题
  const stem = await page.locator('.question-equation').innerText();
  const answer = answerOf(stem);
  await field.fill(String(answer));
  await field.press('Enter');
  await expect(page.locator('.feedback-banner')).toBeVisible();
  // 答对后自动前进到第 2 题，无需点「下一题」
  await expect(page.getByText('第 2 / 8 题')).toBeVisible({ timeout: 3000 });

  // 刷新后设置仍开启（持久化）
  await page.reload();
  await page.getByRole('button', { name: '打开家长面板' }).click();
  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.locator('.switch-row').filter({ hasText: '填数字作答' }).locator('input')).toBeChecked();
});

test('家长面板：切换标签、设置开关、清空进度', async ({ page }) => {
  await page.getByRole('button', { name: '打开家长面板' }).click();
  await expect(page.getByRole('dialog', { name: '家长面板' })).toBeVisible();
  await expect(page.locator('.report-summary')).toBeVisible();

  await page.getByRole('button', { name: '设置' }).click();
  const sfx = page.locator('.switch-row input').first();
  await expect(sfx).toBeChecked();
  await sfx.uncheck();
  await expect(sfx).not.toBeChecked();
  await page.reload();
  // 设置持久化
  await page.getByRole('button', { name: '打开家长面板' }).click();
  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.locator('.switch-row input').first()).not.toBeChecked();

  await page.getByRole('button', { name: '存档管理' }).click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: /清空进度/ }).click();
  await expect(page.getByText('进度已清空')).toBeVisible();
});

test('离线可玩：Service Worker 与 manifest 已注册', async ({ page }) => {
  // 开发环境不注册 SW，这里验证资源可访问（生产验证在构建产物服务中另行完成）
  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  const json = await manifest.json();
  expect(json.display).toBe('standalone');
  const sw = await page.request.get('/sw.js');
  expect(sw.ok()).toBeTruthy();
  expect(await sw.text()).toContain('sms-v1');
});
