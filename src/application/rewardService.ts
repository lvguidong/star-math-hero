import type { LevelResult, PlayerProfile } from '../domain/types';

/** 关卡解锁规则：通关后解锁下一关 id（如 "1-1" → "1-2"） */
export function nextLevelId(levelId: string, chapterLevelCount: Record<number, number>): string | null {
  const [c, l] = levelId.split('-').map(Number);
  const count = chapterLevelCount[c] ?? 0;
  if (l < count) return `${c}-${l + 1}`;
  if (c < 6) return `${c + 1}-1`;
  return null;
}

export interface LevelReward {
  starsEarned: number;
  newAchievements: string[];
  unlocked: string | null;
}

/** 结算奖励：累加星星、记录关卡星数、解锁下一关、检查成就 */
export function applyLevelReward(
  profile: PlayerProfile,
  result: LevelResult,
  chapterLevelCount: Record<number, number>,
): LevelReward {
  const prevStars = profile.starsByLevel[result.levelId] ?? 0;
  const starsEarned = Math.max(0, result.stars - prevStars);
  profile.totalStars += starsEarned;
  profile.starsByLevel[result.levelId] = Math.max(prevStars, result.stars);

  const unlocked = nextLevelId(result.levelId, chapterLevelCount);
  if (unlocked && !profile.unlockedLevels.includes(unlocked)) {
    profile.unlockedLevels.push(unlocked);
  }

  const newAchievements: string[] = [];
  const grant = (name: string, condition: boolean) => {
    if (condition && !profile.achievements.includes(name)) {
      profile.achievements.push(name);
      newAchievements.push(name);
    }
  };
  grant('三星小勇士', result.stars === 3);
  grant('零失误船长', result.accuracy === 1);
  grant('星星收藏家', profile.totalStars >= 30);
  grant('银河探险家', profile.unlockedLevels.length >= 10);

  return { starsEarned, newAchievements, unlocked };
}

/** 连击加成：连对 n 题的趣味倍数（仅展示，不扣减） */
export function comboMultiplier(combo: number): number {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}
