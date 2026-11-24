import { describe, it, expect } from 'vitest';
import { getHints, toStickBundles, toNumberLine } from './hints';
import type { Question } from './types';

const q: Question = {
  id: 'x', type: 'addCarry', chapter: 3, stem: '38 + 7 = ?', answer: 45,
  options: [45, 35, 46, 44], hintSteps: ['提示1', '提示2', '提示3'], difficulty: 3,
};

describe('提示工具', () => {
  it('返回 3 级提示', () => {
    expect(getHints(q)).toEqual(['提示1', '提示2', '提示3']);
  });

  it('小棒拆分：47 → 4 捆 7 根，100 → 10 捆 0 根', () => {
    expect(toStickBundles(47)).toEqual({ tens: 4, ones: 7 });
    expect(toStickBundles(100)).toEqual({ tens: 10, ones: 0 });
    expect(toStickBundles(5)).toEqual({ tens: 0, ones: 5 });
  });

  it('数轴：从 3 跳到 7 → [3,4,5,6,7]；从 7 退到 3 → [7,6,5,4,3]', () => {
    expect(toNumberLine(3, 4, 7)).toEqual([3, 4, 5, 6, 7]);
    expect(toNumberLine(7, -4, 3)).toEqual([7, 6, 5, 4, 3]);
  });
});
