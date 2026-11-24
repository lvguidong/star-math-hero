import { useMemo, useState } from 'react';
import type { AppController } from '../application/appController';
import { buildReport, radarData, reportSummary } from '../domain/report';
import { exportSaveCode, importSaveCode } from '../application/saveRepository';

const TYPE_LABELS: Record<string, string> = {
  addTens: '整十数加减', add1NoCarry: '不进位加法', sub1NoBorrow: '不退位减法',
  addCarry: '进位加法', subBorrow: '退位减法', chain: '连加连减',
  compare: '比多少', word: '应用题',
};

export function ParentPanel({ app, onClose }: { app: AppController; onClose: () => void }) {
  const [tab, setTab] = useState<'report' | 'settings' | 'data'>('report');
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');
  const report = useMemo(() => buildReport(app.profile), [app.profile]);
  const radar = useMemo(() => radarData(report), [report]);
  const s = app.profile.settings;

  const update = (patch: Partial<typeof s>) => {
    app.updateSettings(patch);
    setMessage('设置已保存');
  };

  const doExport = () => {
    const code = exportSaveCode(app.profile);
    navigator.clipboard?.writeText(code).then(
      () => setMessage('存档码已复制到剪贴板'),
      () => { setMessage('复制失败，请手动选择下方文本'); setImportText(code); },
    ).catch(() => { setMessage('请手动选择下方文本'); setImportText(code); });
  };

  const doImport = () => {
    const p = importSaveCode(importText.trim());
    if (!p) { setMessage('存档码无效，请检查后重试'); return; }
    app.replaceProfile(p);
    setMessage('存档导入成功！');
    setImportText('');
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="家长面板">
      <div className="parent-panel">
        <div className="panel-head">
          <h2>👨‍👩‍👧 家长面板</h2>
          <button className="close-btn" onClick={onClose} aria-label="关闭">✕</button>
        </div>
        <nav className="panel-tabs">
          <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>学习报告</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>设置</button>
          <button className={tab === 'data' ? 'active' : ''} onClick={() => setTab('data')}>存档管理</button>
        </nav>

        {tab === 'report' && (
          <div className="panel-body">
            <p className="report-summary">{reportSummary(report)}</p>
            <div className="report-stats">
              <div><span>累计星星</span><strong>{report.totalStars}</strong></div>
              <div><span>通关数</span><strong>{report.completedLevels}/56</strong></div>
              <div><span>正确率</span><strong>{Math.round(report.overallAccuracy * 100)}%</strong></div>
              <div><span>今日练习</span><strong>{report.dailyAnswered} 题</strong></div>
            </div>
            <h3>知识点掌握度</h3>
            <div className="mastery-grid">
              {radar.map(r => (
                <div key={r.type} className="mastery-item">
                  <div className="mastery-label"><span>{TYPE_LABELS[r.type] ?? r.type}</span><span>{r.value}%</span></div>
                  <div className="mastery-bar"><div style={{ width: `${r.value}%` }} className={r.value < 60 ? 'weak' : ''} /></div>
                </div>
              ))}
            </div>
            {report.weakTypes.length > 0 && (
              <p className="weak-hint">💡 薄弱题型：{report.weakTypes.map(t => TYPE_LABELS[t] ?? t).join('、')}，建议用错题本重练。</p>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="panel-body settings-body">
            <label className="switch-row">
              <span>🔊 音效<small>答对、连击、星星的提示音</small></span>
              <input type="checkbox" checked={s.sfx} onChange={e => update({ sfx: e.target.checked })} />
            </label>
            <label className="switch-row">
              <span>🗣️ 语音朗读<small>嘀嗒用中文朗读题目与鼓励</small></span>
              <input type="checkbox" checked={s.voice} onChange={e => update({ voice: e.target.checked })} />
            </label>
            <label className="switch-row">
              <span>🎵 背景音乐<small>轻快的太空电子乐</small></span>
              <input type="checkbox" checked={s.music} onChange={e => update({ music: e.target.checked })} />
            </label>
            <label className="switch-row">
              <span>🔠 大字号<small>放大题目与按钮文字</small></span>
              <input type="checkbox" checked={s.fontSize === 'large'} onChange={e => update({ fontSize: e.target.checked ? 'large' : 'normal' })} />
            </label>
            <label className="switch-row">
              <span>⌨️ 填数字作答<small>关闭 = 四选一；开启 = 自己输入答案</small></span>
              <input type="checkbox" checked={s.answerMode === 'input'}
                onChange={e => update({ answerMode: e.target.checked ? 'input' : 'choices' })} />
            </label>
            <label className="number-row">
              <span>⏱️ 每日时长上限（分钟）<small>0 = 不限时</small></span>
              <input type="number" min={0} max={120} value={s.dailyMinutes}
                onChange={e => update({ dailyMinutes: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
          </div>
        )}

        {tab === 'data' && (
          <div className="panel-body settings-body">
            <p className="hint-text">进度保存在本机浏览器。换电脑时可导出/导入存档码。</p>
            <button className="secondary-btn" onClick={doExport}>📤 导出存档码</button>
            <textarea
              className="save-textarea" placeholder="粘贴存档码后点击导入"
              value={importText} onChange={e => setImportText(e.target.value)}
            />
            <button className="primary-btn" onClick={doImport}>📥 导入存档</button>
            <button className="danger-btn" onClick={() => {
              if (confirm('确定清空所有进度吗？此操作不可撤销。')) { app.resetProfile(); setMessage('进度已清空'); }
            }}>🗑️ 清空进度</button>
          </div>
        )}

        {message && <div className="panel-message" role="status">{message}</div>}
      </div>
    </div>
  );
}
