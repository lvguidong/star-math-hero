import type { AppController, LevelOutcome } from '../application/appController';
import { getLevel } from '../domain/levels';
import { CARDS, PETS } from '../domain/collection';

function Stars({ count }: { count: number }) {
  return (
    <div className="result-stars">
      {[1, 2, 3].map(n => (
        <span key={n} className={n <= count ? 'earned' : ''}>★</span>
      ))}
    </div>
  );
}

export function ResultView({ app, outcome }: { app: AppController; outcome: LevelOutcome }) {
  const level = getLevel(outcome.levelId);
  const cheer = outcome.stars === 3 ? '完美航行！' : outcome.stars === 2 ? '很棒，继续加油！' : '完成啦，再练一次会更棒！';
  return (
    <div className="result-view">
      <div className="result-card">
        <div className="result-rocket">{outcome.stars === 3 ? '🏆' : '🚀'}</div>
        <h1>{cheer}</h1>
        <p className="result-sub">{level?.title} · 闯关成功</p>
        <Stars count={outcome.stars} />

        <div className="result-grid">
          <div className="result-item"><span>答对</span><strong>{outcome.correct}/{outcome.total}</strong></div>
          <div className="result-item"><span>正确率</span><strong>{Math.round(outcome.accuracy * 100)}%</strong></div>
          <div className="result-item"><span>最佳连击</span><strong>🔥 {outcome.bestCombo}</strong></div>
          <div className="result-item"><span>用时</span><strong>{(outcome.totalTimeMs / 1000).toFixed(0)} 秒</strong></div>
        </div>

        {outcome.reward.starsEarned > 0 && (
          <p className="reward-line">⭐ 获得 {outcome.reward.starsEarned} 颗新星！</p>
        )}
        {outcome.reward.newAchievements.length > 0 && (
          <p className="reward-line">🏅 新成就：{outcome.reward.newAchievements.join('、')}</p>
        )}
        {outcome.reward.unlocked && (
          <p className="reward-line">🔓 解锁新关卡：{outcome.reward.unlocked}</p>
        )}
        {outcome.healedIds.length > 0 && (
          <p className="reward-line">💚 治好了 {outcome.healedIds.length} 道错题！</p>
        )}
        {outcome.newCards.length > 0 && (
          <p className="reward-line">🃏 新图鉴：{outcome.newCards.map(id => CARDS.find(c => c.id === id)?.name ?? id).join('、')}</p>
        )}
        {outcome.newPets.length > 0 && (
          <p className="reward-line">🐾 新宠物：{outcome.newPets.map(id => PETS.find(p => p.id === id)?.name ?? id).join('、')}</p>
        )}

        <div className="result-actions">
          <button className="primary-btn" onClick={() => app.goMap()}>返回星图</button>
          <button className="secondary-btn" onClick={() => app.replay()}>再玩一次</button>
        </div>
      </div>
    </div>
  );
}
