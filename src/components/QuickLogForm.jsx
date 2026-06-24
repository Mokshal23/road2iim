import { useState } from 'react';
import { SECTIONS, TOPIC_SUGGESTIONS, SOURCES, MISTAKE_TAGS, POSITIVE_TAGS, DIFFICULTY_OPTIONS } from '../constants';
import { computeStats } from '../utils/calc';
import { todayStr } from '../utils/dates';
import { saveSessionRows } from '../hooks/useEntries';
import TagPicker from './TagPicker';
import AIScreenshotLog from './AIScreenshotLog';
import { defineWordWithGemini } from '../utils/ai';

function defaultsFrom(entries, sectionKey) {
  const last = entries.find((e) => e.section === sectionKey);
  const cfg = SECTIONS[sectionKey];
  return {
    subsection: last?.subsection || cfg.subsections[0],
    topic: last?.topic || '',
    source: last?.source || SOURCES[0],
  };
}

export default function QuickLogForm({ sectionKey, entries = [] }) {
  const cfg = SECTIONS[sectionKey];
  const seed = defaultsFrom(entries, sectionKey);
  const [form, setForm] = useState({
    subsection: seed.subsection, topic: seed.topic, source: seed.source,
    label: '',
    timeTaken: '', attempted: '', correct: '', negativeMarking: true, mistakeTags: [], goodTags: [],
    difficulty: 'Medium', vocab: [],
  });
  const [showVocab, setShowVocab] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const stats = computeStats(form);
  const topicOptions = TOPIC_SUGGESTIONS[form.subsection] || [];
  const [definingIdx, setDefiningIdx] = useState(null);

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
      const newVocab = [...(form.vocab.length ? form.vocab : [{ word: '', meaning: '' }])];
      newVocab[idx] = { ...newVocab[idx], meaning };
      setForm((f) => ({ ...f, vocab: newVocab }));
    } catch (err) {
      console.error(err);
      alert('Failed to fetch meaning. Please type it manually.');
    } finally {
      setDefiningIdx(null);
    }
  }

  function handleAutofill(parsed) {
    if (parsed.section && parsed.section !== sectionKey) {
      alert(`Note: The parsed screenshot is for ${parsed.section}, but you are logging under ${sectionKey}.`);
    }
    setForm((f) => ({
      ...f,
      timeTaken: parsed.timeTaken !== undefined && parsed.timeTaken !== null ? String(parsed.timeTaken) : f.timeTaken,
      attempted: parsed.attempted !== undefined && parsed.attempted !== null ? String(parsed.attempted) : f.attempted,
      correct: parsed.correct !== undefined && parsed.correct !== null ? String(parsed.correct) : f.correct,
      source: parsed.source || f.source,
      difficulty: parsed.difficulty || f.difficulty,
      topic: parsed.topic || f.topic,
      subsection: parsed.subsection || f.subsection,
      label: parsed.label || f.label,
    }));
    setStatus({ type: 'success', msg: 'Autofilled from screenshot! Please review details.' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.timeTaken || !form.attempted || form.correct === '') {
      setStatus({ type: 'error', msg: 'Fill in time, attempted and correct.' });
      return;
    }
    setSaving(true);
    try {
      await saveSessionRows([{ ...form, date: todayStr(), section: sectionKey, notes: '' }]);
      setStatus({ type: 'success', msg: 'Logged.' });
      setForm((f) => ({ ...f, label: '', timeTaken: '', attempted: '', correct: '', mistakeTags: [], goodTags: [], vocab: [] }));
      setShowVocab(false);
    } catch (e2) {
      setStatus({ type: 'error', msg: e2.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="quick-log-container">
      <AIScreenshotLog onAutofill={handleAutofill} />
      <form className="quick-log" onSubmit={handleSubmit} style={{ borderColor: cfg.color }}>
      {cfg.subsections.length > 1 && (
        <div className="seg">
          {cfg.subsections.map((s) => (
            <button
              key={s} type="button"
              className={`seg__btn ${form.subsection === s ? 'seg__btn--active' : ''}`}
              style={form.subsection === s ? { background: cfg.color } : undefined}
              onClick={() => setForm({ ...form, subsection: s })}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="quick-log__topic-row">
        <input
          list="quick-topics"
          value={form.topic}
          placeholder="Topic"
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />
        <datalist id="quick-topics">{topicOptions.map((t) => <option key={t} value={t} />)}</datalist>
        <input
          value={form.label}
          placeholder="Heading (e.g. Passage 1)"
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
        <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <label>
        Difficulty
        <div className="seg">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d} type="button"
              className={`seg__btn ${form.difficulty === d ? 'seg__btn--active-neutral' : ''}`}
              onClick={() => setForm({ ...form, difficulty: d })}
            >
              {d}
            </button>
          ))}
        </div>
      </label>

      <div className="quick-log__big-grid">
        <label>Time (min)<input type="number" min="0" step="0.5" autoFocus value={form.timeTaken} onChange={(e) => setForm({ ...form, timeTaken: e.target.value })} /></label>
        <label>Attempted<input type="number" min="0" value={form.attempted} onChange={(e) => setForm({ ...form, attempted: e.target.value })} /></label>
        <label>Correct<input type="number" min="0" value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })} /></label>
      </div>

      <div className="row-card__tags">
        <span className="row-card__tags-label">What went well <span className="optional">(optional)</span>:</span>
        <TagPicker value={form.goodTags} onChange={(tags) => setForm({ ...form, goodTags: tags })} options={POSITIVE_TAGS} good />
      </div>
      <div className="row-card__tags">
        <span className="row-card__tags-label">What went wrong <span className="optional">(optional)</span>:</span>
        <TagPicker value={form.mistakeTags} onChange={(tags) => setForm({ ...form, mistakeTags: tags })} options={MISTAKE_TAGS} />
      </div>

      {sectionKey === 'VARC' && (
        <>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowVocab((v) => !v)}>
            {showVocab ? '− Hide vocabulary' : '+ Add vocabulary'}
          </button>
          {showVocab && (
            <div className="vocab-editor">
              <span className="row-card__tags-label">New vocabulary <span className="optional">(optional)</span></span>
              {(form.vocab.length ? form.vocab : [{ word: '', meaning: '' }]).map((v, idx) => (
                <div key={idx} className="vocab-editor__row">
                  <input placeholder="word" value={v.word} onChange={(e) => {
                    const newVocab = [...(form.vocab.length ? form.vocab : [{ word: '', meaning: '' }])];
                    newVocab[idx] = { ...newVocab[idx], word: e.target.value };
                    setForm({ ...form, vocab: newVocab });
                  }} />
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
                  <input placeholder="meaning" value={v.meaning} onChange={(e) => {
                    const newVocab = [...(form.vocab.length ? form.vocab : [{ word: '', meaning: '' }])];
                    newVocab[idx] = { ...newVocab[idx], meaning: e.target.value };
                    setForm({ ...form, vocab: newVocab });
                  }} />
                  {form.vocab.length > 1 && (
                    <button type="button" className="icon-btn" onClick={() => {
                      setForm({ ...form, vocab: form.vocab.filter((_, i) => i !== idx) });
                    }}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => {
                setForm({ ...form, vocab: [...(form.vocab.length ? form.vocab : [{ word: '', meaning: '' }]), { word: '', meaning: '' }] });
              }}>+ Add word</button>
            </div>
          )}
        </>
      )}

      <div className="quick-log__footer">
        <span className="quick-log__stats">{stats.accuracy}% acc · {stats.marksPerMinute} mpm · {stats.marksLost} lost</span>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save & log next'}</button>
      </div>
      {status && <div className={`status status--${status.type}`}>{status.msg}</div>}
    </form>
    </div>
  );
}
