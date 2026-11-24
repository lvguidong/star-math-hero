import { describe, it, expect } from 'vitest';
import { LevelSession } from './gameStateMachine';
import { seededRng } from '../domain/rng';
import { rateLevel } from '../domain/scoring';
import type { LevelConfig } from '../domain/types';

const config: LevelConfig = {
  id: '1-1', chapter: 1, title: '启航星港', types: ['addTens'],
  questionCount: 10, difficulty: 1,
};

function playedSession(answers: Array<'correct' | 'wrong' | 'hint'>): LevelSession {
  let clock = 0;
  const s = new LevelSession(config, seededRng(42), () => clock);
  s.start();
  for (const a of answers) {
    if (a === 'hint') { s.useHint(); s.useHint(); }
    const q = s.currentQuestion()!.question;
    s.answer(a === 'wrong' ? q.answer + 1 : q.answer);
    s.advance();
  }
  return s;
}

describe('关卡状态机', () => {
  it('状态流转：idle → question → feedback → question → level-complete', () => {
    const s = new LevelSession(config, seededRng(1));
    expect(s.phase).toBe('idle');
    s.start();
    expect(s.phase).toBe('question');
    const q = s.currentQuestion()!;
    expect(q.index).toBe(0);
    expect(q.total).toBe(10);
    s.answer(q.question.answer);
    expect(s.phase).toBe('feedback');
    s.advance();
    expect(s.phase).toBe('question');
    expect(s.currentQuestion()!.index).toBe(1);
  });

  it('反馈含答案/提示/是否最后一题', () => {
    const s = new LevelSession(config, seededRng(2));
    s.start();
    const q = s.currentQuestion()!;
    s.useHint();
    const f = s.answer(q.question.answer + 1);
    expect(f.correct).toBe(false);
    expect(f.answer).toBe(q.question.answer);
    expect(f.hints.length).toBe(1);
    expect(f.isLast).toBe(false);
  });

  it('提示最多 3 级', () => {
    const s = new LevelSession(config, seededRng(3));
    s.start();
    expect(s.useHint()).not.toBeNull();
    expect(s.useHint()).not.toBeNull();
    expect(s.useHint()).not.toBeNull();
    expect(s.useHint()).toBeNull();
  });

  it('连击与最佳连击', () => {
    const s = playedSession(['correct', 'correct', 'wrong', 'correct']);
    expect(s.getBestCombo()).toBe(2);
  });

  it('全部答对 → 三星结算，含 bestCombo', () => {
    const s = playedSession(Array(10).fill('correct'));
    expect(s.phase).toBe('level-complete');
    const r = s.result();
    expect(r.stars).toBe(3);
    expect(r.bestCombo).toBe(10);
    expect(r.total).toBe(10);
  });

  it('连错 3 题触发难度下降', () => {
    const s = new LevelSession({ ...config, difficulty: 3 }, seededRng(4));
    s.start();
    let changed = false;
    for (let i = 0; i < 3; i++) {
      const q = s.currentQuestion()!;
      const f = s.answer(q.question.answer + 1);
      if (f.difficultyChanged) changed = true;
      s.advance();
    }
    expect(changed).toBe(true);
  });

  it('未结束/非法阶段调用 result 或 answer 抛错', () => {
    const s = new LevelSession(config, seededRng(5));
    expect(() => s.result()).toThrow();
    s.start();
    s.answer(0);
    expect(() => s.answer(1)).toThrow();
  });

  it('questionMap 供错题本使用', () => {
    const s = new LevelSession(config, seededRng(6));
    s.start();
    const map = s.questionMap();
    expect(Object.keys(map).length).toBe(10);
    expect(map[s.currentQuestion()!.question.id]).toBeDefined();
  });

  it('计分一致：10 题对 7 题 → 2 星', () => {
    const results = Array.from({ length: 10 }, (_, i) => ({
      questionId: `q${i}`, type: 'addTens' as const, correct: i < 7, hintsUsed: 0, timeMs: 1000,
    }));
    expect(rateLevel('1-1', results).stars).toBe(2);
  });
});
