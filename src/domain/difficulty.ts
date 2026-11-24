import type { Difficulty, QuestionResult } from './types';

/** 统计末尾连续 correct 或 incorrect 的个数 */
function trailingStreak(results: readonly QuestionResult[], correct: boolean): number {
  let n = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i].correct === correct) n++;
    else break;
  }
  return n;
}

/**
 * 自适应难度：连错 ≥3 降 1 级；连对 ≥3 升 1 级；否则不变。
 * 范围锁定在 1..5。
 */
export function nextDifficulty(history: readonly QuestionResult[], current: Difficulty): Difficulty {
  const wrong = trailingStreak(history, false);
  const right = trailingStreak(history, true);
  if (wrong >= 3) return Math.max(1, current - 1) as Difficulty;
  if (right >= 3) return Math.min(5, current + 1) as Difficulty;
  return current;
}

/** 嘀嗒难度变化台词 */
export function difficultyMessage(before: Difficulty, after: Difficulty): string | null {
  if (after > before) return '太棒了！我们试试更有趣的新题目！';
  if (after < before) return '别担心，我们换个简单的热热身！';
  return null;
}
