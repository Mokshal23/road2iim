import { useState } from 'react';
import { SECTIONS, TOPIC_SUGGESTIONS, SOURCES, MISTAKE_TAGS, POSITIVE_TAGS } from '../constants';
import { computeStats } from '../utils/calc';
import { todayStr } from '../utils/dates';
import { saveSessionRows } from '../hooks/useEntries';
import TagPicker from './TagPicker';

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
    timeTaken: '', attempted: '', correct: '', negativeMarking: true, mistakeTags: [], goodTags: [],
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const stats = computeStats(form);
  const topicOptions = TOPIC_SUGGESTIONS[form.subsection] || [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.timeTaken || !form.attempted || form.correct === '') {
      setStatus({ type: 'error', msg: 'Fill in time, attempted and correct.' });
      return;
    }
    setSaving(true);
    try {
      await saveSessionRows([{ ...form, date: todayStr(), section: sectionKey, label: '', notes: '' }]);
      setStatus({ type: 'success', msg: 'Logged.' });
      setForm((f) => ({ ...f, timeTaken: '', attempted: '', correct: '', mistakeTags: [], goodTags: [] }));
    } catch (e2) {
      setStatus({ type: 'error', msg: e2.message });
    } finally {
      setSaving(false);
    }
  }

  return (
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
        <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

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

      <div className="quick-log__footer">
        <span className="quick-log__stats">{stats.accuracy}% acc · {stats.marksPerMinute} mpm</span>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save & log next'}</button>
      </div>
      {status && <div className={`status status--${status.type}`}>{status.msg}</div>}
    </form>
  );
}
