import { useMemo, useState } from 'react';
import { AEON_DIFFICULTY, TOPIC_SUGGESTIONS } from '../constants';
import { addAeonArticle, deleteAeonArticle, updateAeonArticle } from '../hooks/useAeonArticles';
import { formatPretty, todayStr } from '../utils/dates';
import { defineWordWithGemini } from '../utils/ai';
import Modal from './Modal';
import ReadingSpeedTrend from './ReadingSpeedTrend';

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
  };
}

export default function AeonLog({ articles, entries = [], readOnly = false }) {
  const [tab, setTab] = useState('log');
  const [editing, setEditing] = useState(null);

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
          <ArticleList articles={articles} readOnly={readOnly} onEdit={setEditing} />
        </>
      ) : tab === 'vocab' ? (
        <VocabBank articles={articles} entries={entries} />
      ) : (
        <AeonAnalysis articles={articles} />
      )}

      {editing && (
        <Modal title="Edit article" onClose={() => setEditing(null)}>
          <AeonForm editArticle={editing} onDone={() => setEditing(null)} />
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

function ArticleList({ articles, readOnly, onEdit }) {
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
          {a.vocab?.length > 0 && (
            <div className="aeon-card__vocab">
              {a.vocab.map((v, i) => (
                <span key={i} className="vocab-chip" title={v.meaning}>{v.word}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VocabBank({ articles, entries = [] }) {
  const [search, setSearch] = useState('');
  const words = useMemo(() => {
    const all = [];
    for (const a of articles) {
      for (const v of a.vocab || []) {
        if (v.word) all.push({ ...v, articleTitle: a.title, date: a.date });
      }
    }
    for (const e of (entries || [])) {
      for (const v of e.vocab || []) {
        if (v.word) all.push({ ...v, articleTitle: `Practice: ${e.topic}, ${e.date}`, date: e.date });
      }
    }
    return all.sort((a, b) => a.word.localeCompare(b.word));
  }, [articles, entries]);

  const filtered = words.filter((w) => w.word.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card">
      <div className="card__head">
        <h3>Vocab bank ({words.length})</h3>
        <input type="text" placeholder="Search words…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <p className="empty">No words match yet.</p>
      ) : (
        <ul className="vocab-bank-list">
          {filtered.map((w, i) => (
            <li key={i}>
              <strong>{w.word}</strong>
              {w.meaning && <span className="vocab-bank-list__meaning"> — {w.meaning}</span>}
              <span className="vocab-bank-list__source"> · {w.articleTitle}</span>
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
      <ReadingSpeedTrend articles={articles} />

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
