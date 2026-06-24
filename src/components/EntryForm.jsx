import { useState } from 'react';
import { SECTIONS, TOPIC_SUGGESTIONS, SOURCES, MISTAKE_TAGS, POSITIVE_TAGS, DIFFICULTY_OPTIONS } from '../constants';
import { computeStats } from '../utils/calc';
import { todayStr } from '../utils/dates';
import { saveSessionRows } from '../hooks/useEntries';
import TagPicker from './TagPicker';
import { defineWordWithGemini } from '../utils/ai';
import AIScreenshotLog from './AIScreenshotLog';

function blankRow(section, defaults = {}) {
  const cfg = SECTIONS[section];
  return {
    key: crypto.randomUUID(),
    subsection: defaults.subsection || cfg.subsections[0],
    topic: defaults.topic || '',
    label: '',
    timeTaken: '',
    attempted: '',
    correct: '',
    negativeMarking: true,
    source: defaults.source || SOURCES[0],
    difficulty: 'Medium',
    mistakeTags: [],
    goodTags: [],
    notes: '',
    vocab: [],
  };
}

function lastDefaultsFor(entries, sectionKey) {
  const last = entries.find((e) => e.section === sectionKey);
  if (!last) return {};
  return { subsection: last.subsection, topic: last.topic, source: last.source };
}

export default function EntryForm({ sectionKey, entries = [] }) {
  const cfg = SECTIONS[sectionKey];
  const defaults = lastDefaultsFor(entries, sectionKey);
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([blankRow(sectionKey, defaults)]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  function handleAutofill(parsed) {
    if (parsed.section && parsed.section !== sectionKey) {
      alert(`Note: The parsed screenshot is for ${parsed.section}, but you are logging under ${sectionKey}.`);
    }

    let att = parsed.attempted;
    let cor = parsed.correct;
    let time = parsed.timeTaken;
    let lbl = parsed.label;

    if (parsed.sections && parsed.sections[sectionKey]) {
      const secData = parsed.sections[sectionKey];
      att = secData.attempted;
      cor = secData.correct;
      time = secData.timeTaken;
      if (!lbl && parsed.label) {
        lbl = `${parsed.label} (${sectionKey})`;
      }
    }

    setRows((rs) => {
      const nextRows = [...rs];
      if (nextRows.length === 0) {
        nextRows.push(blankRow(sectionKey));
      }
      const targetIdx = nextRows.length - 1;
      const target = nextRows[targetIdx];

      const merged = {
        ...target,
        timeTaken: time !== undefined && time !== null ? String(time) : target.timeTaken,
        attempted: att !== undefined && att !== null ? String(att) : target.attempted,
        correct: cor !== undefined && cor !== null ? String(cor) : target.correct,
        topic: target.topic ? target.topic : (parsed.topic || ''),
        subsection: target.subsection && target.subsection !== cfg.subsections[0]
          ? target.subsection
          : (parsed.subsection || target.subsection || cfg.subsections[0]),
        label: target.label ? target.label : (lbl || ''),
        source: target.source && target.source !== SOURCES[0]
          ? target.source
          : (parsed.source || target.source || SOURCES[0]),
        difficulty: target.difficulty && target.difficulty !== 'Medium'
          ? target.difficulty
          : (parsed.difficulty || target.difficulty || 'Medium'),
      };

      nextRows[targetIdx] = merged;
      return nextRows;
    });

    setStatus({ type: 'success', msg: 'Autofilled details from screenshot into active entry! Please review.' });
  }

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
      setRows([blankRow(sectionKey, defaults)]);
    } catch (e2) {
      setStatus({ type: 'error', msg: e2.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="entry-form-container">
      <AIScreenshotLog onAutofill={handleAutofill} />
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
    </div>
  );
}

function RowCard({ row, index, sectionKey, onChange, onRemove, removable }) {
  const cfg = SECTIONS[sectionKey];
  const stats = computeStats(row);
  const topicOptions = TOPIC_SUGGESTIONS[row.subsection] || [];
  const listId = `topics-${row.key}`;
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
      const newVocab = [...(row.vocab || [{ word: '', meaning: '' }])];
      newVocab[idx] = { ...newVocab[idx], meaning };
      onChange({ vocab: newVocab });
    } catch (err) {
      console.error(err);
      alert('Failed to fetch meaning. Please type it manually.');
    } finally {
      setDefiningIdx(null);
    }
  }

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

        <label>
          Difficulty
          <div className="seg">
            {DIFFICULTY_OPTIONS.map((d) => (
              <button
                key={d} type="button"
                className={`seg__btn ${row.difficulty === d ? 'seg__btn--active-neutral' : ''}`}
                onClick={() => onChange({ difficulty: d })}
              >
                {d}
              </button>
            ))}
          </div>
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

      {sectionKey === 'VARC' && (
        <div className="vocab-editor">
          <span className="row-card__tags-label">New vocabulary <span className="optional">(optional)</span></span>
          {(row.vocab || [{ word: '', meaning: '' }]).map((v, idx) => (
            <div key={idx} className="vocab-editor__row">
              <input placeholder="word" value={v.word} onChange={(e) => {
                const newVocab = [...(row.vocab || [{ word: '', meaning: '' }])];
                newVocab[idx] = { ...newVocab[idx], word: e.target.value };
                onChange({ vocab: newVocab });
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
                const newVocab = [...(row.vocab || [{ word: '', meaning: '' }])];
                newVocab[idx] = { ...newVocab[idx], meaning: e.target.value };
                onChange({ vocab: newVocab });
              }} />
              {(row.vocab || []).length > 1 && (
                <button type="button" className="icon-btn" onClick={() => {
                  onChange({ vocab: (row.vocab || []).filter((_, i) => i !== idx) });
                }}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => {
            onChange({ vocab: [...(row.vocab || [{ word: '', meaning: '' }]), { word: '', meaning: '' }] });
          }}>+ Add word</button>
        </div>
      )}

      <div className="row-card__tags">
        <span className="row-card__tags-label">What went well <span className="optional">(optional, max 3)</span>:</span>
        <TagPicker value={row.goodTags} onChange={(tags) => onChange({ goodTags: tags })} options={POSITIVE_TAGS} good />
      </div>

      <div className="row-card__tags">
        <span className="row-card__tags-label">What went wrong <span className="optional">(optional, max 3)</span>:</span>
        <TagPicker value={row.mistakeTags} onChange={(tags) => onChange({ mistakeTags: tags })} options={MISTAKE_TAGS} />
      </div>

      <div className="row-card__stats">
        <Stat label="Accuracy" value={`${stats.accuracy}%`} />
        <Stat label="Marks" value={stats.marks} />
        <Stat label="Lost" value={stats.marksLost} />
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
