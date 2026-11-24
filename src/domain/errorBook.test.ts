import { describe, it, expect } from 'vitest';
import { addError, healError, updateTypeStat, weakTypes, applyResults } from './errorBook';
import { createDefaultProfile } from '../application/saveRepository';
import type { Question } from './types';

const q: Question = {
  id: 'q1', type: 'addCarry', chapter: 3, stem: '8+7', answer: 15,
  options: [15, 14, 16, 13], hintSteps: ['a', 'b', 'c'], difficulty: 3,
};

describe('错题本', () => {
  it('错题记录与治愈（2 次答对移出）', () => {
    const p = createDefaultProfile();
    addError(p, q, 100);
    expect(p.errorBook.q1.type).toBe('addCarry');
    expect(healError(p, 'q1', 200)).toBe(false);
    expect(p.errorBook.q1.healCount).toBe(1);
    expect(healError(p, 'q1', 300)).toBe(true);
    expect(p.errorBook.q1).toBeUndefined();
  });

  it('同题重复错只刷新时间不累积', () => {
    const p = createDefaultProfile();
    addError(p, q, 100);
    addError(p, q, 200);
    expect(p.errorBook.q1.lastSeen).toBe(200);
  });

  it('薄弱题型：正确率 <60% 且 ≥3 次', () => {
    const p = createDefaultProfile();
    updateTypeStat(p, 'addCarry', false);
    updateTypeStat(p, 'addCarry', false);
    expect(weakTypes(p)).toEqual([]);           // 不足 3 题
    updateTypeStat(p, 'addCarry', false);
    expect(weakTypes(p)).toEqual(['addCarry']); // 0/3 = 0%
    updateTypeStat(p, 'addCarry', true);
    updateTypeStat(p, 'addCarry', true);
    expect(weakTypes(p)).toEqual(['addCarry']); // 2/5 = 40% 仍弱
    updateTypeStat(p, 'addCarry', true);
    updateTypeStat(p, 'addCarry', true);
    updateTypeStat(p, 'addCarry', true);
    expect(weakTypes(p)).toEqual([]);           // 5/8 = 62.5% 脱离薄弱
  });

  it('批量应用作答结果并收集治愈 id', () => {
    const p = createDefaultProfile();
    addError(p, q, 100);
    p.errorBook.q1.healCount = 1;
    const healed = applyResults(p, [
      { questionId: 'q1', type: 'addCarry', correct: true, hintsUsed: 0, timeMs: 100 },
    ], { q1: q }, 400);
    expect(healed).toEqual(['q1']);
  });
});
