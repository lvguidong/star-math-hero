import { describe, it, expect } from 'vitest';
import {
  ARENA_WIDTH, SHIP_RADIUS, DEFAULT_FLIGHT_CONFIG,
  createFlightState, moveShip, spawnEnemy, stepFlight, fireLaser,
  onCorrect, onWrong, damageShield, setBoss, damageBoss, pickTarget,
} from './flight';
import { seededRng } from './rng';

describe('飞行领域模型', () => {
  it('初始状态：飞船居中、满护盾、无敌机', () => {
    const s = createFlightState();
    expect(s.shipX).toBe(ARENA_WIDTH / 2);
    expect(s.shield).toBe(DEFAULT_FLIGHT_CONFIG.maxShield);
    expect(s.enemies).toEqual([]);
  });

  it('移动飞船并被边界钳制', () => {
    let s = createFlightState();
    for (let i = 0; i < 100; i++) s = moveShip(s, -1, 0.1);
    expect(s.shipX).toBe(SHIP_RADIUS);
    for (let i = 0; i < 200; i++) s = moveShip(s, 1, 0.1);
    expect(s.shipX).toBe(ARENA_WIDTH - SHIP_RADIUS);
  });

  it('敌机会生成、下落、横向反弹', () => {
    const rng = seededRng(1);
    let s = spawnEnemy(createFlightState(), rng);
    expect(s.enemies).toHaveLength(1);
    const e0 = s.enemies[0];
    const beforeY = e0.y;
    const { state: s2 } = stepFlight(s, 0.5, rng);
    expect(s2.enemies[0].y).toBeGreaterThan(beforeY);
    // 横向出界被反弹
    s = { ...s, enemies: [{ ...e0, x: ARENA_WIDTH - 5.2, vx: 8 }] };
    const { state: s3 } = stepFlight(s, 0.5, rng);
    expect(s3.enemies[0].vx).toBeLessThan(0);
  });

  it('答题期间敌人近乎静止（速度因子 0.05）', () => {
    const rng = seededRng(2);
    const s = spawnEnemy(createFlightState(), rng);
    const beforeY = s.enemies[0].y;
    const { state } = stepFlight(s, 1, rng, DEFAULT_FLIGHT_CONFIG, 0.05);
    expect(state.enemies[0].y - beforeY).toBeGreaterThan(0);
    expect(state.enemies[0].y - beforeY).toBeLessThan(0.5);
  });

  it('激光命中敌人并计分、发事件', () => {
    const rng = seededRng(3);
    let s = spawnEnemy(createFlightState(), rng);
    const enemy = s.enemies[0];
    // 把敌人放到激光正上方，发射并推进
    s = { ...s, shipX: enemy.x, enemies: [{ ...enemy, y: 60 }] };
    s = fireLaser(s, enemy.id);
    const { state, events } = stepFlight(s, 0.5, rng);
    expect(events.some(e => e.type === 'enemyDestroyed')).toBe(true);
    expect(state.enemies).toHaveLength(0);
    expect(state.score).toBeGreaterThan(0);
  });

  it('敌人撞飞船掉护盾，护盾为 0 发事件', () => {
    const rng = seededRng(4);
    const s = createFlightState();
    const enemy = { id: 'e1', kind: 'scout' as const, x: s.shipX, y: 86, vx: 0, vy: 10, radius: 5 };
    const { state, events } = stepFlight({ ...s, enemies: [enemy] }, 0.3, rng);
    expect(events.some(e => e.type === 'collision')).toBe(true);
    expect(state.shield).toBe(2);
    const drained = damageShield(state, 99);
    expect(drained.state.shield).toBe(0);
    expect(drained.events.some(e => e.type === 'shieldEmpty')).toBe(true);
  });

  it('答对加分连击、答错断连击', () => {
    let s = onCorrect(createFlightState(), 3);
    expect(s.combo).toBe(3);
    expect(s.score).toBeGreaterThan(0);
    s = onWrong(s);
    expect(s.combo).toBe(0);
  });

  it('Boss 战：削血到 0 触发击败事件', () => {
    const rng = seededRng(5);
    let s = setBoss(createFlightState());
    expect(s.boss?.hp).toBe(DEFAULT_FLIGHT_CONFIG.bossHp);
    for (let i = 0; i < DEFAULT_FLIGHT_CONFIG.bossHp - 1; i++) {
      const r = damageBoss(s);
      expect(r.events).toEqual([]);
      s = r.state;
    }
    const final = damageBoss(s);
    expect(final.events.some(e => e.type === 'bossDefeated')).toBe(true);
    expect(final.state.boss).toBeNull();
    // Boss 存在时不刷普通敌机
    const { state } = stepFlight(s, 2, rng);
    expect(state.enemies).toHaveLength(0);
  });

  it('pickTarget 选择飞船上方最近的敌人', () => {
    const s = createFlightState();
    const enemies = [
      { id: 'a', kind: 'scout' as const, x: s.shipX, y: 30, vx: 0, vy: 0, radius: 5 },
      { id: 'b', kind: 'meteor' as const, x: s.shipX + 2, y: 50, vx: 0, vy: 0, radius: 5 },
      { id: 'c', kind: 'scout' as const, x: 5, y: 60, vx: 0, vy: 0, radius: 5 },
    ];
    expect(pickTarget({ ...s, enemies })).toBe('b');
    expect(pickTarget(s)).toBeNull();
  });
});
