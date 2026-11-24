import { describe, it, expect } from 'vitest';
import {
  generateQuestion, generateLevel, GenerationError,
} from './questionGenerator';
import { seededRng } from './rng';
import { ALL_QUESTION_TYPES, type Difficulty } from './types';

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5];

describe('题目生成器不变量（M1 核心验收）', () => {
  for (const type of ALL_QUESTION_TYPES) {
    describe(`题型 ${type}`, () => {
      it.each(DIFFICULTIES)('难度 %i：生成 1000 题全部满足不变量', (difficulty) => {
        const rng = seededRng(12345 + difficulty * 1000 + type.length);
        for (let i = 0; i < 1000; i++) {
          const q = generateQuestion(type, rng, 3, difficulty, i);
          // 答案合法
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThanOrEqual(100);
          // 选项合法
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options).size).toBe(4);
          expect(q.options).toContain(q.answer);
          for (const o of q.options) {
            expect(Number.isInteger(o)).toBe(true);
            expect(o).toBeGreaterThanOrEqual(0);
            expect(o).toBeLessThanOrEqual(100);
          }
          // 提示完整
          expect(q.hintSteps).toHaveLength(3);
          expect(q.hintSteps.every(h => typeof h === 'string' && h.length > 0)).toBe(true);
          // 元数据
          expect(q.type).toBe(type);
          expect(q.difficulty).toBe(difficulty);
          expect(q.id).toBe(`${type}-${i}`);
          expect(q.stem.length).toBeGreaterThan(0);
        }
      });
    });
  }

  it('进位加法：个位和必定 ≥10 且结果 ≤100（验证 500 题）', () => {
    const rng = seededRng(777);
    for (let i = 0; i < 500; i++) {
      const q = generateQuestion('addCarry', rng, 3, 5, i);
      const m = q.stem.match(/^(\d+) \+ (\d+) = \?$/);
      expect(m).not.toBeNull();
      const a = Number(m![1]); const b = Number(m![2]);
      expect(a).toBeGreaterThanOrEqual(10);
      expect(b).toBeGreaterThanOrEqual(10);
      expect(a % 10 + b % 10).toBeGreaterThanOrEqual(10);
      expect(a + b).toBe(q.answer);
      expect(a + b).toBeLessThanOrEqual(100);
      // 进位错误干扰项应存在（忘记进位的结果 ≠ 正确答案）
      expect(q.options.some(o => o !== q.answer)).toBe(true);
    }
  });

  it('退位减法：个位必定不够减且结果非负（验证 500 题）', () => {
    const rng = seededRng(888);
    for (let i = 0; i < 500; i++) {
      const q = generateQuestion('subBorrow', rng, 4, 5, i);
      const m = q.stem.match(/^(\d+) - (\d+) = \?$/);
      expect(m).not.toBeNull();
      const a = Number(m![1]); const b = Number(m![2]);
      expect(a).toBeGreaterThanOrEqual(21);
      expect(b).toBeGreaterThanOrEqual(10);
      expect(a % 10).toBeLessThan(b % 10);
      expect(a - b).toBe(q.answer);
      expect(q.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it('不进位加法：个位和必定 <10', () => {
    const rng = seededRng(999);
    for (let i = 0; i < 500; i++) {
      const q = generateQuestion('add1NoCarry', rng, 2, 4, i);
      const m = q.stem.match(/^(\d+) \+ (\d+) = \?$/);
      const a = Number(m![1]); const b = Number(m![2]);
      expect(a % 10 + b).toBeLessThan(10);
      expect(a + b).toBe(q.answer);
    }
  });

  it('不退位减法：个位必定够减', () => {
    const rng = seededRng(1010);
    for (let i = 0; i < 500; i++) {
      const q = generateQuestion('sub1NoBorrow', rng, 2, 4, i);
      const m = q.stem.match(/^(\d+) - (\d+) = \?$/);
      const a = Number(m![1]); const b = Number(m![2]);
      expect(a % 10).toBeGreaterThanOrEqual(b);
      expect(a - b).toBe(q.answer);
    }
  });

  it('整十数加减：答案必定是整十且 ≤100', () => {
    const rng = seededRng(1212);
    for (let i = 0; i < 500; i++) {
      const q = generateQuestion('addTens', rng, 1, 4, i);
      expect(q.answer % 10).toBe(0);
      expect(q.answer).toBeLessThanOrEqual(100);
      expect(q.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it('比多少：答案 = 大数 - 小数', () => {
    const rng = seededRng(1313);
    for (let i = 0; i < 500; i++) {
      const q = generateQuestion('compare', rng, 5, 3, i);
      const m = q.stem.match(/^(\d+) 比 (\d+) 多多少？$/);
      const a = Number(m![1]); const b = Number(m![2]);
      expect(a).not.toBe(b);
      expect(Math.max(a, b) - Math.min(a, b)).toBe(q.answer);
    }
  });

  it('应用题：题干含答案，情境自然', () => {
    const rng = seededRng(1414);
    for (let i = 0; i < 500; i++) {
      const q = generateQuestion('word', rng, 5, 3, i);
      expect(q.context).toBeDefined();
      expect(q.context).toContain('格');
      expect(q.stem).toBe(q.context);
    }
  });

  it('连加连减：逐步计算结果与答案一致', () => {
    const rng = seededRng(1515);
    for (let i = 0; i < 500; i++) {
      const q = generateQuestion('chain', rng, 5, 3, i);
      const m = q.stem.match(/^(\d+) ([+-]) (\d+) ([+-]) (\d+) = \?$/);
      expect(m).not.toBeNull();
      const a = Number(m![1]); const op1 = m![2]; const b = Number(m![3]);
      const op2 = m![4]; const c = Number(m![5]);
      const mid = op1 === '+' ? a + b : a - b;
      const expected = op2 === '+' ? mid + c : mid - c;
      expect(expected).toBe(q.answer);
    }
  });
});

describe('关卡批量生成', () => {
  it('生成 10 题：id 唯一、分布均匀', () => {
    const rng = seededRng(2024);
    const qs = generateLevel(['addCarry', 'subBorrow'], 10, rng, 3, 4);
    expect(qs).toHaveLength(10);
    expect(new Set(qs.map(q => q.id)).size).toBe(10);
    expect(qs.filter(q => q.type === 'addCarry')).toHaveLength(5);
    expect(qs.filter(q => q.type === 'subBorrow')).toHaveLength(5);
  });

  it('空题型列表抛 GenerationError', () => {
    expect(() => generateLevel([], 5, seededRng(1), 1, 1)).toThrow(GenerationError);
  });

  it('相同种子生成结果完全一致（可复现）', () => {
    const a = generateLevel(ALL_QUESTION_TYPES, 12, seededRng(42), 3, 3);
    const b = generateLevel(ALL_QUESTION_TYPES, 12, seededRng(42), 3, 3);
    expect(a).toEqual(b);
  });
});
