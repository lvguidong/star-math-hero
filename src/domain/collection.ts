import type { PlayerProfile, QuestionType } from './types';

/** 星星图鉴条目：按题型收集，首次答对即点亮 */
export interface CardDef {
  id: string;        // 题型 id
  name: string;
  icon: string;
  description: string;
}

/** 外星宠物：累计星星达到门槛解锁 */
export interface PetDef {
  id: string;
  name: string;
  icon: string;
  starsNeeded: number;
}

export const CARDS: CardDef[] = [
  { id: 'addTens', name: '整十星人', icon: '🔟', description: '整十数相加减，十位做算术' },
  { id: 'add1NoCarry', name: '加法小苗', icon: '🌱', description: '两位数加一位数，个位不满十' },
  { id: 'sub1NoBorrow', name: '减法水滴', icon: '💧', description: '两位数减一位数，个位够减' },
  { id: 'addCarry', name: '进位火狐', icon: '🦊', description: '个位满十向十位进一' },
  { id: 'subBorrow', name: '退位冰熊', icon: '🐻‍❄️', description: '个位不够减向十位借一' },
  { id: 'chain', name: '连环彗星', icon: '☄️', description: '连加连减按顺序算' },
  { id: 'compare', name: '天平精灵', icon: '⚖️', description: '比多少，先算再比' },
  { id: 'word', name: '故事星鸟', icon: '🦜', description: '读应用题，找数量关系' },
];

export const PETS: PetDef[] = [
  { id: 'blob', name: '滴滴', icon: '🟢', starsNeeded: 0 },
  { id: 'fox', name: '小火狐', icon: '🦊', starsNeeded: 10 },
  { id: 'owl', name: '智慧猫头鹰', icon: '🦉', starsNeeded: 25 },
  { id: 'dragon', name: '星辰小龙', icon: '🐲', starsNeeded: 50 },
  { id: 'robot', name: '嘀嗒升级版', icon: '🤖', starsNeeded: 90 },
  { id: 'unicorn', name: '彩虹独角兽', icon: '🦄', starsNeeded: 150 },
];

/** 首次答对某题型时点亮对应图鉴卡，返回新点亮的卡 id */
export function collectCard(profile: PlayerProfile, type: QuestionType): string | null {
  if (profile.collectedCards.includes(type)) return null;
  profile.collectedCards.push(type);
  return type;
}

/** 根据累计星星刷新宠物解锁列表，返回新解锁宠物 id */
export function refreshPets(profile: PlayerProfile): string[] {
  const fresh = PETS.filter(p => profile.totalStars >= p.starsNeeded && !profile.pets.includes(p.id));
  for (const p of fresh) profile.pets.push(p.id);
  return fresh.map(p => p.id);
}

/** 图鉴完成度 */
export function collectionProgress(profile: PlayerProfile): { cards: number; totalCards: number; pets: number; totalPets: number } {
  return {
    cards: profile.collectedCards.length, totalCards: CARDS.length,
    pets: profile.pets.length, totalPets: PETS.length,
  };
}
