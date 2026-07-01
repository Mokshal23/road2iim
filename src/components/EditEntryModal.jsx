import { useState } from 'react';
import Modal from './Modal';
import TagPicker from './TagPicker';
import { SECTIONS, SOURCES, TOPIC_SUGGESTIONS, MISTAKE_TAGS, POSITIVE_TAGS, DIFFICULTY_OPTIONS } from '../constants';
import { computeStats } from '../utils/calc';
import { updateEntry } from '../hooks/useEntries';
import { defineWordWithGemini } from '../utils/ai';

export default function EditEntryModal({ entry, onClose }) {
  const [form, setForm] = useState({
    date: entry.date,
    subsection: entry.subsection,
    topic: entry.topic,
    label: entry.label || '',
    timeTaken: entry.timeTaken,
    attempted: entry.attempted,
    correct: entry.correct,
    negativeMarking: entry.negativeMarking,
    source: entry.source,
    difficulty: entry.difficulty || 'Medium',
    mistakeTags: entry.mistakeTags || [],
    goodTags: entry.goodTags || [],
    notes: entry.notes || '',
    vocab: entry.vocab?.length ? entry.vocab : [{ word: '', meaning: '' }],
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const cfg = SECTIONS[entry.section];
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
      const newVocab = [...(form.vocab || [{ word: '', meaning: '' }])];
      newVocab[idx] = { ...newVocab[idx], meaning };
      setForm((f) => ({ ...f, vocab: newVocab }));
    } catch (err) {
      console.error(err);
      alert('Failed to fetch meaning. Please type it manually.');
    } finally {
      setDefiningIdx(null);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setErrorMsg(null);

    const hasTime = form.timeTaken !== '';
    const hasAttempted = form.attempted !== '';
    const hasCorrect = form.correct !== '';

    if (hasTime) {
      const time = Number(form.timeTaken);
      if (isNaN(time) || time <= 0) {
        setErrorMsg('Time taken must be a valid number greater than 0.');
        return;
      }
    }

    if (hasAttempted || hasCorrect) {
      if (!hasAttempted || !hasCorrect) {
        setErrorMsg('If logging questions, both attempted and correct must be filled.');
        return;
      }
      const att = Number(form.attempted);
      const cor = Number(form.correct);
      if (isNaN(att) || isNaN(cor)) {
        setErrorMsg('Attempted and correct must be valid numbers.');
        return;
      }
      if (att < 0 || cor < 0) {
        setErrorMsg('Attempted and correct must be non-negative.');
        return;
      }
      if (!Number.isInteger(att) || !Number.isInteger(cor)) {
        setErrorMsg('Attempted and correct must be whole numbers.');
        return;
      }
      if (cor > att) {
        setErrorMsg('Correct answers cannot exceed attempted questions.');
        return;
      }
    }

    const hasContent = form.topic || form.label || form.notes || (form.vocab && form.vocab.length > 0 && form.vocab[0].word) || (form.mistakeTags && form.mistakeTags.length > 0) || (form.goodTags && form.goodTags.length > 0);
    if (!hasTime && !hasAttempted && !hasCorrect && !hasContent) {
      setErrorMsg('Please enter some details (time, questions, topic, notes, or vocab) to log.');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (entry.section !== 'VARC') delete payload.vocab;
      await updateEntry(entry.id, payload);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update entry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit ${cfg.label} entry`} onClose={onClose}>
      <form onSubmit={handleSave}>
        <div className="row-card__grid">
          <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
          {cfg.subsections.length > 1 && (
            <label>
              Subsection
              <select value={form.subsection} onChange={(e) => setForm({ ...form, subsection: e.target.value })}>
                {cfg.subsections.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}
          <label>
            Topic
            <input list="edit-topics" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            <datalist id="edit-topics">{topicOptions.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          <label>Label<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
          <label>Time taken (min)<input type="number" min="0" step="0.5" value={form.timeTaken} onChange={(e) => setForm({ ...form, timeTaken: e.target.value })} /></label>
          <label>Attempted<input type="number" min="0" value={form.attempted} onChange={(e) => setForm({ ...form, attempted: e.target.value })} /></label>
          <label>Correct<input type="number" min="0" value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })} /></label>
          <label>
            Source
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {!SOURCES.includes(form.source) && <option value={form.source}>{form.source} (legacy)</option>}
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
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
          <label className="checkbox">
            <input type="checkbox" checked={form.negativeMarking} onChange={(e) => setForm({ ...form, negativeMarking: e.target.checked })} />
            Negative marking applies
          </label>
        </div>

        <label className="row-card__notes">
          Notes
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>

        {entry.section === 'VARC' && (
          <div className="vocab-editor">
            <span className="row-card__tags-label">New vocabulary <span className="optional">(optional)</span></span>
            {(form.vocab || [{ word: '', meaning: '' }]).map((v, idx) => (
              <div key={idx} className="vocab-editor__row">
                <input placeholder="word" value={v.word} onChange={(e) => {
                  const newVocab = [...(form.vocab || [{ word: '', meaning: '' }])];
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
                  const newVocab = [...(form.vocab || [{ word: '', meaning: '' }])];
                  newVocab[idx] = { ...newVocab[idx], meaning: e.target.value };
                  setForm({ ...form, vocab: newVocab });
                }} />
                {(form.vocab || []).length > 1 && (
                  <button type="button" className="icon-btn" onClick={() => {
                    setForm({ ...form, vocab: (form.vocab || []).filter((_, i) => i !== idx) });
                  }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => {
              setForm({ ...form, vocab: [...(form.vocab || [{ word: '', meaning: '' }]), { word: '', meaning: '' }] });
            }}>+ Add word</button>
          </div>
        )}

        <div className="row-card__tags">
          <span className="row-card__tags-label">What went well <span className="optional">(optional, max 3)</span>:</span>
          <TagPicker value={form.goodTags} onChange={(tags) => setForm({ ...form, goodTags: tags })} options={POSITIVE_TAGS} good />
        </div>

        <div className="row-card__tags">
          <span className="row-card__tags-label">What went wrong <span className="optional">(optional, max 3)</span>:</span>
          <TagPicker value={form.mistakeTags} onChange={(tags) => setForm({ ...form, mistakeTags: tags })} options={MISTAKE_TAGS} />
        </div>

        <div className="row-card__stats">
          <div className="stat"><div className="stat__value">{stats.accuracy === null ? '—' : `${stats.accuracy}%`}</div><div className="stat__label">Accuracy</div></div>
          <div className="stat"><div className="stat__value">{stats.marks === null ? '—' : stats.marks}</div><div className="stat__label">Marks</div></div>
          <div className="stat"><div className="stat__value">{stats.marksLost === null ? '—' : stats.marksLost}</div><div className="stat__label">Lost</div></div>
          <div className="stat"><div className="stat__value">{stats.marksPerMinute === null ? '—' : stats.marksPerMinute}</div><div className="stat__label">Marks/min</div></div>
        </div>

        {errorMsg && (
          <div className="status status--error" style={{ marginBottom: 15 }}>{errorMsg}</div>
        )}

        <div className="entry-form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
