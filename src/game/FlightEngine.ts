import {
  ARENA_WIDTH, ARENA_HEIGHT, SHIP_Y,
  createFlightState, moveShip, stepFlight, fireLaser, pickTarget,
  damageShield, setBoss, damageBoss,
  type FlightState, type FlightConfig, type EnemyKind,
} from '../domain/flight';
import { seededRng } from '../domain/rng';
import type { Rng } from '../domain/types';

export interface FlightSnapshot {
  shield: number;
  score: number;
  combo: number;
  boss: { hp: number; maxHp: number } | null;
  shipX: number;
  enemyCount: number;
}

export interface FlightHooks {
  onState?: (s: FlightSnapshot) => void;
  onShieldEmpty?: () => void;
  onBossDefeated?: () => void;
  onEnemyDestroyed?: (kind: EnemyKind) => void;
  onCollision?: () => void;
}

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Canvas 2D 飞行引擎：纯表现层，持有 FlightState 与 rAF 循环。
 * 领域规则全部委托给 src/domain/flight.ts 的纯函数。
 */
export class FlightEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private hooks: FlightHooks;
  private config: FlightConfig;
  private rng: Rng;
  private state: FlightState;
  private particles: Particle[] = [];
  private raf: number | null = null;
  private last = 0;
  private moveDir: -1 | 0 | 1 = 0;
  private running = false;
  private shake = 0;
  private hitFlash = 0;
  private dash = 0;
  private width = 0;
  private height = 0;
  private speedLines: Array<{ x: number; y: number; len: number; v: number }> = [];

  constructor(canvas: HTMLCanvasElement, config: FlightConfig, hooks: FlightHooks = {}, seed = 12345) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.config = config;
    this.rng = seededRng(seed);
    this.state = createFlightState(config);
    this.resize();
  }

  setHooks(hooks: FlightHooks): void { this.hooks = hooks; }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || this.canvas.clientWidth || 800;
    this.height = rect.height || this.canvas.clientHeight || 600;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.speedLines.length === 0) {
      for (let i = 0; i < 28; i++) {
        this.speedLines.push({
          x: this.rng() * ARENA_WIDTH,
          y: this.rng() * ARENA_HEIGHT,
          len: 2 + this.rng() * 6,
          v: 12 + this.rng() * 26,
        });
      }
    }
  }

  start(): void {
    if (!this.ctx || this.running) return;
    this.running = true;
    this.last = performance.now();
    this.emit();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  reset(seed = 12345): void {
    this.rng = seededRng(seed);
    this.state = createFlightState(this.config);
    this.particles = [];
    this.moveDir = 0;
    this.shake = 0;
    this.hitFlash = 0;
    this.dash = 0;
    this.emit();
  }

  setMove(dir: -1 | 0 | 1): void { this.moveDir = dir; }

  /** 护盾耗尽后温柔回满（不让孩子失败，符合防挫败设计） */
  refillShield(): void {
    this.state = { ...this.state, shield: this.config.maxShield };
    this.hitFlash = 0;
    this.emit();
  }

  /** 答对：锁定目标发射激光、冲刺、加分连击；Boss 存在时同时削血 */
  fireOnCorrect(combo: number): void {
    const target = pickTarget(this.state);
    this.state = { ...fireLaser(this.state, target), combo, score: this.state.score + 100 + combo * 20 };
    this.dash = 0.45;
    if (this.state.boss) {
      const r = damageBoss(this.state, 1);
      this.state = r.state;
      if (r.events.some(e => e.type === 'bossDefeated')) {
        this.burst(this.state.shipX, 30, '#ffd54a', 60);
        this.hooks.onBossDefeated?.();
      }
    }
    this.emit();
  }

  /** 答错：断连击、掉护盾、震屏闪红 */
  fireOnWrong(): void {
    this.state = { ...this.state, combo: 0 };
    this.applyDamage(1);
  }

  /** 进入 Boss 阶段 */
  beginBoss(hp: number): void {
    this.state = setBoss({ ...this.state }, { ...this.config, bossHp: hp });
    this.emit();
  }

  getSnapshot(): FlightSnapshot {
    const s = this.state;
    return {
      shield: s.shield, score: s.score, combo: s.combo,
      boss: s.boss ? { ...s.boss } : null,
      shipX: s.shipX, enemyCount: s.enemies.length,
    };
  }

  private applyDamage(amount: number): void {
    const r = damageShield(this.state, amount, this.config);
    this.state = r.state;
    this.shake = 0.4;
    this.hitFlash = 0.35;
    this.hooks.onCollision?.();
    this.emit();
    if (r.events.some(e => e.type === 'shieldEmpty')) this.hooks.onShieldEmpty?.();
  }

  private emit(): void {
    this.hooks.onState?.(this.getSnapshot());
  }

  private burst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const sp = 2 + this.rng() * 9;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 30 + this.rng() * 25, max: 55,
        color: Math.random() > 0.5 ? color : '#ffffff',
        size: 1 + this.rng() * 2.5,
      });
    }
  }

  private frame = (now: number): void => {
    if (!this.running || !this.ctx) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    // 飞船移动
    if (this.moveDir !== 0) this.state = moveShip(this.state, this.moveDir, dt, this.config);

    // 推进世界（答题期间敌人减速到 0.35，给思考时间但保持动感）
    const result = stepFlight(this.state, dt, this.rng, this.config, 0.35);
    this.state = result.state;
    for (const ev of result.events) {
      if (ev.type === 'enemyDestroyed') {
        this.burst(ev.x, ev.y, ev.kind === 'meteor' ? '#b0bec5' : '#ff8a65', 22);
        this.hooks.onEnemyDestroyed?.(ev.kind);
      } else if (ev.type === 'collision') {
        this.shake = 0.4;
        this.hitFlash = 0.35;
        this.hooks.onCollision?.();
        this.emit();
      } else if (ev.type === 'shieldEmpty') {
        this.hooks.onShieldEmpty?.();
      }
    }

    // 减速计时器
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.dash > 0) this.dash = Math.max(0, this.dash - dt);

    // 速度线
    for (const l of this.speedLines) {
      l.y += (l.v + (this.dash > 0 ? 60 : 0)) * dt;
      if (l.y > ARENA_HEIGHT + 5) { l.y = -5; l.x = this.rng() * ARENA_WIDTH; }
    }

    // 粒子
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private sx(x: number): number { return (x / ARENA_WIDTH) * this.width; }
  private sy(y: number): number { return (y / ARENA_HEIGHT) * this.height; }
  /** 视觉半径按宽度缩放，避免纵向拉伸 */
  private r(radius: number): number { return (radius / ARENA_WIDTH) * this.width; }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    if (this.shake > 0) {
      const m = this.shake * 18;
      ctx.translate((this.rng() - 0.5) * m, (this.rng() - 0.5) * m);
    }

    // 速度线
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(120,200,255,0.18)';
    for (const l of this.speedLines) {
      ctx.beginPath();
      ctx.moveTo(this.sx(l.x), this.sy(l.y));
      ctx.lineTo(this.sx(l.x), this.sy(l.y + l.len));
      ctx.stroke();
    }

    // 冲刺光带
    if (this.dash > 0) {
      ctx.fillStyle = `rgba(77,208,225,${this.dash * 0.18})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 敌人
    for (const e of this.state.enemies) this.drawEnemy(e.kind, e.x, e.y, e.radius);

    // 激光
    for (const l of this.state.lasers) {
      const grad = ctx.createLinearGradient(this.sx(l.x), this.sy(l.y), this.sx(l.x), this.sy(l.y + 10));
      grad.addColorStop(0, 'rgba(125,255,252,0)');
      grad.addColorStop(1, '#7dfffc');
      ctx.strokeStyle = grad;
      ctx.lineWidth = clamp(this.r(1.6), 2, 6);
      ctx.shadowColor = '#4dd0e1';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(this.sx(l.x), this.sy(l.y));
      ctx.lineTo(this.sx(l.x), this.sy(l.y + 12));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 飞船
    this.drawShip();

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(this.sx(p.x), this.sy(p.y), this.r(p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 受击红闪
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,60,60,${this.hitFlash * 0.35})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  private drawShip(): void {
    const ctx = this.ctx!;
    const x = this.sx(this.state.shipX);
    const y = this.sy(SHIP_Y);
    const s = this.r(6);
    ctx.save();
    ctx.translate(x, y);

    // 尾焰
    const flame = 1 + Math.sin(performance.now() / 70) * 0.25 + (this.dash > 0 ? 1.2 : 0);
    const fg = ctx.createLinearGradient(0, s * 0.6, 0, s * (2 + flame));
    fg.addColorStop(0, '#fff7c2');
    fg.addColorStop(0.4, '#ffb300');
    fg.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.5);
    ctx.lineTo(0, s * (2 + flame));
    ctx.lineTo(s * 0.5, s * 0.5);
    ctx.closePath();
    ctx.fill();

    // 机体
    const body = ctx.createLinearGradient(0, -s * 1.6, 0, s);
    body.addColorStop(0, '#e8f6ff');
    body.addColorStop(1, '#42a5f5');
    ctx.fillStyle = body;
    ctx.shadowColor = '#4dd0e1';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.7);
    ctx.lineTo(s, s * 0.8);
    ctx.lineTo(s * 0.35, s * 0.5);
    ctx.lineTo(-s * 0.35, s * 0.5);
    ctx.lineTo(-s, s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // 座舱
    ctx.fillStyle = '#0d47a1';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.35, s * 0.3, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // 护盾光环
    if (this.hitFlash > 0) {
      ctx.strokeStyle = `rgba(125,255,252,${this.hitFlash})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawEnemy(kind: EnemyKind, x: number, y: number, radius: number): void {
    const ctx = this.ctx!;
    const px = this.sx(x);
    const py = this.sy(y);
    const r = this.r(radius);
    ctx.save();
    ctx.translate(px, py);
    if (kind === 'meteor') {
      // 有质感的岩石陨石：固定不规则轮廓（每帧稳定不闪烁）+ 受光渐变 + 陨石坑 + 火焰尾迹
      const segments = 10;
      const point = (i: number) => {
        const a = (Math.PI * 2 * i) / segments;
        const rr = r * (0.82 + 0.2 * Math.sin(i * 2.7 + 0.6) + 0.08 * Math.cos(i * 1.3));
        return { x: Math.cos(a) * rr, y: Math.sin(a) * rr };
      };

      // 火焰尾迹（画在主体下方：陨石向下飞，尾迹朝上）
      const trail = ctx.createLinearGradient(0, -r * 3.2, 0, -r * 0.3);
      trail.addColorStop(0, 'rgba(255,120,40,0)');
      trail.addColorStop(0.6, 'rgba(255,150,50,0.28)');
      trail.addColorStop(1, 'rgba(255,220,120,0.45)');
      ctx.fillStyle = trail;
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, -r * 0.2);
      ctx.lineTo(0, -r * 3.2);
      ctx.lineTo(r * 0.42, -r * 0.2);
      ctx.closePath();
      ctx.fill();

      // 主体：左上受光、右下背光的渐变，配暖色外发光
      ctx.shadowColor = 'rgba(255,140,70,0.55)';
      ctx.shadowBlur = this.r(2.2);
      const body = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.25);
      body.addColorStop(0, '#c7d3da');
      body.addColorStop(0.45, '#8998a3');
      body.addColorStop(1, '#3c4a55');
      ctx.fillStyle = body;
      ctx.strokeStyle = '#2b3742';
      ctx.lineWidth = Math.max(1.5, this.r(0.5));
      ctx.beginPath();
      for (let i = 0; i < segments; i++) {
        const p = point(i);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 陨石坑：深色坑底 + 亮色弧边高光（位置固定，随陨石一起动）
      const craters: Array<[number, number, number]> = [
        [-0.3, -0.22, 0.24], [0.28, 0.16, 0.18], [0.1, -0.35, 0.12],
      ];
      for (const [cx, cy, cr] of craters) {
        ctx.fillStyle = 'rgba(28,38,46,0.55)';
        ctx.beginPath(); ctx.arc(cx * r, cy * r, cr * r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(220,235,245,0.45)';
        ctx.lineWidth = Math.max(1, this.r(0.35));
        ctx.beginPath();
        ctx.arc(cx * r, cy * r, cr * r, Math.PI * 0.9, Math.PI * 1.9);
        ctx.stroke();
      }
      // 受光边缘高光
      ctx.strokeStyle = 'rgba(235,245,255,0.5)';
      ctx.lineWidth = Math.max(1, this.r(0.35));
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.92, Math.PI * 1.05, Math.PI * 1.6);
      ctx.stroke();
    } else if (kind === 'boss') {
      ctx.shadowColor = '#ff5252';
      ctx.shadowBlur = 20;
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, '#b71c1c');
      g.addColorStop(1, '#4a0000');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10;
        const rr = r * (i % 2 === 0 ? 1 : 0.7);
        const vx = Math.cos(a) * rr;
        const vy = Math.sin(a) * rr;
        i === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
      }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.1, r * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.1, r * 0.13, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#ff7043';
      ctx.shadowColor = '#ff8a65';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, r);
      ctx.lineTo(r, -r * 0.8);
      ctx.lineTo(-r, -r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.28, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Boss 血条
    if (kind === 'boss' && this.state.boss) {
      const b = this.state.boss;
      const w = this.r(20);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px - w / 2, py - r - 14, w, 6);
      ctx.fillStyle = '#ff5252';
      ctx.fillRect(px - w / 2, py - r - 14, w * (b.hp / b.maxHp), 6);
    }
  }
}
