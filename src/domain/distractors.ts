import type { QuestionType, Rng } from './types';
import { shuffle } from './rng';

/**
 * 根据题型生成 3 个"典型错误"干扰项，并补足到 4 个互异选项（含答案）。
 * 所有选项约束：整数、0..100、互不相同。
 */
export function buildOptions(
  rng: Rng,
  answer: number,
  type: QuestionType,
  extras: { carryWrong?: number; borrowWrong?: number; swapWrong?: number } = {},
): number[] {
  const candidates: number[] = [];

  switch (type) {
    case 'addCarry':
      if (extras.carryWrong !== undefined) candidates.push(extras.carryWrong);
      candidates.push(answer - 10, answer + 10, answer - 1, answer + 1, answer - 9, answer + 9);
      break;
    case 'subBorrow':
      if (extras.borrowWrong !== undefined) candidates.push(extras.borrowWrong);
      candidates.push(answer - 10, answer + 10, answer - 1, answer + 1, answer - 9, answer + 9);
      break;
    case 'add1NoCarry':
    case 'addTens':
      candidates.push(answer - 10, answer + 10, answer - 1, answer + 1, answer + 2);
      if (extras.swapWrong !== undefined) candidates.push(extras.swapWrong);
      break;
    case 'sub1NoBorrow':
      candidates.push(answer - 10, answer + 10, answer - 1, answer + 1, answer - 2);
      if (extras.swapWrong !== undefined) candidates.push(extras.swapWrong);
      break;
    default:
      candidates.push(answer - 10, answer + 10, answer - 1, answer + 1, answer - 2, answer + 2, answer - 9, answer + 9);
  }

  const seen = new Set<number>([answer]);
  const distractors: number[] = [];
  for (const c of candidates) {
    if (distractors.length >= 3) break;
    if (c < 0 || c > 100 || !Number.isInteger(c) || seen.has(c)) continue;
    seen.add(c);
    distractors.push(c);
  }

  // 极端边界兜底：用 0..100 内任意数补足
  let n = 0;
  while (distractors.length < 3) {
    const c = n % 101;
    if (!seen.has(c)) {
      seen.add(c);
      distractors.push(c);
    }
    n++;
  }

  return shuffle(rng, [answer, ...distractors]);
}
