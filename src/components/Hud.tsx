import type { AppController } from '../application/appController';

interface Props {
  app: AppController;
  onOpenParent: () => void;
  onSoundToggle: () => void;
  sfxOn: boolean;
}

export function Hud({ app, onOpenParent, onSoundToggle, sfxOn }: Props) {
  const p = app.profile;
  return (
    <header className="hud">
      <div className="hud-brand">
        <span className="hud-logo">🚀</span>
        <div>
          <div className="hud-title">星际数学小勇士</div>
          <div className="hud-slogan">算出答案，给飞船充能！</div>
        </div>
      </div>
      <div className="hud-stats">
        <div className="hud-stat"><span>⭐</span><strong>{p.totalStars}</strong></div>
        <div className="hud-stat"><span>🏅</span><strong>{p.achievements.length}</strong></div>
        <div className="hud-stat"><span>🗺️</span><strong>{p.unlockedLevels.length - 1}/56</strong></div>
        <button className="hud-icon-btn" onClick={onSoundToggle} title={sfxOn ? '关闭音效' : '开启音效'} aria-label={sfxOn ? '关闭音效' : '开启音效'}>
          {sfxOn ? '🔊' : '🔇'}
        </button>
        <button className="hud-icon-btn" onClick={onOpenParent} title="家长面板" aria-label="打开家长面板">👨‍👩‍👧</button>
      </div>
    </header>
  );
}
