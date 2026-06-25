import { useMemo, useState, useEffect, useCallback } from 'react';
import { AEON_DIFFICULTY, TOPIC_SUGGESTIONS } from '../constants';
import { addAeonArticle, deleteAeonArticle, updateAeonArticle, updateAeonArticleFields } from '../hooks/useAeonArticles';
import { updateEntry } from '../hooks/useEntries';
import { formatPretty, todayStr, formatShort } from '../utils/dates';
import { defineWordWithGemini, gradeAeonSummaryWithGemini, generateAeonQuizWithGemini } from '../utils/ai';
import Modal from './Modal';
import ReadingSpeedTrend from './ReadingSpeedTrend';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function blankForm() {
  return {
    date: todayStr(),
    title: '',
    topic: '',
    difficulty: 'Medium',
    summary: '',
    vocab: [{ word: '', meaning: '' }],
    link: '',
    timeTaken: '',
    wordCount: '',
    content: '',
  };
}

export default function AeonLog({ articles, entries = [], readOnly = false }) {
  const [tab, setTab] = useState('log');
  const [editing, setEditing] = useState(null);
  
  // States for interactive modals
  const [activeGradeArticle, setActiveGradeArticle] = useState(null);
  const [activeQuizArticle, setActiveQuizArticle] = useState(null);
  const [showVocabQuiz, setShowVocabQuiz] = useState(false);

  return (
    <div>
      <div className="subtab-row">
        <button className={`subtab ${tab === 'log' ? 'subtab--active' : ''}`} onClick={() => setTab('log')}>Articles</button>
        <button className={`subtab ${tab === 'vocab' ? 'subtab--active' : ''}`} onClick={() => setTab('vocab')}>Vocab bank</button>
        <button className={`subtab ${tab === 'analysis' ? 'subtab--active' : ''}`} onClick={() => setTab('analysis')}>Analysis</button>
      </div>

      {tab === 'log' ? (
        <>
          {!readOnly && <AeonForm />}
          <ArticleList 
            articles={articles} 
            readOnly={readOnly} 
            onEdit={setEditing} 
            onGradeSummary={setActiveGradeArticle}
            onPlayQuiz={setActiveQuizArticle}
          />
        </>
      ) : tab === 'vocab' ? (
        <VocabBank 
          articles={articles} 
          entries={entries} 
          onPlayVocabQuiz={() => setShowVocabQuiz(true)}
        />
      ) : (
        <AeonAnalysis articles={articles} />
      )}

      {editing && (
        <Modal title="Edit article" onClose={() => setEditing(null)}>
          <AeonForm editArticle={editing} onDone={() => setEditing(null)} />
        </Modal>
      )}

      {activeGradeArticle && (
        <Modal title="AI Summary Grading" onClose={() => setActiveGradeArticle(null)}>
          <SummaryGradingModal article={activeGradeArticle} onClose={() => setActiveGradeArticle(null)} />
        </Modal>
      )}

      {activeQuizArticle && (
        <Modal title="CAT RC Quiz" onClose={() => setActiveQuizArticle(null)}>
          <CATRCQuizModal article={activeQuizArticle} onClose={() => setActiveQuizArticle(null)} />
        </Modal>
      )}

      {showVocabQuiz && (
        <Modal title="Vocab Revision Quiz" onClose={() => setShowVocabQuiz(false)}>
          <VocabQuizModal articles={articles} entries={entries} onClose={() => setShowVocabQuiz(false)} />
        </Modal>
      )}
    </div>
  );
}

function AeonForm({ editArticle = null, onDone = null }) {
  const [form, setForm] = useState(editArticle ? {
    date: editArticle.date,
    title: editArticle.title,
    topic: editArticle.topic,
    difficulty: editArticle.difficulty,
    summary: editArticle.summary || '',
    vocab: editArticle.vocab?.length ? editArticle.vocab : [{ word: '', meaning: '' }],
    link: editArticle.link || '',
    timeTaken: editArticle.timeTaken || '',
    wordCount: editArticle.wordCount || '',
    content: editArticle.content || '',
  } : blankForm());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const isEdit = Boolean(editArticle);
  const [definingIdx, setDefiningIdx] = useState(null);

  function updateVocab(idx, patch) {
    setForm((f) => ({ ...f, vocab: f.vocab.map((v, i) => (i === idx ? { ...v, ...patch } : v)) }));
  }
  function addVocabRow() {
    setForm((f) => ({ ...f, vocab: [...f.vocab, { word: '', meaning: '' }] }));
  }
  function removeVocabRow(idx) {
    setForm((f) => ({ ...f, vocab: f.vocab.length === 1 ? f.vocab : f.vocab.filter((_, i) => i !== idx) }));
  }
  async function handleAutoDefine(idx, word) {
    if (!word) return;
    const key = localStorage.getItem('gemini_api_key');
    if (!key) {
      alert('Please save a Gemini API key in the AI Log Zone first!');
      return;
    }
    setDefiningIdx(idx);
    try {
      const meaning = await defineWordWithGemini(word, key);
      updateVocab(idx, { meaning });
    } catch (err) {
      console.error(err);
      alert('Failed to fetch meaning. Please type it manually.');
    } finally {
      setDefiningIdx(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setStatus({ type: 'error', msg: 'Give the article a title.' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateAeonArticle(editArticle.id, form);
        onDone?.();
      } else {
        await addAeonArticle(form);
        setStatus({ type: 'success', msg: 'Article logged.' });
        setForm(blankForm());
      }
    } catch (e2) {
      setStatus({ type: 'error', msg: e2.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={isEdit ? '' : 'card aeon-form'} onSubmit={handleSubmit}>
      {!isEdit && <h3>Log an article</h3>}
      <div className="row-card__grid">
        <label>Date<input type="date" max={todayStr()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
        <label className="aeon-title">Title<input value={form.title} placeholder="Article title" onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
        <label>
          Topic
          <input list="aeon-topics" value={form.topic} placeholder="e.g. Philosophy" onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          <datalist id="aeon-topics">
            {TOPIC_SUGGESTIONS['Reading Comprehension'].map((t) => <option key={t} value={t} />)}
          </datalist>
        </label>
        <label>
          Difficulty
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
            {AEON_DIFFICULTY.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label>Link <span className="optional">(optional)</span><input type="url" value={form.link} placeholder="https://..." onChange={(e) => setForm({ ...form, link: e.target.value })} /></label>
        <label>Time taken (min)<input type="number" min="0" step="0.5" value={form.timeTaken} onChange={(e) => setForm({ ...form, timeTaken: e.target.value })} /></label>
        <label>Word count<input type="number" min="0" value={form.wordCount} onChange={(e) => setForm({ ...form, wordCount: e.target.value })} /></label>
      </div>

      {Number(form.timeTaken) > 0 && Number(form.wordCount) > 0 && (
        <p className="insight">Reading speed: <strong>{Math.round(Number(form.wordCount) / Number(form.timeTaken))} wpm</strong></p>
      )}

      <label className="aeon-summary">
        Summary <span className="optional">(2-3 lines, in your own words)</span>
        <textarea
          rows={3}
          value={form.summary}
          placeholder="What was the article actually arguing?"
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />
      </label>

      <details style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer' }}>
        <summary style={{ fontWeight: 600, fontSize: '13px' }}>📋 Advanced: Paste Article Content Manually (Alternative)</summary>
        <div style={{ marginTop: '12px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
          <label className="aeon-summary" style={{ margin: 0 }}>
            Full Text or Key Passages <span className="optional">(Optional - if website has paywalls or limits)</span>
            <textarea
              rows={5}
              value={form.content}
              placeholder="Paste article text here..."
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              style={{ fontSize: '13px', padding: '10px' }}
            />
          </label>
        </div>
      </details>

      <div className="vocab-editor">
        <span className="row-card__tags-label">New vocabulary</span>
        {form.vocab.map((v, idx) => (
          <div key={idx} className="vocab-editor__row">
            <input placeholder="word" value={v.word} onChange={(e) => updateVocab(idx, { word: e.target.value })} />
            <button
              type="button"
              className="btn btn--ghost btn--sm define-btn"
              style={{ padding: '4px 8px', minHeight: 'auto', alignSelf: 'center' }}
              disabled={definingIdx === idx || !v.word}
              onClick={() => handleAutoDefine(idx, v.word)}
              title="Define word with AI"
            >
              {definingIdx === idx ? '⏳' : '✨'}
            </button>
            <input placeholder="meaning" value={v.meaning} onChange={(e) => updateVocab(idx, { meaning: e.target.value })} />
            {form.vocab.length > 1 && (
              <button type="button" className="icon-btn" onClick={() => removeVocabRow(idx)}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn--ghost btn--sm" onClick={addVocabRow}>+ Add word</button>
      </div>

      <div className="entry-form__actions">
        {isEdit && <button type="button" className="btn btn--ghost" onClick={onDone}>Cancel</button>}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save article'}
        </button>
      </div>
      {status && <div className={`status status--${status.type}`}>{status.msg}</div>}
    </form>
  );
}

function ArticleList({ articles, readOnly, onEdit, onGradeSummary, onPlayQuiz }) {
  if (articles.length === 0) return <p className="empty">No articles logged yet.</p>;
  return (
    <div className="aeon-list">
      {articles.map((a) => (
        <div key={a.id} className="aeon-card">
          <div className="aeon-card__head">
            <strong>{a.title}</strong>
            <span className="aeon-card__meta">{a.topic} · {a.difficulty}{a.timeTaken ? ` · ${a.timeTaken} min` : ''} · {formatPretty(a.date)}</span>
            {a.readingSpeed > 0 && <span className="vocab-chip">{a.readingSpeed} wpm</span>}
            {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className="icon-btn">🔗</a>}
            {!readOnly && (
              <>
                <button className="icon-btn" onClick={() => onEdit(a)} aria-label="Edit">✎</button>
                <button className="icon-btn" onClick={() => deleteAeonArticle(a.id)} aria-label="Delete">🗑</button>
              </>
            )}
          </div>
          {a.summary && <p className="aeon-card__summary">{a.summary}</p>}

          {/* AI grading and quiz status indicators */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {a.summaryGrade && (
              <span className={`aeon-badge ${a.summaryGrade.score >= 80 ? 'aeon-badge--success' : 'aeon-badge--danger'}`}>
                Summary: {a.summaryGrade.score}% ({a.summaryGrade.score >= 80 ? 'Met' : 'Missed'})
              </span>
            )}
            {a.quizHighScore > 0 && (
              <span className="aeon-badge aeon-badge--success">
                Quiz High Score: {a.quizHighScore} pts
              </span>
            )}
          </div>

          {a.vocab?.length > 0 && (
            <div className="aeon-card__vocab" style={{ marginBottom: '8px' }}>
              {a.vocab.map((v, i) => (
                <span 
                  key={i} 
                  className="vocab-chip" 
                  title={v.meaning}
                  style={v.mastered ? { borderColor: 'var(--success)', color: 'var(--success)', background: 'rgba(54,143,99,0.06)' } : {}}
                >
                  {v.word}{v.mastered ? ' ✓' : ''}
                </span>
              ))}
            </div>
          )}

          {!readOnly && (
            <div className="aeon-card__actions">
              {a.summary && (
                <button className="btn btn--ghost btn--sm" onClick={() => onGradeSummary(a)}>
                  ✨ {a.summaryGrade ? 'View Summary Grade' : 'Grade Summary'}
                </button>
              )}
              <button className="btn btn--ghost btn--sm" onClick={() => onPlayQuiz(a)}>
                🎓 {a.quiz ? 'Play CAT Quiz' : 'Generate CAT Quiz'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VocabBank({ articles, entries = [], onPlayVocabQuiz }) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'learning', 'mastered'

  const words = useMemo(() => {
    const all = [];
    for (const a of articles) {
      for (const v of a.vocab || []) {
        if (v.word) all.push({ ...v, articleTitle: a.title, date: a.date, parentType: 'article', parentId: a.id, fullVocab: a.vocab });
      }
    }
    for (const e of (entries || [])) {
      for (const v of e.vocab || []) {
        if (v.word) all.push({ ...v, articleTitle: `Practice: ${e.topic}, ${e.date}`, date: e.date, parentType: 'entry', parentId: e.id, fullVocab: e.vocab });
      }
    }
    return all.sort((a, b) => a.word.localeCompare(b.word));
  }, [articles, entries]);

  const filtered = useMemo(() => {
    return words.filter((w) => {
      const matchSearch = w.word.toLowerCase().includes(search.toLowerCase());
      if (filterMode === 'mastered') return matchSearch && w.mastered;
      if (filterMode === 'learning') return matchSearch && !w.mastered;
      return matchSearch;
    });
  }, [words, search, filterMode]);

  async function toggleMastery(wordObj) {
    const newVocab = wordObj.fullVocab.map(v => 
      v.word === wordObj.word ? { ...v, mastered: !v.mastered } : v
    );
    try {
      if (wordObj.parentType === 'article') {
        await updateAeonArticleFields(wordObj.parentId, { vocab: newVocab });
      } else {
        await updateEntry(wordObj.parentId, { vocab: newVocab });
      }
    } catch (err) {
      console.error('Failed to toggle mastery:', err);
    }
  }

  return (
    <div className="card">
      <div className="card__head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
          <h3>Vocab bank ({words.length})</h3>
          {words.length > 0 && (
            <button className="btn btn--primary btn--sm vocab-revision-quiz-btn" onClick={onPlayVocabQuiz}>
              🧠 Play Revision Quiz
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '12px' }}>
          <input 
            type="text" 
            placeholder="Search words…" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ flex: 1 }}
          />
          <select 
            value={filterMode} 
            onChange={(e) => setFilterMode(e.target.value)}
            style={{ width: '130px', padding: '6px' }}
          >
            <option value="all">Show All</option>
            <option value="learning">Need Practice</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="empty">No words match yet.</p>
      ) : (
        <ul className="vocab-bank-list">
          {filtered.map((w, i) => (
            <li 
              key={i} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '10px 0', 
                borderBottom: '1px solid var(--border)',
                background: w.mastered ? 'rgba(54, 143, 99, 0.02)' : 'transparent'
              }}
            >
              <button 
                type="button"
                onClick={() => toggleMastery(w)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '16px',
                  marginRight: '12px',
                  padding: 0,
                  color: w.mastered ? 'var(--success)' : 'var(--text-secondary)'
                }}
                title={w.mastered ? "Mark as Learning" : "Mark as Mastered"}
              >
                {w.mastered ? '✓' : '○'}
              </button>
              <div style={{ flex: 1 }}>
                <strong style={w.mastered ? { color: 'var(--success)' } : {}}>{w.word}</strong>
                {w.meaning && <span className="vocab-bank-list__meaning"> — {w.meaning}</span>}
                <span className="vocab-bank-list__source"> · {w.articleTitle}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AeonAnalysis({ articles }) {
  const topicStats = useMemo(() => {
    const map = {};
    for (const a of articles) {
      if (a.wordCount > 0 && a.timeTaken > 0) {
        if (!map[a.topic]) map[a.topic] = [];
        map[a.topic].push(a);
      }
    }
    return Object.keys(map).map((topic) => {
      const list = map[topic];
      const count = list.length;
      const totalTime = list.reduce((acc, a) => acc + (Number(a.timeTaken) || 0), 0);
      const avgSpeed = Math.round(list.reduce((acc, a) => acc + (a.readingSpeed || 0), 0) / count);
      return { topic, count, totalTime, avgSpeed };
    }).sort((a, b) => b.avgSpeed - a.avgSpeed);
  }, [articles]);

  const speedDrilldown = useMemo(() => {
    return articles
      .filter((a) => a.wordCount > 0 && a.timeTaken > 0)
      .sort((a, b) => b.readingSpeed - a.readingSpeed);
  }, [articles]);

  return (
    <div className="dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <ReadingSpeedTrend articles={articles} />
        <SummaryComprehensionTrend articles={articles} />
      </div>

      <div className="card">
        <h3>Reading speed by topic</h3>
        {topicStats.length === 0 ? (
          <p className="empty">No topic data available.</p>
        ) : (
          <table className="day-table">
            <thead>
              <tr><th>Topic</th><th>Avg WPM</th><th>Articles Read</th><th>Total Time</th></tr>
            </thead>
            <tbody>
              {topicStats.map((s) => (
                <tr key={s.topic}>
                  <td style={{ fontWeight: 500 }}>{s.topic || 'General'}</td>
                  <td>{s.avgSpeed} wpm</td>
                  <td>{s.count}</td>
                  <td>{Math.round(s.totalTime)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginBottom: 64 }}>
        <h3>Passage speed drilldown</h3>
        {speedDrilldown.length === 0 ? (
          <p className="empty">Log a few articles with reading time and word count.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="day-table">
              <thead>
                <tr><th>Date</th><th>Article Title</th><th>Topic</th><th>Time</th><th>Words</th><th>Speed</th></tr>
              </thead>
              <tbody>
                {speedDrilldown.map((a) => (
                  <tr key={a.id}>
                    <td>{formatPretty(a.date)}</td>
                    <td style={{ fontWeight: 500 }}>{a.title}</td>
                    <td>{a.topic || '—'}</td>
                    <td>{a.timeTaken} min</td>
                    <td>{a.wordCount}</td>
                    <td><span className="vocab-chip">{a.readingSpeed} wpm</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// AI Modals & Helper Subcomponents
// ----------------------------------------------------

function SummaryGradingModal({ article, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [grade, setGrade] = useState(article.summaryGrade || null);

  const runGrading = useCallback(async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setError('Please configure your Gemini API Key in the AI Log Zone tab first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await gradeAeonSummaryWithGemini(article.title, article.link, article.summary, apiKey);
      setGrade(result);
      await updateAeonArticleFields(article.id, { summaryGrade: result });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to grade summary.');
    } finally {
      setLoading(false);
    }
  }, [article.title, article.link, article.summary, article.id]);

  useEffect(() => {
    if (!grade) {
      const timer = setTimeout(() => {
        runGrading();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [grade, runGrading]);

  return (
    <div>
      {error && <div className="status status--error" style={{ marginBottom: 16 }}>{error}</div>}
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', fontSize: '24px' }}>⏳</div>
          <p style={{ fontWeight: 600, margin: 0 }}>Gemini is analyzing the article & summary...</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>Evaluating core arguments. This will take ~15 seconds.</p>
        </div>
      ) : grade ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', background: 'var(--surface-raised)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ 
              width: '70px', 
              height: '70px', 
              borderRadius: '50%', 
              border: `4px solid ${grade.score >= 80 ? 'var(--success)' : 'var(--danger)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              color: grade.score >= 80 ? 'var(--success)' : 'var(--danger)',
              flexShrink: 0
            }}>
              {grade.score}%
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>{grade.status || (grade.score >= 80 ? 'Target Met (≥80%)' : 'Target Missed (<80%)')}</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Evaluated against the author's primary thesis.</p>
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ color: 'var(--success)', marginBottom: '8px', fontSize: '13px' }}>✓ Strengths (What you captured well)</h4>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', lineHeight: 1.5, color: 'var(--text)' }}>
              {grade.strengths?.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: 'var(--danger)', marginBottom: '8px', fontSize: '13px' }}>⚠ Omissions / Misunderstandings</h4>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {grade.omissions?.map((o, i) => <li key={i} style={{ marginBottom: 4 }}>{o}</li>)}
            </ul>
          </div>

          <div style={{ background: 'rgba(74, 117, 199, 0.05)', borderLeft: '3px solid var(--blue)', padding: '12px 14px', borderRadius: '0 8px 8px 0', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 6px', color: 'var(--blue)', fontSize: '13px' }}>💡 Actionable Reading Advice</h4>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.4, color: 'var(--text)' }}>{grade.advice}</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn--ghost" onClick={runGrading} disabled={loading}>🔄 Re-grade Summary</button>
            <button className="btn btn--primary" onClick={onClose}>Close</button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <button className="btn btn--primary" onClick={runGrading}>Grade Summary</button>
        </div>
      )}
    </div>
  );
}

function CATRCQuizModal({ article, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(article.quiz || null);
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(0); 

  async function generateQuiz() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setError('Please configure your Gemini API Key in the AI Log Zone tab first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generateAeonQuizWithGemini(article.title, article.link, apiKey);
      setQuiz(result);
      await updateAeonArticleFields(article.id, { quiz: result });
      setStarted(false);
      setCurrentIdx(0);
      setUserAnswers({});
      setQuizScore(0);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOptionSelect(option) {
    if (userAnswers[currentIdx] !== undefined) return; 
    
    const correct = quiz[currentIdx].correctOption;
    let scoreDiff = -1;
    if (option === correct) {
      scoreDiff = 3;
    }
    
    const newAnswers = { ...userAnswers, [currentIdx]: option };
    setUserAnswers(newAnswers);
    setQuizScore(prev => prev + scoreDiff);

    if (currentIdx === quiz.length - 1) {
      const finalScore = quizScore + scoreDiff;
      const currentHighScore = article.quizHighScore || 0;
      if (finalScore > currentHighScore) {
        await updateAeonArticleFields(article.id, { quizHighScore: finalScore });
      }
    }
  }

  function handleNext() {
    if (currentIdx < quiz.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setStarted(false); 
    }
  }

  function handleReset() {
    setStarted(true);
    setCurrentIdx(0);
    setUserAnswers({});
    setQuizScore(0);
  }

  const isCompleted = quiz && Object.keys(userAnswers).length === quiz.length;

  return (
    <div>
      {error && <div className="status status--error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', fontSize: '24px' }}>⏳</div>
          <p style={{ fontWeight: 600, margin: 0 }}>Generating CAT RC Questions...</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>Analyzing text and synthesizing traps. This takes ~20 seconds.</p>
        </div>
      ) : !quiz ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No quiz generated yet for this article.</p>
          <button className="btn btn--primary" onClick={generateQuiz}>Generate CAT RC Quiz</button>
        </div>
      ) : !started ? (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <h4 style={{ fontSize: '15px', marginBottom: '12px', fontWeight: 600 }}>CAT Verbal Prep: "{article.title}"</h4>
          
          {isCompleted ? (
            <div style={{ margin: '20px 0', padding: '20px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quiz Completed</p>
              <h2 style={{ fontSize: '32px', color: quizScore >= 16 ? 'var(--success)' : quizScore >= 8 ? 'var(--amber)' : 'var(--danger)', margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {quizScore} / {quiz.length * 3} pts
              </h2>
              <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.4 }}>
                {quizScore >= 18 ? '🔥 Elite VARC Accuracy! Excellent grasp of author traps.' : 
                 quizScore >= 12 ? '👍 Decent performance. Watch out for out-of-scope options.' : 
                 '⚠ Critical warnings: You fell into multiple verbal traps. Review trap explanations.'}
              </p>
              {quizScore > (article.quizHighScore || 0) && (
                <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '13px', marginTop: '10px' }}>⭐ New High Score!</p>
              )}
            </div>
          ) : (
            <div style={{ margin: '20px 0', padding: '16px', background: 'var(--surface-raised)', borderRadius: '8px', fontSize: '13px', lineHeight: 1.4 }}>
              <p style={{ margin: '0 0 6px' }}><strong>8 CAT RC Questions</strong> testing tone, main idea, structure, and inferences.</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Scoring: <span style={{ color: 'var(--success)' }}>+3 for correct</span>, <span style={{ color: 'var(--danger)' }}>-1 for wrong</span>.</p>
            </div>
          )}

          {article.quizHighScore > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Current High Score: <strong>{article.quizHighScore} pts</strong>
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn btn--primary" onClick={handleReset}>
              {isCompleted ? 'Retake Quiz' : 'Start Quiz'}
            </button>
            <button className="btn btn--ghost" onClick={generateQuiz}>
              🔄 Regenerate Quiz
            </button>
            <button className="btn btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Question {currentIdx + 1} of {quiz.length}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: quizScore >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              Score: {quizScore} pts
            </span>
          </div>

          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${((currentIdx + 1) / quiz.length) * 100}%` }}></div>
          </div>

          <div className="card" style={{ background: 'var(--bg)', marginBottom: '16px', padding: '14px 16px' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, lineHeight: 1.5 }}>
              {quiz[currentIdx].question}
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            {Object.entries(quiz[currentIdx].options).map(([key, text]) => {
              const selected = userAnswers[currentIdx];
              const isSelected = selected === key;
              const isCorrect = quiz[currentIdx].correctOption === key;
              
              let optClass = 'quiz-option';
              if (selected !== undefined) {
                if (isCorrect) optClass += ' quiz-option--correct';
                else if (isSelected) optClass += ' quiz-option--wrong';
              }

              return (
                <button
                  key={key}
                  className={optClass}
                  disabled={selected !== undefined}
                  onClick={() => handleOptionSelect(key)}
                >
                  <span className="quiz-option__label">{key}</span>
                  <span>{text}</span>
                </button>
              );
            })}
          </div>

          {userAnswers[currentIdx] !== undefined && (
            <div style={{ marginTop: '16px', animation: 'fadeIn 0.2s' }}>
              {userAnswers[currentIdx] === quiz[currentIdx].correctOption ? (
                <div className="quiz-correct-explanation">
                  <strong>✓ Correct!</strong> {quiz[currentIdx].explanation}
                </div>
              ) : (
                <>
                  <div className="quiz-trap-explanation">
                    <strong>⚠ Trap Triggered!</strong> You chose Option {userAnswers[currentIdx]}. 
                    <br />
                    <span style={{ fontWeight: 500 }}>Trap Reason:</span> {quiz[currentIdx].traps[userAnswers[currentIdx]]}
                  </div>
                  <div className="quiz-correct-explanation">
                    <strong>Correct Option is {quiz[currentIdx].correctOption}:</strong> {quiz[currentIdx].explanation}
                  </div>
                </>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button className="btn btn--primary" onClick={handleNext}>
                  {currentIdx === quiz.length - 1 ? 'Finish Quiz' : 'Next Question ➔'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VocabQuizModal({ articles, entries = [], onClose }) {
  const [mode, setMode] = useState('select'); 
  const [poolType, setPoolType] = useState('all'); 
  const [shuffledWords, setShuffledWords] = useState([]);
  
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [mcqIdx, setMcqIdx] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState({}); 
  const [mcqScore, setMcqScore] = useState(0);

  const allWords = useMemo(() => {
    const list = [];
    for (const a of articles) {
      for (const v of a.vocab || []) {
        if (v.word && v.meaning) {
          list.push({ ...v, parentType: 'article', parentId: a.id, fullVocab: a.vocab });
        }
      }
    }
    for (const e of (entries || [])) {
      for (const v of e.vocab || []) {
        if (v.word && v.meaning) {
          list.push({ ...v, parentType: 'entry', parentId: e.id, fullVocab: e.vocab });
        }
      }
    }
    return list;
  }, [articles, entries]);

  function startQuiz(selectedMode) {
    let pool = [...allWords];
    if (poolType === 'unmastered') {
      pool = pool.filter(w => !w.mastered);
    }
    
    if (pool.length === 0) {
      alert(poolType === 'unmastered' ? 'No unmastered words found!' : 'No vocabulary words found. Please log some articles with vocabulary first.');
      return;
    }

    const shuffled = pool.sort(() => 0.5 - Math.random());
    setShuffledWords(shuffled);

    if (selectedMode === 'flashcard') {
      setFlashcardIdx(0);
      setFlipped(false);
      setMode('flashcard');
    } else if (selectedMode === 'mcq') {
      const qCount = Math.min(10, shuffled.length);
      const questions = [];
      
      const fallbackDistractors = [
        "To praise highly or speak of with approval",
        "A state of temporary disuse or suspension",
        "Showing a rude and arrogant lack of respect",
        "Making or constituting a disturbingly harsh and loud noise",
        "Very attentive to and concerned about accuracy and detail",
        "Not revealing one's thoughts or feelings readily",
        "Make someone feel isolated or estranged",
        "An item of additional material at the end of a document"
      ];

      for (let i = 0; i < qCount; i++) {
        const word = shuffled[i];
        
        let otherMeanings = allWords
          .filter(w => w.word !== word.word)
          .map(w => w.meaning);
        
        otherMeanings = [...new Set(otherMeanings)];

        if (otherMeanings.length < 3) {
          otherMeanings = [...otherMeanings, ...fallbackDistractors];
        }

        const distractors = otherMeanings
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        const optionsList = [word.meaning, ...distractors]
          .sort(() => 0.5 - Math.random());

        questions.push({
          wordObj: word,
          options: optionsList,
          correctIdx: optionsList.indexOf(word.meaning)
        });
      }

      setMcqQuestions(questions);
      setMcqIdx(0);
      setMcqAnswers({});
      setMcqScore(0);
      setMode('mcq');
    }
  }

  async function markMastery(wordObj, isMastered) {
    const newVocab = wordObj.fullVocab.map(v => 
      v.word === wordObj.word ? { ...v, mastered: isMastered } : v
    );
    try {
      if (wordObj.parentType === 'article') {
        await updateAeonArticleFields(wordObj.parentId, { vocab: newVocab });
      } else {
        await updateEntry(wordObj.parentId, { vocab: newVocab });
      }
    } catch (err) {
      console.error('Failed to update mastery:', err);
    }
  }

  function handleFlashcardNext(mastered) {
    const currentWord = shuffledWords[flashcardIdx];
    markMastery(currentWord, mastered);
    setFlipped(false);
    setTimeout(() => {
      setFlashcardIdx(prev => prev + 1);
    }, 150);
  }

  function handleMcqSelect(optionIdx) {
    if (mcqAnswers[mcqIdx] !== undefined) return;
    const correctIdx = mcqQuestions[mcqIdx].correctIdx;
    setMcqAnswers(prev => ({ ...prev, [mcqIdx]: optionIdx }));
    if (optionIdx === correctIdx) {
      setMcqScore(prev => prev + 1);
    }
  }

  function handleMcqNext() {
    if (mcqIdx < mcqQuestions.length - 1) {
      setMcqIdx(prev => prev + 1);
    } else {
      setMode('mcq-finished');
    }
  }

  return (
    <div>
      {mode === 'select' && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13.5px' }}>
            Revise your saved vocabulary words. Total words in bank: <strong>{allWords.length}</strong>.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '24px' }}>
            <label style={{ fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="vocab-pool" 
                checked={poolType === 'all'} 
                onChange={() => setPoolType('all')} 
              />
              All Words
            </label>
            <label style={{ fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="vocab-pool" 
                checked={poolType === 'unmastered'} 
                onChange={() => setPoolType('unmastered')} 
              />
              Need Practice ({allWords.filter(w => !w.mastered).length})
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card hoverable" onClick={() => startQuiz('flashcard')} style={{ cursor: 'pointer', textAlign: 'center', padding: '24px 16px' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>🎴</span>
              <strong style={{ fontSize: '14px', fontWeight: 600 }}>Flashcards Mode</strong>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Flip card to reveal meaning and mark as Mastered / Need Practice.</p>
            </div>
            
            <div className="card hoverable" onClick={() => startQuiz('mcq')} style={{ cursor: 'pointer', textAlign: 'center', padding: '24px 16px' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>📝</span>
              <strong style={{ fontSize: '14px', fontWeight: 600 }}>Multiple Choice Quiz</strong>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Test your comprehension with 10 random words from your bank.</p>
            </div>
          </div>
        </div>
      )}

      {mode === 'flashcard' && (
        <div>
          {flashcardIdx < shuffledWords.length ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <span>Word {flashcardIdx + 1} of {shuffledWords.length}</span>
                <span>Pool: {poolType === 'unmastered' ? 'Unmastered' : 'All'}</span>
              </div>
              
              <div className="quiz-progress-bar">
                <div className="quiz-progress-fill" style={{ width: `${((flashcardIdx + 1) / shuffledWords.length) * 100}%` }}></div>
              </div>

              <div className="flashcard-container" onClick={() => setFlipped(!flipped)}>
                <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
                  <div className="flashcard-front">
                    <h2>{shuffledWords[flashcardIdx].word}</h2>
                    <span className="flashcard-hint">Click card to reveal meaning</span>
                  </div>
                  <div className="flashcard-back">
                    <h2 style={{ fontSize: '20px', color: 'var(--blue)', marginBottom: '12px' }}>{shuffledWords[flashcardIdx].word}</h2>
                    <p style={{ fontSize: '14.5px', color: 'var(--text)' }}>{shuffledWords[flashcardIdx].meaning}</p>
                    <span className="flashcard-hint" style={{ marginTop: 'auto', color: 'var(--text-secondary)' }}>Click to flip back</span>
                  </div>
                </div>
              </div>

              {flipped && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', animation: 'fadeIn 0.2s' }}>
                  <button className="btn btn--ghost" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(189,72,86,0.05)' }} onClick={() => handleFlashcardNext(false)}>
                    ❌ Need Practice
                  </button>
                  <button className="btn btn--primary" style={{ background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleFlashcardNext(true)}>
                    ✅ Mastered
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🎉</span>
              <h4>Practice Completed!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: '0 0 20px' }}>
                You reviewed all {shuffledWords.length} words in this session.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn--primary" onClick={() => setMode('select')}>Back to Selector</button>
                <button className="btn btn--ghost" onClick={onClose}>Close</button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'mcq' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <span>Question {mcqIdx + 1} of {mcqQuestions.length}</span>
            <span>Score: {mcqScore} / {mcqQuestions.length}</span>
          </div>

          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${((mcqIdx + 1) / mcqQuestions.length) * 100}%` }}></div>
          </div>

          <div className="card" style={{ background: 'var(--bg)', marginBottom: '16px', padding: '18px', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Define the word</span>
            <h2 style={{ fontSize: '24px', margin: '6px 0 0', fontWeight: 700 }}>{mcqQuestions[mcqIdx].wordObj.word}</h2>
          </div>

          <div style={{ marginBottom: '16px' }}>
            {mcqQuestions[mcqIdx].options.map((option, idx) => {
              const selectedIdx = mcqAnswers[mcqIdx];
              const isSelected = selectedIdx === idx;
              const isCorrect = mcqQuestions[mcqIdx].correctIdx === idx;

              let optClass = 'quiz-option';
              if (selectedIdx !== undefined) {
                if (isCorrect) optClass += ' quiz-option--correct';
                else if (isSelected) optClass += ' quiz-option--wrong';
              }

              return (
                <button
                  key={idx}
                  className={optClass}
                  disabled={selectedIdx !== undefined}
                  onClick={() => handleMcqSelect(idx)}
                >
                  <span className="quiz-option__label">{String.fromCharCode(65 + idx)}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {mcqAnswers[mcqIdx] !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13.5px', color: mcqAnswers[mcqIdx] === mcqQuestions[mcqIdx].correctIdx ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                {mcqAnswers[mcqIdx] === mcqQuestions[mcqIdx].correctIdx ? '✓ Correct!' : '❌ Incorrect'}
              </span>
              <button className="btn btn--primary" onClick={handleMcqNext}>
                {mcqIdx === mcqQuestions.length - 1 ? 'Finish Quiz' : 'Next Question ➔'}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'mcq-finished' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🏆</span>
          <h4>Quiz Finished!</h4>
          <h2 style={{ fontSize: '32px', margin: '10px 0', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {mcqScore} / {mcqQuestions.length} Correct
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: '0 0 20px', lineHeight: 1.4 }}>
            {mcqScore === mcqQuestions.length ? '🎓 Perfect score! You have completely mastered these words.' :
             mcqScore >= mcqQuestions.length * 0.7 ? '👍 Nice job! Keep practicing to get 100% accuracy.' :
             '📚 Spend more time with flashcards to reinforce word meanings.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn btn--primary" onClick={() => setMode('select')}>Back to Selector</button>
            <button className="btn btn--ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryComprehensionTrend({ articles }) {
  const data = useMemo(() => {
    return articles
      .filter((a) => a.summaryGrade && typeof a.summaryGrade.score === 'number')
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((a) => ({ 
        day: formatShort(a.date), 
        score: a.summaryGrade.score, 
        title: a.title 
      }));
  }, [articles]);

  const stats = useMemo(() => {
    if (data.length === 0) return { avg: 0, metCount: 0, metPct: 0 };
    const sum = data.reduce((acc, d) => acc + d.score, 0);
    const met = data.filter(d => d.score >= 80).length;
    return {
      avg: Math.round(sum / data.length),
      metCount: met,
      metPct: Math.round((met / data.length) * 100)
    };
  }, [data]);

  return (
    <div className="card">
      <h3>Summary comprehension trend</h3>
      <p className="insight">
        AI graded summary scores — Target is <strong>80%+</strong>. 
        {data.length > 0 && ` Avg: ${stats.avg}% (${stats.metPct}% met target).`}
      </p>

      {data.length < 2 ? (
        <p className="empty">Grade a few summaries to see your comprehension trend graph.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={12} />
            <YAxis stroke="var(--text-secondary)" fontSize={12} domain={[0, 100]} />
            <Tooltip content={<ComprehensionTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              name="Score"
              stroke="#1f8577"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ComprehensionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { title, score } = payload[0].payload;
  return (
    <div style={compTooltipStyle}>
      <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      <p style={{ margin: 0, color: score >= 80 ? 'var(--success)' : 'var(--danger)' }}>
        Score: {score}%
      </p>
    </div>
  );
}

const compTooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
};

