import { describe, it, expect } from 'vitest';
import { rateLevel, typeAccuracy } from './scoring';
import type { QuestionResult, QuestionType } from './types';

function results(states: boolean[], type: QuestionType = 'addCarry'): QuestionResult[] {
  return states.map((correct, i) => ({
    questionId: `q${i}`, type, correct, hintsUsed: 0, timeMs: 1000,
  }));
}

describe('三星评价', () => {
  it('10/10 正确 → 3 星，正确率 1', () => {
    const r = rateLevel('1-1', results(Array(10).fill(true)));
    expect(r.stars).toBe(3);
    expect(r.accuracy).toBe(1);
    expect(r.totalTimeMs).toBe(10000);
  });

  it('9/10 正确 → 3 星（≥90%）', () => {
    expect(rateLevel('1-1', results([...Array(9).fill(true), false])).stars).toBe(3);
  });

  it('7/10 正确 → 2 星（≥70%）', () => {
    expect(rateLevel('1-1', results([...Array(7).fill(true), ...Array(3).fill(false)])).stars).toBe(2);
  });

  it('3/10 正确 → 1 星（通关保底）', () => {
    const r = rateLevel('1-1', results([true, true, true, ...Array(7).fill(false)]));
    expect(r.stars).toBe(1);
  });

  it('空结果 → 1 星（不崩）', () => {
    const r = rateLevel('1-1', []);
    expect(r.stars).toBe(1);
    expect(r.accuracy).toBe(0);
  });
});

describe('题型正确率统计', () => {
  it('正确统计指定题型', () => {
    const all = [
      ...results([true, false, true], 'addCarry'),
      ...results([false, false], 'subBorrow'),
    ];
    expect(typeAccuracy(all, 'addCarry')).toBeCloseTo(2 / 3);
    expect(typeAccuracy(all, 'subBorrow')).toBe(0);
    expect(typeAccuracy(all, 'word')).toBeNull();
  });
});
