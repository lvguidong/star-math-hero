import type { AppController } from '../application/appController';
import { CHAPTERS, isChapterUnlocked } from '../domain/levels';
import type { Chapter } from '../domain/levels';
import { CARDS, PETS } from '../domain/collection';

function Stars({ count }: { count: number }) {
  return <span className="level-stars">{'★'.repeat(count)}{'☆'.repeat(3 - count)}</span>;
}

function ChapterCard({ chapter, app }: { chapter: Chapter; app: AppController }) {
  const unlocked = isChapterUnlocked(chapter.id, app.profile);
  return (
    <section className={`chapter-card ${unlocked ? '' : 'chapter-locked'}`} style={{ '--chapter-color': chapter.color } as React.CSSProperties}>
      <div className="chapter-head">
        <span className="chapter-icon">{unlocked ? chapter.icon : '🔒'}</span>
        <div>
          <h2>{chapter.title}</h2>
          <p>{unlocked ? chapter.description : '通关上一章全部关卡后解锁'}</p>
        </div>
        <span className="chapter-progress">
          {chapter.levels.filter(l => app.starsOf(l.id) > 0).length}/{chapter.levels.length}
        </span>
      </div>
      <div className="level-grid">
        {chapter.levels.map((level) => {
          const levelUnlocked = unlocked && app.isLevelUnlocked(level.id);
          const stars = app.starsOf(level.id);
          return (
            <button
              key={level.id}
              className={`level-node ${levelUnlocked ? '' : 'locked'} ${level.boss ? 'boss' : ''} ${stars === 3 ? 'perfect' : ''}`}
              disabled={!levelUnlocked}
              onClick={() => app.startLevel(level)}
              title={levelUnlocked ? level.title : '尚未解锁'}
            >
              <span className="level-badge">{level.boss ? '👑' : level.id.split('-')[1]}</span>
              <span className="level-name">{level.title}</span>
              <Stars count={stars} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function StarMap({ app }: { app: AppController }) {
  return (
    <div className="map-view">
      <div className="map-hero">
        <div className="map-hero-text">
          <span className="eyebrow">银河系 · 二年级数学探索</span>
          <h1>吕一漪选择你的星系，开始探险！</h1>
          <p>每答对一题，就给飞船充一份能量。集齐星星，解锁更远的星系！</p>
        </div>
        <div className="map-rocket" aria-hidden="true">🚀✨</div>
      </div>
      <section className="collection-shelf">
        <div className="shelf-head">
          <h2>🌟 我的收藏</h2>
          <span>答对题目点亮图鉴 · 攒星星领养外星宠物</span>
        </div>
        <div className="shelf-row">
          <span className="shelf-label">星星图鉴 {app.profile.collectedCards.length}/{CARDS.length}</span>
          <div className="shelf-items">
            {CARDS.map(c => (
              <span key={c.id} title={`${c.name}：${c.description}`} className={`shelf-item ${app.profile.collectedCards.includes(c.id) ? 'got' : ''}`}>
                {app.profile.collectedCards.includes(c.id) ? c.icon : '❔'}
              </span>
            ))}
          </div>
        </div>
        <div className="shelf-row">
          <span className="shelf-label">外星宠物 {app.profile.pets.length}/{PETS.length}</span>
          <div className="shelf-items">
            {PETS.map(p => (
              <span key={p.id} title={app.profile.pets.includes(p.id) ? p.name : `${p.name}：需要 ${p.starsNeeded} 颗星`} className={`shelf-item ${app.profile.pets.includes(p.id) ? 'got' : ''}`}>
                {app.profile.pets.includes(p.id) ? p.icon : '🔒'}
              </span>
            ))}
          </div>
        </div>
      </section>
      <div className="chapter-list">
        {CHAPTERS.map(c => <ChapterCard key={c.id} chapter={c} app={app} />)}
      </div>
    </div>
  );
}
