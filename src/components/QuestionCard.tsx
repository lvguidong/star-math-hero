import { useEffect, useRef, useState } from 'react';
import type { AppController } from '../application/appController';
import type { Question } from '../domain/types';

interface Props {
  app: AppController;
  question: Question;
  index: number;
  total: number;
  combo: number;
  difficulty: number;
  onSpeak: () => void;
}

/** 题干展示：应用题显示情境文字，比多少/连加等题型也可用 context */
export function QuestionStem({ question, onSpeak }: { question: Question; onSpeak?: () => void }) {
  return (
    <div className="question-stem">
      {question.context && <p className="question-context">{question.context}</p>}
      <div className="question-equation">{question.stem}</div>
      {onSpeak && <button className="speak-btn" onClick={onSpeak} title="朗读题目" aria-label="朗读题目">🗣️ 读题</button>}
    </div>
  );
}

function AnswerInput({ app, question, answered }: { app: AppController; question: Question; answered: boolean }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 换题时清空草稿与错误提示
  useEffect(() => { setDraft(''); setError(''); inputRef.current?.focus(); }, [question.id]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answered) return;
    const value = Number(draft.trim());
    if (!/^\d+$/.test(draft.trim()) || !Number.isInteger(value) || value < 0 || value > 100) {
      setError('请输入 0～100 的数字');
      return;
    }
    setError('');
    app.submitAnswer(value);
  };

  return (
    <form className="answer-form" onSubmit={submit} noValidate>
      <div className="answer-row">
        <input
          ref={inputRef}
          className="answer-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={draft}
          disabled={answered}
          aria-label="输入答案"
          placeholder="?"
          onChange={e => { setDraft(e.target.value); setError(''); }}
        />
        <button className="answer-submit" type="submit" disabled={answered}>🚀 发射！</button>
      </div>
      <div className="answer-error" role="alert">{error}</div>
    </form>
  );
}

export function QuestionCard({ app, question, index, total, combo, difficulty, onSpeak }: Props) {
  const feedback = app.feedback;
  const answered = feedback !== null;
  const inputMode = app.profile.settings.answerMode === 'input';
  return (
    <div className="question-card">
      <div className="question-top">
        <div className="question-progress">
          <span>第 {index + 1} / {total} 题</span>
          <div className="progress-bar"><div style={{ width: `${(index / total) * 100}%` }} /></div>
        </div>
        <div className="question-badges">
          {combo >= 2 && <span className="combo-badge">🔥 {combo} 连击</span>}
          <span className="difficulty-badge">难度 {'★'.repeat(difficulty)}</span>
        </div>
      </div>

      <QuestionStem question={question} onSpeak={onSpeak} />

      {inputMode ? (
        <AnswerInput app={app} question={question} answered={answered} />
      ) : (
        <div className="options-grid">
          {question.options.map((opt) => {
            let cls = 'option-btn';
            if (answered && opt === question.answer) cls += ' correct';
            return (
              <button
                key={opt}
                className={cls}
                disabled={answered}
                onClick={() => app.submitAnswer(opt)}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {!answered && app.hints.length > 0 && (
        <div className="hint-box">
          <div className="hint-title">💡 嘀嗒的提示</div>
          {app.hints.map((h, i) => <p key={i}>{i + 1}. {h}</p>)}
        </div>
      )}

      {!answered && (
        <button className="hint-btn" onClick={() => app.requestHint()} disabled={app.hints.length >= 3}>
          {app.hints.length >= 3 ? '提示已用完' : `💡 需要提示（还剩 ${3 - app.hints.length} 次）`}
        </button>
      )}

      {answered && (
        <div className={`feedback-banner ${feedback!.correct ? 'ok' : 'oops'}`}>
          <div className="feedback-icon">{feedback!.correct ? '🎉' : '🤔'}</div>
          <div>
            <strong>{feedback!.correct ? '答对啦！飞船充能 +1' : `再想想～正确答案是 ${question.answer}`}</strong>
            {feedback!.difficultyChanged && <div className="difficulty-change">{feedback!.difficultyChanged}</div>}
          </div>
          {feedback!.correct ? (
            <span className="auto-advance">✨ 自动前进…</span>
          ) : (
            <button className="primary-btn small" onClick={() => app.advance()}>
              继续 →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
