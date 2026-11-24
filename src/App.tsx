import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './hooks/useApp';
import { Starfield } from './components/Starfield';
import { Hud } from './components/Hud';
import { StarMap } from './components/StarMap';
import { QuestionCard } from './components/QuestionCard';
import { ResultView } from './components/ResultView';
import { FlightArena, type FlightArenaHandle } from './components/FlightArena';
import { ParentPanel } from './components/ParentPanel';
import { Celebration, type Burst } from './components/Celebration';
import { SoundService, VOICE_LINES } from './application/soundService';
import { comboMultiplier } from './application/rewardService';

/** 每关最后 N 题为 Boss 战：召唤 N 血 Boss，答对一题削 1 血，全部答对即可击败 */
const BOSS_QUESTIONS = 3;

export function App() {
  const app = useApp();
  const q = app.currentQuestion();
  const [showParent, setShowParent] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId = useRef(0);
  const sound = useMemo(() => new SoundService(app.profile.settings), []); // eslint-disable-line react-hooks/exhaustive-deps
  const prevView = useRef(app.view);
  const prevFeedback = useRef(app.feedback);

  useEffect(() => { sound.updateSettings(app.profile.settings); }, [sound, app.profile.settings]);

  // 背景音乐：整个游戏过程（含星图）持续播放，受设置开关控制
  useEffect(() => { sound.startMusic(); }, [sound]);

  // 浏览器自动播放策略：首次点击/按键后恢复被挂起的音频上下文，确保刷新后也能出声
  useEffect(() => {
    const resume = () => sound.resumeAudio();
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, [sound]);

  const arenaRef = useRef<FlightArenaHandle>(null);
  const [flightState, setFlightState] = useState({ shield: 3, score: 0, combo: 0, boss: null as { hp: number; maxHp: number } | null });
  const bossStartedRef = useRef(false);
  const prevBossView = useRef(app.view);
  // 每次进入关卡生成一次稳定种子，避免重渲染导致引擎反复重置
  const combatSeed = useMemo(() => Math.floor(Math.random() * 0xffffffff) >>> 0, [app.view, app.activeLevel?.id]);

  const spawnBurst = useCallback((kind: Burst['kind'], x = window.innerWidth / 2, y = window.innerHeight * 0.4) => {
    setBursts(b => [...b, { id: ++burstId.current, kind, x, y }]);
  }, []);
  const removeBurst = useCallback((id: number) => setBursts(b => b.filter(x => x.id !== id)), []);

  // 反馈与视图变化 → 音效、语音、粒子特效
  useEffect(() => {
    const fb = app.feedback;
    if (fb && fb !== prevFeedback.current) {
      const combo = q?.combo ?? 0;
      if (app.view === 'flying') {
        // 战斗：答对发射激光+冲刺，答错掉护盾
        if (fb.correct) {
          arenaRef.current?.fireOnCorrect(combo);
          sound.playSfx('laser');
          if (combo >= 5) sound.playSfx('combo');
          sound.speakCorrect(combo);
        } else {
          arenaRef.current?.fireOnWrong();
          sound.playSfx('hit');
          sound.speak(VOICE_LINES.wrong);
        }
      } else {
        if (fb.correct) {
          sound.playSfx(combo >= 5 ? 'combo' : 'correct');
          sound.speakCorrect(combo);
          spawnBurst(combo >= 5 ? 'combo' : 'correct');
          if (comboMultiplier(combo) > 1) sound.playSfx('star');
        } else {
          sound.playSfx('wrong');
          sound.speak(VOICE_LINES.wrong);
        }
      }
    }
    prevFeedback.current = fb;
  }, [app.feedback, q?.combo, sound, spawnBurst]);

  // 答对后自动进入下一题（最后一题自动结算）：留出短暂时间看夸奖与激光特效，无需再点「下一题」
  useEffect(() => {
    const fb = app.feedback;
    if (!fb || !fb.correct) return;
    const timer = window.setTimeout(() => app.advance(), 800);
    return () => window.clearTimeout(timer);
  }, [app.feedback, app]);

  useEffect(() => {
    if (app.view === 'result' && prevView.current !== 'result') {
      sound.playSfx('levelClear');
      sound.speak(VOICE_LINES.levelClear);
      spawnBurst('levelClear');
    }
    prevView.current = app.view;
  }, [app.view, sound, spawnBurst]);

  // Boss 战：进入最后 3 题时召唤 3 血 Boss，答对一题削 1 血，答对全部 3 题即可击败
  useEffect(() => {
    if (prevBossView.current !== 'flying' && app.view === 'flying') bossStartedRef.current = false;
    prevBossView.current = app.view;
    if (app.view === 'flying' && q && !app.feedback && !bossStartedRef.current
      && q.index >= Math.max(0, q.total - BOSS_QUESTIONS)) {
      bossStartedRef.current = true;
      arenaRef.current?.beginBoss(Math.min(BOSS_QUESTIONS, q.total - q.index));
    }
  }, [app.view, q?.index, q?.total, app.feedback]);

  // 键盘：←→ 闪避，1-4 作答，H 提示，Enter 下一题
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showParent) return;
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return;
      if (app.view === 'flying') {
        if (e.key === 'ArrowLeft') { arenaRef.current?.setMove(-1); return; }
        if (e.key === 'ArrowRight') { arenaRef.current?.setMove(1); return; }
      }
      if (app.view === 'flying' && !app.feedback && q) {
        // 填数字模式下禁用 1-4 快捷选项，避免与输入框打字冲突
        if (app.profile.settings.answerMode !== 'input') {
          const idx = ['1', '2', '3', '4'].indexOf(e.key);
          if (idx >= 0 && q.question.options[idx] !== undefined) { app.submitAnswer(q.question.options[idx]); return; }
        }
        if (e.key.toLowerCase() === 'h') { app.requestHint(); return; }
      }
      if (app.feedback && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); app.advance(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') arenaRef.current?.setMove(0);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); };
  }, [app, q, showParent, app.profile.settings.answerMode]);

  // 每日时长提醒
  useEffect(() => {
    const limit = app.profile.settings.dailyMinutes;
    if (limit <= 0 || app.view !== 'flying') return;
    const timer = window.setTimeout(() => {
      if (confirm('今天的探险时间到啦！休息一下，明天再来吧～')) app.goMap();
    }, limit * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [app.view, app.profile.settings.dailyMinutes, app]);

  return (
    <div className={`app-shell ${app.profile.settings.fontSize === 'large' ? 'font-large' : ''}`}>
      <Starfield />
      <Celebration bursts={bursts} onDone={removeBurst} />
      <div className="app-content">
        <Hud app={app} onOpenParent={() => {
          sound.playSfx('click');
          setShowParent(true);
        }} onSoundToggle={() => {
          const next = !app.profile.settings.sfx;
          app.updateSettings({ sfx: next });
          sound.updateSettings({ ...app.profile.settings, sfx: next });
          if (next) sound.playSfx('click');
        }} sfxOn={app.profile.settings.sfx} />
        <main className="app-main">
          {app.view === 'map' && <StarMap app={app} />}
          {app.view === 'flying' && q && (
            <div className="combat-view">
              <FlightArena
                ref={arenaRef}
                seed={combatSeed}
                onState={(s) => setFlightState({ shield: s.shield, score: s.score, combo: s.combo, boss: s.boss })}
                onShieldEmpty={() => {
                  // 防挫败：护盾耗尽不结束游戏，短暂停顿后自动补满
                  window.setTimeout(() => arenaRef.current?.refillShield(), 900);
                  sound.speak('护盾充满啦，继续加油！');
                }}
                onBossDefeated={() => { sound.playSfx('boss'); sound.speak('击败 Boss，太厉害啦！'); }}
                onEnemyDestroyed={() => sound.playSfx('explosion')}
                onCollision={() => sound.playSfx('hit')}
              />
              <div className="combat-hud">
                <div className="combat-stat"><span>🛡️ 护盾</span><strong>{'❤️'.repeat(flightState.shield)}{'🖤'.repeat(Math.max(0, 3 - flightState.shield))}</strong></div>
                <div className="combat-stat"><span>⭐ 得分</span><strong>{flightState.score}</strong></div>
                {flightState.boss && <div className="combat-stat boss-hp"><span>👾 Boss</span><strong>{'💥'.repeat(flightState.boss.hp)}</strong></div>}
              </div>
              {q.index >= q.total - BOSS_QUESTIONS && <div className="boss-alert">⚠️ 最终 Boss 出现！答对全部 {Math.min(BOSS_QUESTIONS, q.total - q.index)} 题击败它！</div>}
              <QuestionCard
                app={app}
                question={q.question}
                index={q.index}
                total={q.total}
                combo={q.combo}
                difficulty={q.difficulty}
                onSpeak={() => sound.speak(`${q.question.stem} 等于多少？`)}
              />
            </div>
          )}
          {app.view === 'result' && app.lastOutcome && (
            <ResultView app={app} outcome={app.lastOutcome} />
          )}
        </main>
        <footer className="app-footer">算出答案，给飞船充能！ · 星际数学小勇士</footer>
      </div>
      {showParent && <ParentPanel app={app} onClose={() => setShowParent(false)} />}
    </div>
  );
}
