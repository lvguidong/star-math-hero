import type { LevelResult, QuestionResult } from './types';

/** 三星评价：正确率 ≥90% 得 3 星，≥70% 得 2 星，否则 1 星（通关保底 1 星） */
export function rateLevel(levelId: string, results: QuestionResult[]): LevelResult {
  const total = results.length;
  if (total === 0) {
    return { levelId, accuracy: 0, stars: 1, totalTimeMs: 0, results };
  }
  const correct = results.filter(r => r.correct).length;
  const accuracy = correct / total;
  const stars: 1 | 2 | 3 = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
  const totalTimeMs = results.reduce((s, r) => s + r.timeMs, 0);
  return { levelId, accuracy, stars, totalTimeMs, results };
}

/** 某题型的正确率；无记录返回 null */
export function typeAccuracy(results: QuestionResult[], type: QuestionResult['type']): number | null {
  const subset = results.filter(r => r.type === type);
  if (subset.length === 0) return null;
  return subset.filter(r => r.correct).length / subset.length;
}
