import type { PlayerProfile, QuestionResult, QuestionType } from './types';
import { ALL_QUESTION_TYPES } from './types';
import { typeAccuracy } from './scoring';
import { getLevel } from './levels';
import { weakTypes } from './errorBook';

export interface TypeMastery {
  type: QuestionType;
  accuracy: number;  // 0..1
  total: number;
}

export interface LearningReport {
  totalStars: number;
  completedLevels: number;
  totalAnswered: number;
  overallAccuracy: number;
  averageTimeMs: number;
  bestCombo: number;
  weakTypes: QuestionType[];
  mastery: TypeMastery[];
  recentResults: QuestionResult[];
  dailyAnswered: number;
}

/** 从档案与可选的当前会话结果生成学习报告（家长面板数据层） */
export function buildReport(profile: PlayerProfile, recentResults: QuestionResult[] = []): LearningReport {
  const all: QuestionResult[] = [...recentResults];
  // 使用题型统计聚合（statsByType 在每次结算时更新）
  const mastery: TypeMastery[] = ALL_QUESTION_TYPES.map(type => {
    const stat = profile.statsByType[type];
    return {
      type,
      accuracy: stat && stat.total > 0 ? stat.correct / stat.total : 0,
      total: stat?.total ?? 0,
    };
  });
  const practiced = mastery.filter(m => m.total > 0);
  const totalAnswered = practiced.reduce((s, m) => s + m.total, 0);
  const totalCorrect = practiced.reduce((s, m) => s + m.accuracy * m.total, 0);
  const overallAccuracy = totalAnswered > 0 ? totalCorrect / totalAnswered : 0;
  const averageTimeMs = all.length > 0
    ? all.reduce((s, r) => s + r.timeMs, 0) / all.length
    : 0;

  return {
    totalStars: profile.totalStars,
    completedLevels: Object.values(profile.starsByLevel).filter(s => s > 0).length,
    totalAnswered,
    overallAccuracy,
    averageTimeMs,
    bestCombo: 0,
    weakTypes: weakTypes(profile),
    mastery,
    recentResults: all,
    dailyAnswered: profile.daily.answered,
  };
}

/** 雷达图数据：题型掌握度（0..100），未练习题型给 0 */
export function radarData(report: LearningReport): Array<{ type: QuestionType; value: number }> {
  return report.mastery.map(m => ({ type: m.type, value: Math.round(m.accuracy * 100) }));
}

/** 生成文字周报，便于家长快速阅读 */
export function reportSummary(report: LearningReport): string {
  const pct = Math.round(report.overallAccuracy * 100);
  const weak = report.weakTypes.length > 0
    ? `建议重点练习：${report.weakTypes.join('、')}。`
    : '各题型掌握均匀，继续保持！';
  const seconds = Math.round(report.averageTimeMs / 1000);
  return `已完成 ${report.completedLevels} 关，累计 ${report.totalStars} 颗星；共练习 ${report.totalAnswered} 题，正确率 ${pct}%，平均每题 ${seconds} 秒。${weak}`;
}

/** 校验关卡 id 是否存在（供自定义题单/家长面板扩展） */
export function isValidLevelId(id: string): boolean {
  return getLevel(id) !== undefined;
}

/** 题型正确率（复用 scoring，供报告面板逐项显示） */
export { typeAccuracy };
