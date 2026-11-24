import type { Question } from './types';

/** 三级提示工具：返回逐步提示文案（出题时已生成在 question.hintSteps） */
export function getHints(question: Question): string[] {
  return question.hintSteps;
}

/** 小棒可视化数据：把数字拆成十根一捆 + 单根 */
export function toStickBundles(n: number): { tens: number; ones: number } {
  return { tens: Math.floor(n / 10), ones: n % 10 };
}

/** 数轴可视化数据：从 from 每次跳 step，最多到 to（用于加减演示） */
export function toNumberLine(from: number, delta: number, to: number): number[] {
  const points = [from];
  const step = delta > 0 ? 1 : -1;
  for (let v = from + step; step > 0 ? v <= to : v >= to; v += step) {
    points.push(v);
  }
  return points;
}
