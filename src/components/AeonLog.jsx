import { useMemo, useState } from 'react';
import { AEON_DIFFICULTY, TOPIC_SUGGESTIONS } from '../constants';
import { addAeonArticle, deleteAeonArticle } from '../hooks/useAeonArticles';
import { formatPretty, todayStr } from '../utils/dates';

function blankForm() {
  return {
    date: todayStr(),
    title: '',
    topic: '',
    difficulty: 'Medium',
    summary: '',
    vocab: [{ word: '', meaning: '' }],
  };
}

export default function AeonLog({ articles, readOnly = false }) {
  const [tab, setTab] = useState('log');

  return (
    <div>
      <div className="subtab-row">
        <button className={`subtab ${tab === 'log' ? 'subtab--active' : ''}`} onClick={() => setTab('log')}>Articles</button>
        <button className={`subtab ${tab === 'vocab' ? 'subtab--active' : ''}`} onClick={() => setTab('vocab')}>Vocab bank</button>
      </div>

      {tab === 'log' ? (
        <>
          {!readOnly && <AeonForm />}
          <ArticleList articles={articles} readOnly={readOnly} />
        </>
      ) : (
        <VocabBank articles={articles} />
      )}
    </div>
  );
}

function AeonForm() {
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  function updateVocab(idx, patch) {
    setForm((f) => ({ ...f, vocab: f.vocab.map((v, i) => (i === idx ? { ...v, ...patch } : v)) }));
  }
  function addVocabRow() {
    setForm((f) => ({ ...f, vocab: [...f.vocab, { word: '', meaning: '' }] }));
  }
  function removeVocabRow(idx) {
    setForm((f) => ({ ...f, vocab: f.vocab.length === 1 ? f.vocab : f.vocab.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setStatus({ type: 'error', msg: 'Give the article a title.' });
      return;
    }
    setSaving(true);
    try {
      await addAeonArticle(form);
      setStatus({ type: 'success', msg: 'Article logged.' });
      setForm(blankForm());
    } catch (e2) {
      setStatus({ type: 'error', msg: e2.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card aeon-form" onSubmit={handleSubmit}>
      <h3>Log an article</h3>
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
      </div>

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
            <input placeholder="meaning" value={v.meaning} onChange={(e) => updateVocab(idx, { meaning: e.target.value })} />
            {form.vocab.length > 1 && (
              <button type="button" className="icon-btn" onClick={() => removeVocabRow(idx)}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn--ghost btn--sm" onClick={addVocabRow}>+ Add word</button>
      </div>

      <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save article'}</button>
      {status && <div className={`status status--${status.type}`}>{status.msg}</div>}
    </form>
  );
}

function ArticleList({ articles, readOnly }) {
  if (articles.length === 0) return <p className="empty">No articles logged yet.</p>;
  return (
    <div className="aeon-list">
      {articles.map((a) => (
        <div key={a.id} className="aeon-card">
          <div className="aeon-card__head">
            <strong>{a.title}</strong>
            <span className="aeon-card__meta">{a.topic} · {a.difficulty} · {formatPretty(a.date)}</span>
            {!readOnly && <button className="icon-btn" onClick={() => deleteAeonArticle(a.id)} aria-label="Delete">🗑</button>}
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

function VocabBank({ articles }) {
  const [search, setSearch] = useState('');
  const words = useMemo(() => {
    const all = [];
    for (const a of articles) {
      for (const v of a.vocab || []) {
        if (v.word) all.push({ ...v, articleTitle: a.title, date: a.date });
      }
    }
    return all.sort((a, b) => a.word.localeCompare(b.word));
  }, [articles]);

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
