import type { Difficulty, Question, QuestionType, Rng } from './types';
import { randInt } from './rng';
import { buildOptions } from './distractors';

/** 生成失败时抛出的错误（约束无解或参数非法） */
export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationError';
  }
}

interface GenParams {
  rng: Rng;
  type: QuestionType;
  chapter: number;
  difficulty: Difficulty;
  id: string;
}

function makeQuestion(
  p: GenParams,
  stem: string,
  answer: number,
  hintSteps: string[],
  opts: { context?: string; carryWrong?: number; borrowWrong?: number; swapWrong?: number } = {},
): Question {
  if (answer < 0 || answer > 100 || !Number.isInteger(answer)) {
    throw new GenerationError(`答案越界: ${answer}（${stem}）`);
  }
  return {
    id: p.id,
    type: p.type,
    chapter: p.chapter,
    stem,
    context: opts.context,
    answer,
    options: buildOptions(p.rng, answer, p.type, opts),
    hintSteps,
    difficulty: p.difficulty,
  };
}

/** 难度 → 两位数取值上限，保证难度越高数字越大 */
function twoDigitRange(d: Difficulty): { min: number; max: number } {
  switch (d) {
    case 1: return { min: 10, max: 39 };
    case 2: return { min: 10, max: 59 };
    case 3: return { min: 10, max: 79 };
    case 4: return { min: 10, max: 99 };
    case 5: return { min: 10, max: 99 };
  }
}

function genAddTens(p: GenParams): Question {
  const scale = p.difficulty >= 4 ? 9 : 5;
  const a = randInt(p.rng, 1, scale) * 10;
  let b = randInt(p.rng, 1, scale) * 10;
  if (a + b > 100) b = 100 - a;
  if (b === 0) b = 10;
  const answer = a + b;
  return makeQuestion(
    p,
    `${a} + ${b} = ?`,
    answer,
    [
      `${a} 是 ${a / 10} 个十，${b} 是 ${b / 10} 个十`,
      `一共 ${a / 10} + ${b / 10} = ${answer / 10} 个十`,
      `所以 ${a} + ${b} = ${answer}`,
    ],
  );
}

function genAdd1NoCarry(p: GenParams): Question {
  const { min, max } = twoDigitRange(p.difficulty);
  const noCarryLimit = p.difficulty >= 4 ? 9 : 5;
  for (let i = 0; i < 200; i++) {
    const a = randInt(p.rng, min, max);
    const b = randInt(p.rng, 1, noCarryLimit);
    if ((a % 10) + b < 10 && a + b <= 100) {
      const answer = a + b;
      return makeQuestion(
        p,
        `${a} + ${b} = ?`,
        answer,
        [
          `先看个位：${a % 10} + ${b} = ${(a % 10) + b}，不满十`,
          `十位不变，还是 ${Math.floor(a / 10)} 个十`,
          `所以 ${a} + ${b} = ${answer}`,
        ],
      );
    }
  }
  throw new GenerationError('无法生成不进位加法');
}

function genSub1NoBorrow(p: GenParams): Question {
  const { min, max } = twoDigitRange(p.difficulty);
  for (let i = 0; i < 200; i++) {
    const a = randInt(p.rng, Math.max(11, min), max);
    const b = randInt(p.rng, 1, 9);
    if ((a % 10) >= b) {
      const answer = a - b;
      return makeQuestion(
        p,
        `${a} - ${b} = ?`,
        answer,
        [
          `先看个位：${a % 10} - ${b} = ${(a % 10) - b}，够减`,
          `十位不变，还是 ${Math.floor(a / 10)} 个十`,
          `所以 ${a} - ${b} = ${answer}`,
        ],
      );
    }
  }
  throw new GenerationError('无法生成不退位减法');
}

function genAddCarry(p: GenParams): Question {
  const { min, max } = twoDigitRange(p.difficulty);
  for (let i = 0; i < 300; i++) {
    const a = randInt(p.rng, min, Math.min(max, 89));
    const b = randInt(p.rng, 10, Math.min(max, 100 - a));
    if (b < 10 || a + b > 100) continue;
    const ones = (a % 10) + (b % 10);
    if (ones < 10 || (b % 10) === 0) continue;
    const answer = a + b;
    const carryWrong = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10 + ones;
    return makeQuestion(
      p,
      `${a} + ${b} = ?`,
      answer,
      [
        `个位：${a % 10} + ${b % 10} = ${ones}，满十向十位进 1`,
        `十位：${Math.floor(a / 10)} + ${Math.floor(b / 10)} + 1 = ${Math.floor(a / 10) + Math.floor(b / 10) + 1}`,
        `所以 ${a} + ${b} = ${answer}`,
      ],
      { carryWrong },
    );
  }
  throw new GenerationError('无法生成进位加法');
}

function genSubBorrow(p: GenParams): Question {
  const { min, max } = twoDigitRange(p.difficulty);
  for (let i = 0; i < 300; i++) {
    const a = randInt(p.rng, Math.max(21, min), max);
    const b = randInt(p.rng, 10, Math.min(max, a - 1));
    if ((a % 10) >= (b % 10) || (b % 10) === 0) continue;
    const answer = a - b;
    const borrowWrong = (Math.floor(a / 10) - Math.floor(b / 10)) * 10 + ((a % 10) + 10 - (b % 10));
    return makeQuestion(
      p,
      `${a} - ${b} = ?`,
      answer,
      [
        `个位：${a % 10} 减 ${b % 10} 不够，向十位借 1 当 10`,
        `个位变成 ${a % 10 + 10} - ${b % 10} = ${a % 10 + 10 - b % 10}，十位少 1`,
        `所以 ${a} - ${b} = ${answer}`,
      ],
      { borrowWrong },
    );
  }
  throw new GenerationError('无法生成退位减法');
}

function genChain(p: GenParams): Question {
  const a = randInt(p.rng, 10, 50);
  const b = randInt(p.rng, 10, 30);
  let c = randInt(p.rng, 1, 20);
  const plus = p.rng() < 0.5;
  let mid = a + b;
  if (mid > 100) mid = a - b;
  const op2 = plus ? '+' : '-';
  let answer = plus ? mid + c : mid - c;
  if (answer > 100 || answer < 0) {
    c = plus ? 100 - mid : mid;
    answer = plus ? mid + c : mid - c;
  }
  const stem = `${a} ${mid > a ? '+' : '-'} ${b} ${op2} ${c} = ?`;
  return makeQuestion(p, stem, answer, [
    `第一步：${a} ${mid > a ? '+' : '-'} ${b} = ${mid}`,
    `第二步：${mid} ${op2} ${c} = ${answer}`,
    `所以 ${stem.replace(' = ?', '')} = ${answer}`,
  ]);
}

function genCompare(p: GenParams): Question {
  const { min, max } = twoDigitRange(p.difficulty);
  const a = randInt(p.rng, min, max);
  let b = randInt(p.rng, min, max);
  if (a === b) b = a <= 1 ? a + 1 : a - 1;
  const bigger = Math.max(a, b);
  const smaller = Math.min(a, b);
  const answer = bigger - smaller;
  return makeQuestion(
    p,
    `${bigger} 比 ${smaller} 多多少？`,
    answer,
    [
      `求"多多少"，用大数减小数`,
      `列式：${bigger} - ${smaller}`,
      `所以 ${bigger} 比 ${smaller} 多 ${answer}`,
    ],
  );
}

function genWord(p: GenParams): Question {
  const { min, max } = twoDigitRange(p.difficulty);
  const a = randInt(p.rng, min, Math.min(max, 60));
  let b = randInt(p.rng, 10, Math.min(max, 100 - a));
  if (b === 0) b = 10;
  const plus = p.rng() < 0.5;
  const answer = plus ? a + b : a - b;
  if (answer < 0 || answer > 100) return genWord(p);
  const op = plus ? '又找到' : '用掉';
  const verb = plus ? '一共有' : '还剩';
  const context = `飞船有 ${a} 格能量，${op} ${b} 格，${verb}多少格？`;
  return makeQuestion(
    p,
    context,
    answer,
    [
      `原来有 ${a} 格，${op} ${b} 格`,
      `列式：${a} ${plus ? '+' : '-'} ${b}`,
      `所以 ${verb} ${answer} 格`,
    ],
    { context },
  );
}

const GENERATORS: Record<QuestionType, (p: GenParams) => Question> = {
  addTens: genAddTens,
  add1NoCarry: genAdd1NoCarry,
  sub1NoBorrow: genSub1NoBorrow,
  addCarry: genAddCarry,
  subBorrow: genSubBorrow,
  chain: genChain,
  compare: genCompare,
  word: genWord,
};

/** 生成单道题；id 格式为 `${type}-${index}` */
export function generateQuestion(
  type: QuestionType,
  rng: Rng,
  chapter: number,
  difficulty: Difficulty,
  index: number,
): Question {
  return GENERATORS[type]({ rng, type, chapter, difficulty, id: `${type}-${index}` });
}

/** 生成一关题目（保证无重复 id；题量不足时抛错） */
export function generateLevel(
  types: readonly QuestionType[],
  count: number,
  rng: Rng,
  chapter: number,
  difficulty: Difficulty,
): Question[] {
  if (types.length === 0) throw new GenerationError('关卡未配置题型');
  const questions: Question[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    let q: Question;
    let attempts = 0;
    do {
      q = generateQuestion(type, rng, chapter, difficulty, i);
      attempts++;
    } while (seen.has(q.id) && attempts < 10);
    if (seen.has(q.id)) throw new GenerationError(`题目 id 重复: ${q.id}`);
    seen.add(q.id);
    questions.push(q);
  }
  return questions;
}
