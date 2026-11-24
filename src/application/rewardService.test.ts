import { describe, it, expect } from 'vitest';
import { nextLevelId, applyLevelReward, comboMultiplier } from './rewardService';
import { createDefaultProfile } from './saveRepository';
import type { LevelResult } from '../domain/types';

const counts: Record<number, number> = { 1: 8, 2: 8, 3: 10, 4: 10, 5: 10, 6: 10 };
const result = (id: string, stars: 1 | 2 | 3, accuracy = 1): LevelResult => ({
  levelId: id, accuracy, stars, totalTimeMs: 30000, results: [],
});

describe('奖励服务', () => {
  it('下一关 id：章内递增、跨章、通关返回 null', () => {
    expect(nextLevelId('1-1', counts)).toBe('1-2');
    expect(nextLevelId('1-8', counts)).toBe('2-1');
    expect(nextLevelId('6-10', counts)).toBeNull();
  });

  it('结算只累加新获得的星星', () => {
    const p = createDefaultProfile();
    const r1 = applyLevelReward(p, result('1-1', 2), counts);
    expect(r1.starsEarned).toBe(2);
    expect(p.totalStars).toBe(2);
    applyLevelReward(p, result('1-1', 1), counts); // 重玩更低星
    expect(p.totalStars).toBe(2);
    const r3 = applyLevelReward(p, result('1-1', 3), counts);
    expect(r3.starsEarned).toBe(1);
    expect(p.totalStars).toBe(3);
  });

  it('解锁下一关并发成就', () => {
    const p = createDefaultProfile();
    const r = applyLevelReward(p, result('1-1', 3), counts);
    expect(r.unlocked).toBe('1-2');
    expect(p.unlockedLevels).toContain('1-2');
    expect(r.newAchievements).toContain('三星小勇士');
    expect(r.newAchievements).toContain('零失误船长');
    // 重复结算不发成就
    const r2 = applyLevelReward(p, result('1-1', 3), counts);
    expect(r2.newAchievements).toEqual([]);
  });

  it('连击倍数阶梯', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(5)).toBe(2);
    expect(comboMultiplier(10)).toBe(3);
  });
});
