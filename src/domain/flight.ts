import type { Rng } from './types';

/** 竞技场使用与分辨率无关的逻辑坐标：宽 100 × 高 100，飞船在底部 y≈88 */
export const ARENA_WIDTH = 100;
export const ARENA_HEIGHT = 100;
export const SHIP_Y = 88;
export const SHIP_RADIUS = 4;

export type EnemyKind = 'meteor' | 'scout' | 'boss';

export interface FlightConfig {
  maxShield: number;
  shipSpeed: number;      // 逻辑单位/秒
  enemySpeed: number;     // 基础下落速度 单位/秒
  spawnInterval: number;  // 秒
  bossHp: number;         // 答对一题削 1 血
}

export const DEFAULT_FLIGHT_CONFIG: FlightConfig = {
  maxShield: 3,
  shipSpeed: 55,
  enemySpeed: 6,
  spawnInterval: 1.6,
  bossHp: 5,
};

export interface Enemy {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Laser {
  id: string;
  x: number;
  y: number;
  prevY: number;
  vy: number;
  targetId: string | null;
}

export interface BossState {
  hp: number;
  maxHp: number;
}

export interface FlightState {
  time: number;          // 经过秒数
  shipX: number;
  shield: number;
  score: number;
  combo: number;
  enemies: Enemy[];
  lasers: Laser[];
  boss: BossState | null;
  nextSpawnAt: number;
  seq: number;           // 实体 id 计数器
}

export type FlightEvent =
  | { type: 'collision'; enemyId: string }
  | { type: 'enemyDestroyed'; enemyId: string; kind: EnemyKind; x: number; y: number }
  | { type: 'shieldEmpty' }
  | { type: 'bossDefeated' };

export interface StepResult {
  state: FlightState;
  events: FlightEvent[];
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** 创建一关的初始飞行状态 */
export function createFlightState(config: FlightConfig = DEFAULT_FLIGHT_CONFIG): FlightState {
  return {
    time: 0,
    shipX: ARENA_WIDTH / 2,
    shield: config.maxShield,
    score: 0,
    combo: 0,
    enemies: [],
    lasers: [],
    boss: null,
    nextSpawnAt: config.spawnInterval,
    seq: 0,
  };
}

/** 移动飞船（dir: -1 左 / 0 停 / 1 右），边界钳制 */
export function moveShip(state: FlightState, dir: -1 | 0 | 1, dt: number, config: FlightConfig = DEFAULT_FLIGHT_CONFIG): FlightState {
  const dx = dir * config.shipSpeed * dt;
  return { ...state, shipX: clamp(state.shipX + dx, SHIP_RADIUS, ARENA_WIDTH - SHIP_RADIUS) };
}

/** 生成一个敌人（顶部出现，随机横向速度与位置） */
export function spawnEnemy(state: FlightState, rng: Rng, kind: EnemyKind = 'scout', config: FlightConfig = DEFAULT_FLIGHT_CONFIG): FlightState {
  const seq = state.seq + 1;
  const radius = kind === 'meteor' ? 5.5 : 5;
  const enemy: Enemy = {
    id: `e${seq}`,
    kind,
    x: 10 + rng() * (ARENA_WIDTH - 20),
    y: -radius,
    vx: (rng() - 0.5) * 10,
    vy: config.enemySpeed * (kind === 'meteor' ? 0.85 : 1) * (0.85 + rng() * 0.4),
    radius,
  };
  return { ...state, seq, enemies: [...state.enemies, enemy] };
}

/**
 * 推进一帧。
 * enemySpeedFactor: 答题期间传 0.05 让敌人近乎静止（给孩子思考时间），
 * 平时传 1；激光与计分不受影响。
 */
export function stepFlight(
  state: FlightState,
  dt: number,
  rng: Rng,
  config: FlightConfig = DEFAULT_FLIGHT_CONFIG,
  enemySpeedFactor = 1,
): StepResult {
  const events: FlightEvent[] = [];
  let time = state.time + dt;
  let seq = state.seq;
  let shield = state.shield;
  let score = state.score;
  let boss = state.boss;

  // 1) 生成新敌人（Boss 存在时暂停普通刷怪）
  let enemies = state.enemies.slice();
  let nextSpawnAt = state.nextSpawnAt;
  if (!boss && time >= state.nextSpawnAt) {
    const kind: EnemyKind = rng() < 0.45 ? 'meteor' : 'scout';
    seq++;
    const radius = kind === 'meteor' ? 5.5 : 5;
    enemies.push({
      id: `e${seq}`,
      kind,
      x: 10 + rng() * (ARENA_WIDTH - 20),
      y: -radius,
      vx: (rng() - 0.5) * 10,
      vy: config.enemySpeed * (kind === 'meteor' ? 0.85 : 1) * (0.85 + rng() * 0.4),
      radius,
    });
    // 关卡越久略微加快，但设下限防止失控
    const interval = Math.max(0.9, config.spawnInterval - time * 0.01);
    nextSpawnAt = time + interval;
  }

  // 2) 移动敌人（横向碰壁反弹）
  enemies = enemies.map(e => {
    let x = e.x + e.vx * dt * enemySpeedFactor;
    let vx = e.vx;
    if (x < e.radius) { x = e.radius; vx = Math.abs(vx); }
    if (x > ARENA_WIDTH - e.radius) { x = ARENA_WIDTH - e.radius; vx = -Math.abs(vx); }
    return { ...e, x, vx, y: e.y + e.vy * dt * enemySpeedFactor };
  });

  // 3) 移动激光（若锁定目标则轻微追踪）；保留 prevY 做扫掠检测防穿透
  const lasers = state.lasers.map(l => {
    const target = l.targetId ? enemies.find(e => e.id === l.targetId) : null;
    const x = target ? l.x + clamp(target.x - l.x, -30 * dt, 30 * dt) : l.x;
    return { ...l, prevY: l.y, x, y: l.y + l.vy * dt };
  }).filter(l => l.y > -5);

  // 4) 激光命中敌人（扫掠：敌人 y 落在激光本帧经过的区间且横向接近）
  const remainingLasers = lasers.filter(l => {
    const yMin = Math.min(l.prevY, l.y);
    const yMax = Math.max(l.prevY, l.y);
    const hit = enemies.find(e =>
      e.y >= yMin - e.radius && e.y <= yMax + e.radius && Math.abs(e.x - l.x) < e.radius + 2,
    );
    if (!hit) return true;
    enemies = enemies.filter(e => e.id !== hit.id);
    score += 100;
    events.push({ type: 'enemyDestroyed', enemyId: hit.id, kind: hit.kind, x: hit.x, y: hit.y });
    return false;
  });

  // 5) 敌人撞飞船或飞出底部
  enemies = enemies.filter(e => {
    if (Math.abs(e.x - state.shipX) < e.radius + SHIP_RADIUS && e.y >= SHIP_Y - e.radius && e.y <= SHIP_Y + e.radius + 6) {
      shield = Math.max(0, shield - 1);
      events.push({ type: 'collision', enemyId: e.id });
      if (shield === 0) events.push({ type: 'shieldEmpty' });
      return false;
    }
    return e.y <= ARENA_HEIGHT + 8;
  });

  // 6) Boss 血量为 0 → 击败事件
  if (boss && boss.hp <= 0) {
    boss = null;
    events.push({ type: 'bossDefeated' });
  }

  return {
    state: {
      ...state, time, seq, nextSpawnAt, shield, score, boss,
      enemies, lasers: remainingLasers,
    },
    events,
  };
}

/** 发射激光：targetId 为锁定的敌人 id（答对时锁定最低的敌人） */
export function fireLaser(state: FlightState, targetId: string | null = null): FlightState {
  const seq = state.seq + 1;
  return {
    ...state,
    seq,
    lasers: [...state.lasers, {
      id: `l${seq}`, x: state.shipX, y: SHIP_Y - 6, prevY: SHIP_Y - 6, vy: -85, targetId,
    }],
  };
}

/** 答对：加分与连击 */
export function onCorrect(state: FlightState, combo: number): FlightState {
  return { ...state, combo, score: state.score + 100 + combo * 20 };
}

/** 答错：断连击 */
export function onWrong(state: FlightState): FlightState {
  return { ...state, combo: 0 };
}

/** 掉护盾（答错/碰撞共用），返回事件 */
export function damageShield(state: FlightState, amount = 1, config: FlightConfig = DEFAULT_FLIGHT_CONFIG): StepResult {
  const shield = clamp(state.shield - amount, 0, config.maxShield);
  const events: FlightEvent[] = shield === 0 ? [{ type: 'shieldEmpty' }] : [];
  return { state: { ...state, shield }, events };
}

/** 进入 Boss 战：清场并生成 Boss 血条 */
export function setBoss(state: FlightState, config: FlightConfig = DEFAULT_FLIGHT_CONFIG): FlightState {
  return {
    ...state,
    enemies: [],
    lasers: [],
    boss: { hp: config.bossHp, maxHp: config.bossHp },
  };
}

/** Boss 受击（答对一题削 1 血），返回事件 */
export function damageBoss(state: FlightState, amount = 1): StepResult {
  if (!state.boss) return { state, events: [] };
  const hp = Math.max(0, state.boss.hp - amount);
  const events: FlightEvent[] = hp === 0 ? [{ type: 'bossDefeated' }] : [];
  return { state: { ...state, boss: hp === 0 ? null : { ...state.boss, hp } }, events };
}

/** 选择飞船正上方最低的敌人作为锁定目标 */
export function pickTarget(state: FlightState): string | null {
  const candidates = state.enemies.filter(e => e.y < SHIP_Y && Math.abs(e.x - state.shipX) < 22);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, e) => e.y > best.y ? e : best).id;
}
