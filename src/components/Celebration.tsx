import { useEffect, useRef } from 'react';

export type Burst = { id: number; kind: 'correct' | 'combo' | 'levelClear'; x: number; y: number };

const COLORS = ['#ffd54a', '#4dd0e1', '#ff8a65', '#69f0ae', '#b388ff', '#ffffff'];

/**
 * Canvas 2D 粒子庆祝特效层：答对/连击/通关时从屏幕坐标喷发星星与光点。
 * 纯装饰层，pointer-events: none，不拦截游戏交互。
 */
export function Celebration({ bursts, onDone }: { bursts: Burst[]; onDone: (id: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Map<number, Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; star: boolean }>>>(new Map());
  const rafRef = useRef<number | null>(null);

  // 收到新 burst 时生成粒子
  useEffect(() => {
    for (const b of bursts) {
      if (particlesRef.current.has(b.id)) continue;
      const count = b.kind === 'levelClear' ? 90 : b.kind === 'combo' ? 55 : 26;
      const parts = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * (b.kind === 'correct' ? 4 : 7);
        const maxLife = 45 + Math.random() * 40;
        return {
          x: b.x, y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          life: maxLife, maxLife,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 3 + Math.random() * 5,
          star: Math.random() > 0.5,
        };
      });
      particlesRef.current.set(b.id, parts);
    }
  }, [bursts]);

  // 动画循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const drawStar = (x: number, y: number, r: number, color: string, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const inner = r * 0.45;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        const a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    };

    const frame = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const map = particlesRef.current;
      for (const [id, parts] of map) {
        let alive = 0;
        for (const p of parts) {
          if (p.life <= 0) continue;
          alive++;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.075; // 轻微重力
          p.vx *= 0.992;
          p.life--;
          const alpha = Math.max(0, p.life / p.maxLife);
          ctx.globalAlpha = alpha;
          if (p.star) drawStar(p.x, p.y, p.size * 1.6, p.color, p.life * 0.05);
          else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        if (alive === 0) {
          map.delete(id);
          onDone(id);
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [onDone]);

  return <canvas ref={canvasRef} className="celebration-canvas" aria-hidden="true" />;
}
