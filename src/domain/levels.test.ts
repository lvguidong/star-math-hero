import { describe, it, expect } from 'vitest';
import { CHAPTERS, ALL_LEVELS, CHAPTER_LEVEL_COUNT, getLevel, getChapter, isChapterUnlocked } from './levels';
import { generateLevel } from './questionGenerator';
import { seededRng } from './rng';
import { ALL_QUESTION_TYPES } from './types';

describe('六章关卡目录', () => {
  it('6 章、每章 8~12 关、id 连续', () => {
    expect(CHAPTERS.length).toBe(6);
    for (const c of CHAPTERS) {
      expect(c.levels.length).toBeGreaterThanOrEqual(8);
      expect(c.levels.length).toBeLessThanOrEqual(12);
      expect(c.levels.map(l => l.id)).toEqual(
        c.levels.map((_, i) => `${c.id}-${i + 1}`),
      );
    }
    expect(ALL_LEVELS.length).toBe(56); // 8+8+10+10+10+10
  });

  it('每章关卡数登记一致', () => {
    for (const c of CHAPTERS) {
      expect(CHAPTER_LEVEL_COUNT[c.id]).toBe(c.levels.length);
    }
  });

  it('全部关卡都能实际生成题目（不抛错、不变量成立）', () => {
    for (const level of ALL_LEVELS) {
      const qs = generateLevel(level.types, level.questionCount, seededRng(42), level.chapter, level.difficulty as 1);
      expect(qs.length).toBe(level.questionCount);
      expect(new Set(qs.map(q => q.id)).size).toBe(qs.length);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThanOrEqual(100);
        expect(q.options).toHaveLength(4);
        expect(q.hintSteps).toHaveLength(3);
      }
    }
  });

  it('题型覆盖策划案全部 8 类', () => {
    const used = new Set(ALL_LEVELS.flatMap(l => l.types));
    expect([...used].sort()).toEqual([...ALL_QUESTION_TYPES].sort());
  });

  it('查询与章节解锁规则', () => {
    expect(getLevel('1-1')?.title).toBe('点火测试');
    expect(getChapter(6)?.title).toBe('数学黑洞');
    expect(getLevel('9-9')).toBeUndefined();
    expect(isChapterUnlocked(1, { starsByLevel: {} })).toBe(true);
    expect(isChapterUnlocked(2, { starsByLevel: {} })).toBe(false);
    const all = { starsByLevel: Object.fromEntries(CHAPTERS[0].levels.map(l => [l.id, 1])) };
    expect(isChapterUnlocked(2, all)).toBe(true);
    expect(isChapterUnlocked(6, all)).toBe(false);
  });
});
