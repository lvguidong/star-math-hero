import { describe, it, expect } from 'vitest';
import { nextDifficulty, difficultyMessage } from './difficulty';
import type { QuestionResult } from './types';

const mk = (correct: boolean): QuestionResult => ({
  questionId: 'q', type: 'addCarry', correct, hintsUsed: 0, timeMs: 1000,
});

describe('自适应难度', () => {
  it('连错 3 题降 1 级', () => {
    expect(nextDifficulty([mk(false), mk(false), mk(false)], 4)).toBe(3);
  });
  it('连对 3 题升 1 级', () => {
    expect(nextDifficulty([mk(true), mk(true), mk(true)], 2)).toBe(3);
  });
  it('不足 3 连保持不变', () => {
    expect(nextDifficulty([mk(false), mk(false)], 3)).toBe(3);
    expect(nextDifficulty([mk(true), mk(true)], 3)).toBe(3);
  });
  it('难度锁定 1..5', () => {
    expect(nextDifficulty([mk(false), mk(false), mk(false)], 1)).toBe(1);
    expect(nextDifficulty([mk(true), mk(true), mk(true)], 5)).toBe(5);
  });
  it('难度台词', () => {
    expect(difficultyMessage(2, 3)).toContain('太棒');
    expect(difficultyMessage(3, 2)).toContain('别担心');
    expect(difficultyMessage(3, 3)).toBeNull();
  });
});
