import { useState } from 'react';
import { SECTIONS, TOPIC_SUGGESTIONS, SOURCES } from '../constants';
import { computeStats } from '../utils/calc';
import { todayStr } from '../utils/dates';
import { saveSessionRows } from '../hooks/useEntries';
import MistakeTagPicker from './MistakeTagPicker';

function blankRow(section) {
  const cfg = SECTIONS[section];
  return {
    key: crypto.randomUUID(),
    subsection: cfg.subsections[0],
    topic: '',
    label: '',
    timeTaken: '',
    attempted: '',
    correct: '',
    negativeMarking: true,
    source: SOURCES[0],
    mistakeTags: [],
    notes: '',
  };
}

export default function EntryForm({ sectionKey }) {
  const cfg = SECTIONS[sectionKey];
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([blankRow(sectionKey)]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  function updateRow(key, patch) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const last = rows[rows.length - 1];
    const fresh = blankRow(sectionKey);
    setRows((rs) => [...rs, { ...fresh, subsection: last?.subsection || fresh.subsection, source: last?.source || fresh.source }]);
  }

  function removeRow(key) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.key !== key)));
  }

  function validate() {
    for (const r of rows) {
      if (!r.timeTaken || !r.attempted || r.correct === '') return 'Fill in time, attempted and correct for every row.';
      if (Number(r.correct) > Number(r.attempted)) return 'Correct cannot exceed attempted.';
      if (r.mistakeTags.length === 0) return 'Pick at least one mistake/result tag per row (even "Other" is fine).';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setStatus({ type: 'error', msg: err });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await saveSessionRows(rows.map((r) => ({ ...r, date, section: sectionKey })));
      setStatus({ type: 'success', msg: `Saved ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'} for ${date}.` });
      setRows([blankRow(sectionKey)]);
    } catch (e2) {
      setStatus({ type: 'error', msg: e2.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="entry-form__date">
        <label>
          Session date
          <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <span className="hint">All rows below get logged under this date.</span>
      </div>

      {rows.map((row, idx) => (
        <RowCard
          key={row.key}
          row={row}
          index={idx}
          sectionKey={sectionKey}
          onChange={(patch) => updateRow(row.key, patch)}
          onRemove={() => removeRow(row.key)}
          removable={rows.length > 1}
        />
      ))}

      <div className="entry-form__actions">
        <button type="button" className="btn btn--ghost" onClick={addRow}>
          + Add another {cfg.subsections.length > 1 ? 'passage/set' : 'set'}
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : `Save session (${rows.length})`}
        </button>
      </div>

      {status && (
        <div className={`status status--${status.type}`}>{status.msg}</div>
      )}
    </form>
  );
}

function RowCard({ row, index, sectionKey, onChange, onRemove, removable }) {
  const cfg = SECTIONS[sectionKey];
  const stats = computeStats(row);
  const topicOptions = TOPIC_SUGGESTIONS[row.subsection] || [];
  const listId = `topics-${row.key}`;

  return (
    <div className="row-card" style={{ borderColor: cfg.color }}>
      <div className="row-card__head">
        <span className="row-card__index">#{index + 1}</span>
        {cfg.subsections.length > 1 && (
          <div className="seg">
            {cfg.subsections.map((s) => (
              <button
                key={s}
                type="button"
                className={`seg__btn ${row.subsection === s ? 'seg__btn--active' : ''}`}
                style={row.subsection === s ? { background: cfg.color } : undefined}
                onClick={() => onChange({ subsection: s, topic: '' })}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {removable && (
          <button type="button" className="icon-btn" onClick={onRemove} aria-label="Remove row">✕</button>
        )}
      </div>

      <div className="row-card__grid">
        <label>
          Topic
          <input
            list={listId}
            value={row.topic}
            placeholder="e.g. Economics"
            onChange={(e) => onChange({ topic: e.target.value })}
          />
          <datalist id={listId}>
            {topicOptions.map((t) => <option key={t} value={t} />)}
          </datalist>
        </label>

        <label>
          Label <span className="optional">(optional)</span>
          <input
            value={row.label}
            placeholder="Passage 1 / Set A"
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </label>

        <label>
          Time taken (min)
          <input
            type="number" min="0" step="0.5"
            value={row.timeTaken}
            onChange={(e) => onChange({ timeTaken: e.target.value })}
            required
          />
        </label>

        <label>
          Attempted
          <input
            type="number" min="0" step="1"
            value={row.attempted}
            onChange={(e) => onChange({ attempted: e.target.value })}
            required
          />
        </label>

        <label>
          Correct
          <input
            type="number" min="0" step="1"
            value={row.correct}
            onChange={(e) => onChange({ correct: e.target.value })}
            required
          />
        </label>

        <label>
          Source
          <select value={row.source} onChange={(e) => onChange({ source: e.target.value })}>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={row.negativeMarking}
            onChange={(e) => onChange({ negativeMarking: e.target.checked })}
          />
          Negative marking applies (uncheck for TITA)
        </label>
      </div>

      <label className="row-card__notes">
        Notes <span className="optional">(optional — e.g. "tricky double negative in Q2")</span>
        <input
          value={row.notes}
          placeholder="Anything worth remembering about this one"
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </label>

      <div className="row-card__tags">
        <span className="row-card__tags-label">What went right/wrong (max 3):</span>
        <MistakeTagPicker value={row.mistakeTags} onChange={(tags) => onChange({ mistakeTags: tags })} />
      </div>

      <div className="row-card__stats">
        <Stat label="Accuracy" value={`${stats.accuracy}%`} />
        <Stat label="Marks" value={stats.marks} />
        <Stat label="Marks/min" value={stats.marksPerMinute} />
        <Stat label="Min/question" value={stats.timePerQuestion} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}
