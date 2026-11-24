import type {
  Difficulty, LevelConfig, Question, QuestionResult,
} from '../domain/types';
import { generateLevel } from '../domain/questionGenerator';
import { nextDifficulty, difficultyMessage } from '../domain/difficulty';
import { rateLevel } from '../domain/scoring';
import type { Rng } from '../domain/types';

export type Phase =
  | 'idle'
  | 'question'
  | 'feedback'
  | 'hint'
  | 'level-complete';

export interface QuestionView {
  question: Question;
  index: number;
  total: number;
  combo: number;
  difficulty: Difficulty;
}

export interface AnswerOutcome {
  correct: boolean;
  answer: number;
  hintStep: number; // 0=直接作答, 1..3=用了几级提示
}

export interface FeedbackInfo {
  correct: boolean;
  answer: number;
  hints: string[];
  difficultyChanged: string | null;
  isLast: boolean;
}

/**
 * 一关游戏的状态机（纯逻辑，可单测）。
 * 用法：start() → currentQuestion() → answer(...) 循环 → result()
 */
export class LevelSession {
  phase: Phase = 'idle';
  private questions: Question[];
  private index = 0;
  private results: QuestionResult[] = [];
  private difficulty: Difficulty;
  private combo = 0;
  private bestCombo = 0;
  private questionStartTime = 0;
  private hintStep = 0;
  private readonly config: LevelConfig;
  private readonly rng: Rng;
  private readonly now: () => number;

  constructor(config: LevelConfig, rng: Rng, now: () => number = Date.now) {
    this.config = config;
    this.rng = rng;
    this.now = now;
    this.difficulty = config.difficulty as Difficulty;
    this.questions = [];
  }

  start(): QuestionView {
    this.questions = generateLevel(
      this.config.types,
      this.config.questionCount,
      this.rng,
      this.config.chapter,
      this.difficulty,
    );
    this.index = 0;
    this.results = [];
    this.combo = 0;
    this.bestCombo = 0;
    this.phase = 'question';
    this.questionStartTime = this.now();
    this.hintStep = 0;
    return this.currentQuestion()!;
  }

  currentQuestion(): QuestionView | null {
    if (this.index >= this.questions.length) return null;
    return {
      question: this.questions[this.index],
      index: this.index,
      total: this.questions.length,
      combo: this.combo,
      difficulty: this.difficulty,
    };
  }

  /** 请求下一级提示，返回当前提示文案（最多 3 级） */
  useHint(): string | null {
    if (this.phase !== 'question' && this.phase !== 'hint') return null;
    if (this.hintStep >= 3) return null;
    this.phase = 'hint';
    const text = this.questions[this.index].hintSteps[this.hintStep];
    this.hintStep++;
    return text;
  }

  /** 作答并进入反馈阶段 */
  answer(value: number): FeedbackInfo {
    if (this.phase !== 'question' && this.phase !== 'hint') {
      throw new Error(`当前阶段不接受作答: ${this.phase}`);
    }
    const question = this.questions[this.index];
    const correct = value === question.answer;
    if (correct) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
    } else {
      this.combo = 0;
    }

    const prevDifficulty = this.difficulty;
    this.results.push({
      questionId: question.id,
      type: question.type,
      correct,
      hintsUsed: this.hintStep,
      timeMs: Math.max(0, this.now() - this.questionStartTime),
    });
    this.difficulty = nextDifficulty(this.results, this.difficulty);
    this.phase = 'feedback';

    return {
      correct,
      answer: question.answer,
      hints: question.hintSteps.slice(0, this.hintStep),
      difficultyChanged: difficultyMessage(prevDifficulty, this.difficulty),
      isLast: this.index >= this.questions.length - 1,
    };
  }

  /** 反馈确认后前进到下一题；最后一题则结算 */
  advance(): QuestionView | null {
    if (this.phase !== 'feedback') return null;
    this.index++;
    if (this.index >= this.questions.length) {
      this.phase = 'level-complete';
      return null;
    }
    this.phase = 'question';
    this.questionStartTime = this.now();
    this.hintStep = 0;
    return this.currentQuestion();
  }

  /** 获取题目映射（供错题本使用） */
  questionMap(): Record<string, Question> {
    return Object.fromEntries(this.questions.map(q => [q.id, q]));
  }

  /** 结算 */
  result() {
    if (this.phase !== 'level-complete') throw new Error('关卡尚未结束');
    return {
      ...rateLevel(this.config.id, this.results),
      bestCombo: this.bestCombo,
      total: this.results.length,
    };
  }

  getBestCombo(): number { return this.bestCombo; }
}
