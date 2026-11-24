/** 题型枚举（与策划案 4.3 题型样例库对应） */
export type QuestionType =
  | 'addTens'      // 整十数加减
  | 'add1NoCarry'  // 两位数 + 一位数（不进位）
  | 'sub1NoBorrow' // 两位数 - 一道数（不退位）
  | 'addCarry'     // 进位加法
  | 'subBorrow'    // 退位减法
  | 'chain'        // 连加连减
  | 'compare'      // 比多少
  | 'word';        // 文字应用题

export const ALL_QUESTION_TYPES: QuestionType[] = [
  'addTens', 'add1NoCarry', 'sub1NoBorrow', 'addCarry',
  'subBorrow', 'chain', 'compare', 'word',
];

/** 可注入的随机数源，返回 [0,1) */
export type Rng = () => number;

/** 一道题目 */
export interface Question {
  id: string;
  type: QuestionType;
  chapter: number;
  stem: string;
  context?: string;
  answer: number;
  options: number[];
  hintSteps: string[];
  difficulty: number;
}

/** 关卡配置 */
export interface LevelConfig {
  id: string;             // "3-2"
  chapter: number;
  title: string;
  questionCount: number;  // 8..12
  types: QuestionType[];
  difficulty: number;     // 1..5
  boss?: boolean;
}

/** 单题作答结果 */
export interface QuestionResult {
  questionId: string;
  type: QuestionType;
  correct: boolean;
  hintsUsed: number;
  timeMs: number;
}

/** 一关结算 */
export interface LevelResult {
  levelId: string;
  accuracy: number;
  stars: 1 | 2 | 3;
  totalTimeMs: number;
  results: QuestionResult[];
}

/** 难度等级 */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** 设置项 */
export interface Settings {
  voice: boolean;      // 语音朗读
  sfx: boolean;        // 音效
  music: boolean;      // 背景音乐
  fontSize: 'normal' | 'large';
  dailyMinutes: number; // 每日时长上限（0 = 不限）
  answerMode: 'choices' | 'input'; // 作答方式：四选一 / 手动填数字
}

/** 错题本中的一条记录 */
export interface ErrorEntry {
  type: QuestionType;
  healCount: number;   // 重练答对次数，达到 2 则治愈
  lastSeen: number;    // 时间戳
}

/** 题型统计 */
export interface TypeStat {
  correct: number;
  total: number;
}

/** 玩家档案（存档核心数据） */
export interface PlayerProfile {
  schemaVersion: number;
  totalStars: number;
  unlockedLevels: string[];
  starsByLevel: Record<string, number>;
  pets: string[];
  collectedCards: string[];
  achievements: string[];
  errorBook: Record<string, ErrorEntry>;
  statsByType: Partial<Record<QuestionType, TypeStat>>;
  settings: Settings;
  daily: { date: string; answered: number };
}

/** 连击状态 */
export interface ComboState {
  count: number;
  best: number;
}
