import type { FeedbackInfo, QuestionView } from './gameStateMachine';
import { LevelSession as Session } from './gameStateMachine';
import { loadProfile, saveProfile, type StorageLike } from './saveRepository';
import { applyLevelReward, type LevelReward } from './rewardService';
import { CHAPTER_LEVEL_COUNT } from '../domain/levels';
import { applyResults, weakTypes } from '../domain/errorBook';
import { collectCard, refreshPets } from '../domain/collection';
import { seededRng } from '../domain/rng';
import type { LevelConfig, PlayerProfile, Settings } from '../domain/types';
import { createDefaultProfile } from './saveRepository';

/** 应用状态：星图 / 飞行战斗 / 结算 */
export type AppView = 'map' | 'flying' | 'result';

export interface LevelOutcome {
  levelId: string;
  stars: number;
  accuracy: number;
  correct: number;
  total: number;
  bestCombo: number;
  totalTimeMs: number;
  reward: LevelReward;
  healedIds: string[];
  weak: string[];
  newCards: string[];
  newPets: string[];
}

interface SessionBundle {
  session: Session;
  level: LevelConfig;
}

/**
 * 应用控制器：持有档案与当前关卡会话，负责存档、结算与视图切换。
 * UI 只订阅变化，不直接操作领域对象。
 */
export class AppController {
  profile: PlayerProfile;
  view: AppView = 'map';
  activeLevel: LevelConfig | null = null;
  session: Session | null = null;
  lastOutcome: LevelOutcome | null = null;
  feedback: FeedbackInfo | null = null;
  hints: string[] = [];
  private readonly storage: StorageLike | null;
  private readonly now: () => number;
  private readonly seed: () => number;
  private bundle: SessionBundle | null = null;
  private listeners = new Set<() => void>();

  constructor(storage: StorageLike | null, now: () => number = Date.now, seed: () => number = Math.random) {
    this.storage = storage;
    this.now = now;
    this.seed = seed;
    this.profile = loadProfile(storage);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  private persist(): void {
    if (this.storage) saveProfile(this.storage, this.profile);
  }

  isLevelUnlocked(levelId: string): boolean {
    return this.profile.unlockedLevels.includes(levelId);
  }

  starsOf(levelId: string): number {
    return this.profile.starsByLevel[levelId] ?? 0;
  }

  /** 进入关卡：创建会话并生成题目 */
  startLevel(level: LevelConfig): QuestionView {
    if (!this.isLevelUnlocked(level.id)) throw new Error(`关卡未解锁: ${level.id}`);
    // 用随机种子生成题目，保证每次重玩题目不同
    const rng = seededRng(Math.floor(this.seed() * 0xffffffff) >>> 0);
    const session = new Session(level, rng, this.now);
    const first = session.start();
    this.bundle = { session, level };
    this.session = session;
    this.activeLevel = level;
    this.view = 'flying';
    this.feedback = null;
    this.hints = [];
    this.lastOutcome = null;
    this.notify();
    return first;
  }

  currentQuestion(): QuestionView | null {
    return this.session?.currentQuestion() ?? null;
  }

  requestHint(): string | null {
    const text = this.session?.useHint() ?? null;
    if (text) {
      this.hints.push(text);
      this.notify();
    }
    return text;
  }

  submitAnswer(value: number): FeedbackInfo {
    if (!this.session || !this.bundle) throw new Error('没有进行中的关卡');
    const feedback = this.session.answer(value);
    this.feedback = feedback;
    this.notify();
    return feedback;
  }

  /** 反馈确认后：前进到下一题或结算并存档 */
  advance(): boolean {
    if (!this.session || !this.bundle) throw new Error('没有进行中的关卡');
    const next = this.session.advance();
    if (next) {
      this.feedback = null;
      this.hints = [];
      this.notify();
      return true;
    }
    this.finishLevel();
    return false;
  }

  private finishLevel(): void {
    if (!this.session || !this.bundle) return;
    const raw = this.session.result();
    const { session, level } = this.bundle;
    const healedIds = applyResults(
      this.profile, raw.results, session.questionMap(), this.now(),
    );
    const reward = applyLevelReward(this.profile, raw, CHAPTER_LEVEL_COUNT);
    // 图鉴收集：每种题型首次答对点亮卡片
    const newCards: string[] = [];
    for (const r of raw.results) {
      if (r.correct) {
        const card = collectCard(this.profile, r.type);
        if (card) newCards.push(card);
      }
    }
    // 宠物按累计星星解锁
    const newPets = refreshPets(this.profile);
    // 每日答题计数
    const today = new Date(this.now()).toISOString().slice(0, 10);
    if (this.profile.daily.date !== today) {
      this.profile.daily = { date: today, answered: 0 };
    }
    this.profile.daily.answered += raw.total;
    this.persist();

    this.lastOutcome = {
      levelId: level.id,
      stars: raw.stars,
      accuracy: raw.accuracy,
      correct: raw.results.filter(r => r.correct).length,
      total: raw.total,
      bestCombo: raw.bestCombo,
      totalTimeMs: raw.totalTimeMs,
      reward,
      healedIds,
      weak: weakTypes(this.profile),
      newCards,
      newPets,
    };
    this.view = 'result';
    this.notify();
  }

  /** 回到星图 */
  goMap(): void {
    this.view = 'map';
    this.session = null;
    this.bundle = null;
    this.activeLevel = null;
    this.feedback = null;
    this.hints = [];
    this.notify();
  }

  /** 重玩当前关卡（必须先回星图重新进入） */
  replay(): void {
    if (!this.activeLevel) return;
    const level = this.activeLevel;
    this.goMap();
    this.startLevel(level);
  }

  /** 更新设置并持久化 */
  updateSettings(patch: Partial<Settings>): void {
    this.profile.settings = { ...this.profile.settings, ...patch };
    this.persist();
    this.notify();
  }

  /** 导入/替换档案（家长面板） */
  replaceProfile(profile: PlayerProfile): void {
    this.profile = profile;
    this.persist();
    this.goMap();
  }

  /** 清空所有进度 */
  resetProfile(): void {
    this.profile = createDefaultProfile(this.now());
    this.persist();
    this.goMap();
  }
}
