import { describe, it, expect, vi } from 'vitest';
import { AppController } from './appController';
import { SAVE_KEY, type StorageLike } from './saveRepository';
import { getLevel } from '../domain/levels';

function makeStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

/** 自动答完一关：全对或按对错数组 */
function playOut(c: AppController, answers?: boolean[]): void {
  c.startLevel(getLevel('1-1')!);
  for (let i = 0; i < 8; i++) {
    const q = c.currentQuestion()!;
    const correct = answers ? answers[i] : true;
    c.submitAnswer(correct ? q.question.answer : q.question.answer + 1);
    c.advance();
  }
}

describe('应用控制器', () => {
  it('初始视图为星图，仅 1-1 解锁', () => {
    const c = new AppController(makeStorage());
    expect(c.view).toBe('map');
    expect(c.isLevelUnlocked('1-1')).toBe(true);
    expect(c.isLevelUnlocked('1-2')).toBe(false);
    expect(c.currentQuestion()).toBeNull();
  });

  it('进入关卡生成 8 题，提示累积，作答与反馈', () => {
    const c = new AppController(makeStorage(), () => 1000, () => 0.5);
    const first = c.startLevel(getLevel('1-1')!);
    expect(c.view).toBe('flying');
    expect(first.total).toBe(8);
    expect(c.requestHint()).toContain('个十');
    expect(c.hints.length).toBe(1);
    const f = c.submitAnswer(first.question.answer);
    expect(f.correct).toBe(true);
    expect(c.advance()).toBe(true);
    expect(c.hints).toEqual([]);
  });

  it('全对结算：三星、解锁下一关、存档写入', () => {
    const storage = makeStorage();
    const c = new AppController(storage, () => 1000, () => 0.5);
    playOut(c);
    expect(c.view).toBe('result');
    expect(c.lastOutcome?.stars).toBe(3);
    expect(c.lastOutcome?.correct).toBe(8);
    expect(c.lastOutcome?.reward.unlocked).toBe('1-2');
    expect(c.isLevelUnlocked('1-2')).toBe(true);
    expect(storage.getItem(SAVE_KEY)).toContain('1-2');
  });

  it('结算点亮图鉴并按星星解锁宠物', () => {
    const c = new AppController(makeStorage(), () => 1000, () => 0.5);
    playOut(c);
    expect(c.lastOutcome?.newCards).toContain('addTens');
    expect(c.profile.collectedCards).toContain('addTens');
    // 首关三星共 3 星，解锁 0 星宠物「滴滴」
    expect(c.lastOutcome?.newPets).toContain('blob');
  });

  it('全错结算：一星、错题记录进档案', () => {
    const c = new AppController(makeStorage(), () => 1000, () => 0.5);
    playOut(c, Array(8).fill(false));
    expect(c.lastOutcome?.stars).toBe(1);
    expect(Object.keys(c.profile.errorBook).length).toBe(8);
    expect(c.lastOutcome?.weak.length).toBeGreaterThan(0);
  });

  it('未解锁关卡不能进入', () => {
    const c = new AppController(makeStorage());
    expect(() => c.startLevel(getLevel('3-1')!)).toThrow('关卡未解锁');
  });

  it('订阅通知在状态变化时触发', () => {
    const c = new AppController(makeStorage());
    const listener = vi.fn();
    c.subscribe(listener);
    c.startLevel(getLevel('1-1')!);
    expect(listener).toHaveBeenCalled();
  });

  it('结算解锁的关卡立刻可进入', () => {
    const c = new AppController(makeStorage(), () => 1000, () => 0.5);
    playOut(c);
    expect(c.isLevelUnlocked('1-2')).toBe(true);
    const next = c.startLevel(getLevel('1-2')!);
    expect(next.total).toBe(8);
  });
});
