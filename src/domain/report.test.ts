import { describe, it, expect } from 'vitest';
import { buildReport, radarData, reportSummary, isValidLevelId, typeAccuracy } from './report';
import { createDefaultProfile } from '../application/saveRepository';
import type { QuestionResult } from './types';

const results: QuestionResult[] = Array.from({ length: 10 }, (_, i) => ({
  questionId: `q${i}`, type: i < 6 ? 'addCarry' : 'subBorrow',
  correct: i < 4, hintsUsed: 0, timeMs: 2000,
}));

describe('学习报告', () => {
  it('从档案统计构建报告', () => {
    const p = createDefaultProfile();
    p.statsByType = {
      addCarry: { correct: 7, total: 10 },
      subBorrow: { correct: 3, total: 10 },
    };
    p.starsByLevel = { '1-1': 3, '1-2': 2 };
    const r = buildReport(p, results);
    expect(r.totalAnswered).toBe(20);
    expect(r.overallAccuracy).toBeCloseTo(0.5);
    expect(r.completedLevels).toBe(2);
    expect(r.averageTimeMs).toBe(2000);
    expect(r.weakTypes).toContain('subBorrow');
  });

  it('雷达图数据 0..100', () => {
    const p = createDefaultProfile();
    p.statsByType = { addCarry: { correct: 8, total: 10 } };
    const radar = radarData(buildReport(p));
    expect(radar).toHaveLength(8);
    expect(radar.find(x => x.type === 'addCarry')?.value).toBe(80);
    expect(radar.find(x => x.type === 'word')?.value).toBe(0);
  });

  it('文字周报包含关键数据', () => {
    const p = createDefaultProfile();
    p.statsByType = { addCarry: { correct: 9, total: 10 } };
    p.starsByLevel = { '1-1': 3 };
    const summary = reportSummary(buildReport(p));
    expect(summary).toContain('1 关');
    expect(summary).toContain('90%');
  });

  it('关卡 id 校验', () => {
    expect(isValidLevelId('1-1')).toBe(true);
    expect(isValidLevelId('9-9')).toBe(false);
  });

  it('题型正确率复用 scoring 逻辑', () => {
    expect(typeAccuracy(results, 'addCarry')).toBeCloseTo(4 / 6);
    expect(typeAccuracy(results, 'word')).toBeNull();
  });
});
