import type { LevelConfig, QuestionType } from './types';

/** 星系章节：与策划案 6 大星系对应，题型按人教版二年级上册递进 */
export interface Chapter {
  id: number;
  title: string;
  icon: string;
  color: string;
  description: string;
  levels: LevelConfig[];
}

type Types = readonly QuestionType[];

/** 每章的关卡模板：[关卡标题, 题型组合, 题量, 难度] */
interface LevelTemplate {
  title: string;
  types: Types;
  questionCount: number;
  difficulty: number;
  boss?: boolean;
}

const TEMPLATES: Array<{ chapter: Omit<Chapter, 'levels'>; levels: LevelTemplate[] }> = [
  {
    chapter: {
      id: 1, title: '启航星港', icon: '🛰️', color: '#4dd0e1',
      description: '整十数与不进位加减，点亮启航引擎',
    },
    levels: [
      { title: '点火测试', types: ['addTens'], questionCount: 8, difficulty: 1 },
      { title: '轨道校准', types: ['addTens'], questionCount: 8, difficulty: 2 },
      { title: '一位数加法', types: ['add1NoCarry'], questionCount: 8, difficulty: 1 },
      { title: '一位数减法', types: ['sub1NoBorrow'], questionCount: 8, difficulty: 1 },
      { title: '双引擎', types: ['add1NoCarry', 'sub1NoBorrow'], questionCount: 10, difficulty: 2 },
      { title: '整十加速', types: ['addTens', 'sub1NoBorrow'], questionCount: 10, difficulty: 3 },
      { title: '混合巡航', types: ['addTens', 'add1NoCarry', 'sub1NoBorrow'], questionCount: 10, difficulty: 3 },
      { title: '星港毕业考', types: ['addTens', 'add1NoCarry', 'sub1NoBorrow'], questionCount: 12, difficulty: 4 },
    ],
  },
  {
    chapter: {
      id: 2, title: '流星群', icon: '☄️', color: '#ff8a65',
      description: '进位加法，躲开迎面而来的流星',
    },
    levels: [
      { title: '第一颗流星', types: ['addCarry'], questionCount: 8, difficulty: 1 },
      { title: '擦肩而过', types: ['addCarry'], questionCount: 8, difficulty: 2 },
      { title: '凑十特训', types: ['addCarry'], questionCount: 10, difficulty: 2 },
      { title: '流星雨', types: ['addCarry'], questionCount: 10, difficulty: 3 },
      { title: '双闪追击', types: ['addCarry', 'add1NoCarry'], questionCount: 10, difficulty: 3 },
      { title: '能量护盾', types: ['addCarry', 'addTens'], questionCount: 10, difficulty: 4 },
      { title: '彗星尾焰', types: ['addCarry', 'sub1NoBorrow'], questionCount: 10, difficulty: 4 },
      { title: '流星之王', types: ['addCarry'], questionCount: 12, difficulty: 5, boss: true },
    ],
  },
  {
    chapter: {
      id: 3, title: '银河工厂', icon: '🏭', color: '#b388ff',
      description: '退位减法，拆解银河工厂的零件',
    },
    levels: [
      { title: '拆箱入门', types: ['subBorrow'], questionCount: 8, difficulty: 1 },
      { title: '借位传送带', types: ['subBorrow'], questionCount: 8, difficulty: 2 },
      { title: '破十法', types: ['subBorrow'], questionCount: 10, difficulty: 2 },
      { title: '流水线', types: ['subBorrow'], questionCount: 10, difficulty: 3 },
      { title: '逆向检修', types: ['subBorrow', 'sub1NoBorrow'], questionCount: 10, difficulty: 3 },
      { title: '双班轮值', types: ['subBorrow', 'addCarry'], questionCount: 10, difficulty: 4 },
      { title: '工厂警报', types: ['subBorrow', 'addTens'], questionCount: 10, difficulty: 4 },
      { title: '质检关卡', types: ['subBorrow', 'sub1NoBorrow'], questionCount: 12, difficulty: 4 },
      { title: '厂长挑战', types: ['subBorrow'], questionCount: 12, difficulty: 5, boss: true },
      { title: '无尘车间', types: ['subBorrow', 'addCarry'], questionCount: 12, difficulty: 5 },
    ],
  },
  {
    chapter: {
      id: 4, title: '双星系统', icon: '🌌', color: '#69f0ae',
      description: '连加连减，在两颗星球间来回穿梭',
    },
    levels: [
      { title: '连续跳跃', types: ['chain'], questionCount: 8, difficulty: 1 },
      { title: '三连加', types: ['chain'], questionCount: 8, difficulty: 2 },
      { title: '三连减', types: ['chain'], questionCount: 10, difficulty: 2 },
      { title: '加减交替', types: ['chain'], questionCount: 10, difficulty: 3 },
      { title: '双星轨道', types: ['chain', 'addCarry'], questionCount: 10, difficulty: 3 },
      { title: '引力弹弓', types: ['chain', 'subBorrow'], questionCount: 10, difficulty: 4 },
      { title: '星际折返', types: ['chain', 'addTens'], questionCount: 10, difficulty: 4 },
      { title: '轨道迷宫', types: ['chain', 'addCarry', 'subBorrow'], questionCount: 12, difficulty: 4 },
      { title: '双星合一', types: ['chain'], questionCount: 12, difficulty: 5, boss: true },
      { title: '引力风暴', types: ['chain', 'add1NoCarry', 'sub1NoBorrow'], questionCount: 12, difficulty: 5 },
    ],
  },
  {
    chapter: {
      id: 5, title: '应用星云', icon: '🧠', color: '#ffd54a',
      description: '比多少与应用题，读懂故事再计算',
    },
    levels: [
      { title: '比多少', types: ['compare'], questionCount: 8, difficulty: 1 },
      { title: '摘星星', types: ['word'], questionCount: 8, difficulty: 1 },
      { title: '分礼物', types: ['word'], questionCount: 10, difficulty: 2 },
      { title: '星际邮差', types: ['compare', 'word'], questionCount: 10, difficulty: 2 },
      { title: '太空超市', types: ['word', 'addCarry'], questionCount: 10, difficulty: 3 },
      { title: '星球人口', types: ['word', 'subBorrow'], questionCount: 10, difficulty: 3 },
      { title: '燃料计算', types: ['word', 'chain'], questionCount: 10, difficulty: 4 },
      { title: '故事大王', types: ['word', 'compare'], questionCount: 12, difficulty: 4 },
      { title: '星云侦探', types: ['word', 'compare', 'chain'], questionCount: 12, difficulty: 5, boss: true },
      { title: '银河日报', types: ['word'], questionCount: 12, difficulty: 5 },
    ],
  },
  {
    chapter: {
      id: 6, title: '数学黑洞', icon: '🕳️', color: '#ff5252',
      description: '终极大 Boss，八种题型综合大挑战',
    },
    levels: [
      { title: '事件视界', types: ['addCarry', 'subBorrow'], questionCount: 10, difficulty: 4, boss: true },
      { title: '引力奇点', types: ['chain', 'word'], questionCount: 10, difficulty: 4, boss: true },
      { title: '光速计算', types: ['addTens', 'compare', 'addCarry'], questionCount: 10, difficulty: 5, boss: true },
      { title: '时空折叠', types: ['subBorrow', 'sub1NoBorrow', 'chain'], questionCount: 12, difficulty: 5, boss: true },
      { title: '黑洞核心', types: ['addCarry', 'subBorrow', 'word', 'compare'], questionCount: 12, difficulty: 5, boss: true },
      { title: '虫洞回廊', types: ['chain', 'add1NoCarry', 'word'], questionCount: 12, difficulty: 5, boss: true },
      { title: '暗物质迷雾', types: ['compare', 'subBorrow', 'addCarry', 'chain'], questionCount: 12, difficulty: 5, boss: true },
      { title: '虫群突袭', types: ['word', 'addTens', 'sub1NoBorrow', 'chain'], questionCount: 12, difficulty: 5, boss: true },
      { title: '终焉之门', types: ['addCarry', 'subBorrow', 'chain', 'word', 'compare'], questionCount: 12, difficulty: 5, boss: true },
      { title: '数学黑洞之王', types: ['addTens', 'add1NoCarry', 'sub1NoBorrow', 'addCarry', 'subBorrow', 'chain', 'compare', 'word'], questionCount: 12, difficulty: 5, boss: true },
    ],
  },
];

export const CHAPTERS: Chapter[] = TEMPLATES.map(({ chapter, levels }) => ({
  ...chapter,
  levels: levels.map((t, i) => ({
    id: `${chapter.id}-${i + 1}`,
    chapter: chapter.id,
    title: t.title,
    types: [...t.types],
    questionCount: t.questionCount,
    difficulty: t.difficulty,
    ...(t.boss ? { boss: true } : {}),
  })),
}));

export const ALL_LEVELS: LevelConfig[] = CHAPTERS.flatMap(c => c.levels);

/** 每章关卡数（供解锁逻辑使用） */
export const CHAPTER_LEVEL_COUNT: Record<number, number> = Object.fromEntries(
  CHAPTERS.map(c => [c.id, c.levels.length]),
);

export function getLevel(id: string): LevelConfig | undefined {
  return ALL_LEVELS.find(l => l.id === id);
}

export function getChapter(chapterId: number): Chapter | undefined {
  return CHAPTERS.find(c => c.id === chapterId);
}

/** 章节解锁：第 1 章始终开放；第 n 章在前一章全部通关后开放 */
export function isChapterUnlocked(chapterId: number, profile: { starsByLevel: Record<string, number> }): boolean {
  if (chapterId <= 1) return true;
  const prev = CHAPTERS.find(c => c.id === chapterId - 1);
  if (!prev) return false;
  return prev.levels.every(l => (profile.starsByLevel[l.id] ?? 0) > 0);
}
