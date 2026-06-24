import { useState } from 'react';
import Modal from './Modal';
import TagPicker from './TagPicker';
import { SECTIONS, SOURCES, TOPIC_SUGGESTIONS, MISTAKE_TAGS, POSITIVE_TAGS } from '../constants';
import { computeStats } from '../utils/calc';
import { updateEntry } from '../hooks/useEntries';

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
    mistakeTags: entry.mistakeTags || [],
    goodTags: entry.goodTags || [],
    notes: entry.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const cfg = SECTIONS[entry.section];
  const stats = computeStats(form);
  const topicOptions = TOPIC_SUGGESTIONS[form.subsection] || [];

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await updateEntry(entry.id, form);
    setSaving(false);
    onClose();
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
          <label>Time taken (min)<input type="number" min="0" step="0.5" value={form.timeTaken} onChange={(e) => setForm({ ...form, timeTaken: e.target.value })} required /></label>
          <label>Attempted<input type="number" min="0" value={form.attempted} onChange={(e) => setForm({ ...form, attempted: e.target.value })} required /></label>
          <label>Correct<input type="number" min="0" value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })} required /></label>
          <label>
            Source
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {!SOURCES.includes(form.source) && <option value={form.source}>{form.source} (legacy)</option>}
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
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

        <div className="row-card__tags">
          <span className="row-card__tags-label">What went well <span className="optional">(optional, max 3)</span>:</span>
          <TagPicker value={form.goodTags} onChange={(tags) => setForm({ ...form, goodTags: tags })} options={POSITIVE_TAGS} good />
        </div>

        <div className="row-card__tags">
          <span className="row-card__tags-label">What went wrong <span className="optional">(optional, max 3)</span>:</span>
          <TagPicker value={form.mistakeTags} onChange={(tags) => setForm({ ...form, mistakeTags: tags })} options={MISTAKE_TAGS} />
        </div>

        <div className="row-card__stats">
          <div className="stat"><div className="stat__value">{stats.accuracy}%</div><div className="stat__label">Accuracy</div></div>
          <div className="stat"><div className="stat__value">{stats.marks}</div><div className="stat__label">Marks</div></div>
          <div className="stat"><div className="stat__value">{stats.marksPerMinute}</div><div className="stat__label">Marks/min</div></div>
        </div>

        <div className="entry-form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
