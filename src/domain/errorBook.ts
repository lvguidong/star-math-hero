import type { PlayerProfile, Question, QuestionResult, QuestionType } from './types';

/** 记录一次错题；同题再次错则只刷新时间 */
export function addError(profile: PlayerProfile, question: Question, now: number): void {
  const existing = profile.errorBook[question.id];
  profile.errorBook[question.id] = {
    type: question.type,
    healCount: existing?.healCount ?? 0,
    lastSeen: now,
  };
}

/** 重练答对：累计 2 次治愈并移出错题本 */
export function healError(profile: PlayerProfile, questionId: string, now: number): boolean {
  const entry = profile.errorBook[questionId];
  if (!entry) return false;
  const healed = entry.healCount + 1 >= 2;
  if (healed) {
    delete profile.errorBook[questionId];
  } else {
    profile.errorBook[questionId] = { ...entry, healCount: entry.healCount + 1, lastSeen: now };
  }
  return healed;
}

/** 更新题型统计（答题时调用） */
export function updateTypeStat(profile: PlayerProfile, type: QuestionType, correct: boolean): void {
  const stat = profile.statsByType[type] ?? { correct: 0, total: 0 };
  stat.total += 1;
  if (correct) stat.correct += 1;
  profile.statsByType[type] = stat;
}

/** 薄弱题型：正确率 < 60% 且答题 ≥ 3 次 */
export function weakTypes(profile: PlayerProfile): QuestionType[] {
  return (Object.keys(profile.statsByType) as QuestionType[]).filter((t) => {
    const s = profile.statsByType[t];
    return s !== undefined && s.total >= 3 && s.correct / s.total < 0.6;
  });
}

/** 根据作答结果批量更新错题本与统计 */
export function applyResults(
  profile: PlayerProfile,
  results: readonly QuestionResult[],
  questionMap: Record<string, Question>,
  now: number,
): string[] {
  const healed: string[] = [];
  for (const r of results) {
    updateTypeStat(profile, r.type, r.correct);
    if (r.correct) {
      if (healError(profile, r.questionId, now)) healed.push(r.questionId);
    } else {
      const q = questionMap[r.questionId];
      if (q) addError(profile, q, now);
    }
  }
  return healed;
}
