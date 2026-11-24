import { describe, it, expect } from 'vitest';
import { collectCard, refreshPets, collectionProgress, CARDS, PETS } from './collection';
import { createDefaultProfile } from '../application/saveRepository';

describe('收集系统', () => {
  it('首次答对题型点亮图鉴，重复不重复', () => {
    const p = createDefaultProfile();
    expect(collectCard(p, 'addCarry')).toBe('addCarry');
    expect(collectCard(p, 'addCarry')).toBeNull();
    expect(p.collectedCards).toEqual(['addCarry']);
  });

  it('宠物按累计星星解锁，重复刷新不重复', () => {
    const p = createDefaultProfile();
    expect(refreshPets(p)).toEqual(['blob']); // 0 星宠物
    p.totalStars = 12;
    expect(refreshPets(p)).toEqual(['fox']);
    expect(refreshPets(p)).toEqual([]);
    p.totalStars = 150;
    expect(refreshPets(p).length).toBe(PETS.length - 2);
    expect(p.pets.length).toBe(PETS.length);
  });

  it('图鉴/宠物完成度统计', () => {
    const p = createDefaultProfile();
    expect(collectionProgress(p)).toEqual({ cards: 0, totalCards: CARDS.length, pets: 0, totalPets: PETS.length });
    collectCard(p, 'word');
    refreshPets(p);
    expect(collectionProgress(p)).toMatchObject({ cards: 1, pets: 1 });
  });
});
