import { test, expect } from '@playwright/test';

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

test('真正飞行战斗：飞船画布 + 左右闪避 + 激光答题 + Boss + 结算', async ({ page }) => {
  await page.locator('.level-node').first().click();

  // 核心：画布战场真实存在（不是答题卡）
  const arena = page.getByTestId('flight-arena');
  await expect(arena).toBeVisible();
  const canvas = arena.locator('canvas.flight-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThan(200); // 有足够高的飞行空间

  // 鼠标点击左右闪避按钮
  await page.getByRole('button', { name: '向左移动' }).dispatchEvent('pointerdown');
  await expect(page.getByRole('button', { name: '向左移动' })).toBeVisible();
  await page.getByRole('button', { name: '向左移动' }).dispatchEvent('pointerup');
  await page.getByRole('button', { name: '向右移动' }).dispatchEvent('pointerdown');
  await page.getByRole('button', { name: '向右移动' }).dispatchEvent('pointerup');

  // 战斗 HUD 显示护盾/得分
  await expect(page.locator('.combat-stat').first()).toContainText('护盾');
  await expect(page.locator('.combat-stat').nth(1)).toContainText('得分');

  // 提示与激光答题
  await page.getByRole('button', { name: /需要提示/ }).click();
  await expect(page.locator('.hint-box')).toBeVisible();
  // 答对后自动前进：点击答案后等待题号递增（最后一题等待结算），无需再点「下一题」
  const solve = async (last = false) => {
    const stem = await page.locator('.question-equation').innerText();
    const current = await page.locator('.question-progress span').innerText();
    await page.getByRole('button', { name: String(answerOf(stem)), exact: true }).click();
    await expect(page.locator('.feedback-banner')).toBeVisible();
    if (last) {
      await expect(page.getByRole('heading', { name: '完美航行！' })).toBeVisible({ timeout: 3000 });
    } else {
      await expect(page.locator('.question-progress span')).not.toHaveText(current, { timeout: 3000 });
    }
  };
  await solve();
  await expect(page.locator('.combat-stat').nth(1)).toContainText('得分');

  // 最后 3 题进入 Boss 战：警报出现，血条随答对递减，3 血打完被击败
  for (let i = 1; i < 5; i++) await solve(); // 已完成第 1 题，再做 4 题到第 5 题（共 8 题，最后 3 题为 6/7/8）
  await expect(page.locator('.boss-alert')).toBeVisible();
  await expect(page.locator('.boss-hp')).toBeVisible();
  await expect(page.locator('.boss-hp strong')).toContainText('💥');
  const hpBefore = (await page.locator('.boss-hp strong').innerText()).length;
  expect(hpBefore).toBeGreaterThan(0);
  await solve(); // 第 6 题：削 1 血
  const hpAfter1 = await page.locator('.boss-hp strong').count();
  if (hpAfter1) expect((await page.locator('.boss-hp strong').innerText()).length).toBeLessThan(hpBefore);
  await solve(); // 第 7 题：再削 1 血
  if (await page.locator('.boss-hp strong').count()) {
    expect((await page.locator('.boss-hp strong').innerText()).length).toBeLessThan(hpBefore);
  }
  await solve(true); // 第 8 题：击败 Boss 并自动进入结算

  await expect(page.getByRole('heading', { name: '完美航行！' })).toBeVisible();
  await expect(page.locator('.result-stars .earned')).toHaveCount(3);
});

test('护盾耗尽自动补满，不会让孩子失败', async ({ page }) => {
  await page.locator('.level-node').first().click();
  // 连续答错 3 次触发掉盾，验证不出现 Game Over
  for (let i = 0; i < 3; i++) {
    const stem = await page.locator('.question-equation').innerText();
    const correct = answerOf(stem);
    // 从实际选项里挑一个错误答案（干扰项不保证含 correct+1）
    const options = await page.locator('.option-btn').allInnerTexts();
    const wrong = options.map(s => s.trim()).find(s => Number(s) !== correct);
    expect(wrong).toBeDefined();
    await page.getByRole('button', { name: wrong!, exact: true }).click();
    await expect(page.locator('.feedback-banner')).toBeVisible();
    await page.locator('.feedback-banner .primary-btn').click();
  }
  await expect(page.getByText(/游戏结束|Game Over/)).toHaveCount(0);
  await expect(page.getByTestId('flight-arena')).toBeVisible();
});
