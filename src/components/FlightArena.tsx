import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FlightEngine, type FlightSnapshot } from '../game/FlightEngine';
import { DEFAULT_FLIGHT_CONFIG, type EnemyKind } from '../domain/flight';

export interface FlightArenaHandle {
  fireOnCorrect: (combo: number) => void;
  fireOnWrong: () => void;
  beginBoss: (hp: number) => void;
  reset: () => void;
  refillShield: () => void;
  setMove: (dir: -1 | 0 | 1) => void;
  getSnapshot: () => FlightSnapshot | null;
}

interface Props {
  seed?: number;
  onState?: (s: FlightSnapshot) => void;
  onShieldEmpty?: () => void;
  onBossDefeated?: () => void;
  onEnemyDestroyed?: (kind: EnemyKind) => void;
  onCollision?: () => void;
}

/**
 * 飞行竞技场：Canvas 引擎 + 鼠标/触摸闪避按钮。
 * 用 forwardRef 暴露命令给父组件，避免每帧 React 重渲染。
 */
export const FlightArena = forwardRef<FlightArenaHandle, Props>(function FlightArena(
  { seed = 12345, onState, onShieldEmpty, onBossDefeated, onEnemyDestroyed, onCollision }, ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FlightEngine | null>(null);
  const hooksRef = useRef({ onState, onShieldEmpty, onBossDefeated, onEnemyDestroyed, onCollision });
  hooksRef.current = { onState, onShieldEmpty, onBossDefeated, onEnemyDestroyed, onCollision };
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new FlightEngine(canvas, DEFAULT_FLIGHT_CONFIG, {
      onState: s => hooksRef.current.onState?.(s),
      onShieldEmpty: () => hooksRef.current.onShieldEmpty?.(),
      onBossDefeated: () => hooksRef.current.onBossDefeated?.(),
      onEnemyDestroyed: k => hooksRef.current.onEnemyDestroyed?.(k),
      onCollision: () => hooksRef.current.onCollision?.(),
    }, seed);
    engineRef.current = engine;
    engine.start();
    setReady(true);

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    const onVisibility = () => {
      if (document.hidden) engine.stop();
      else engine.start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      engine.stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      engineRef.current = null;
    };
  }, [seed]);

  useImperativeHandle(ref, () => ({
    fireOnCorrect: combo => engineRef.current?.fireOnCorrect(combo),
    fireOnWrong: () => engineRef.current?.fireOnWrong(),
    beginBoss: hp => engineRef.current?.beginBoss(hp),
    reset: () => engineRef.current?.reset(),
    refillShield: () => engineRef.current?.refillShield(),
    setMove: dir => engineRef.current?.setMove(dir),
    getSnapshot: () => engineRef.current?.getSnapshot() ?? null,
  }), []);

  const press = (dir: -1 | 0 | 1) => () => engineRef.current?.setMove(dir);

  return (
    <div className="flight-arena" data-testid="flight-arena">
      <canvas ref={canvasRef} className="flight-canvas" aria-label="飞行战斗画面" />
      {!ready && <div className="arena-loading">飞船准备中…</div>}
      <div className="steer-controls">
        <button
          className="steer-btn"
          aria-label="向左移动"
          onPointerDown={press(-1)} onPointerUp={press(0)} onPointerLeave={press(0)}
          onPointerCancel={press(0)}
        >◀</button>
        <button
          className="steer-btn"
          aria-label="向右移动"
          onPointerDown={press(1)} onPointerUp={press(0)} onPointerLeave={press(0)}
          onPointerCancel={press(0)}
        >▶</button>
      </div>
    </div>
  );
});
