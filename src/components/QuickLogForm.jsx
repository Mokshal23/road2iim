import { useState, useEffect, useMemo } from 'react';
import { SECTIONS, TOPIC_SUGGESTIONS, SOURCES, MISTAKE_TAGS, POSITIVE_TAGS, DIFFICULTY_OPTIONS } from '../constants';
import { computeStats } from '../utils/calc';
import { todayStr } from '../utils/dates';
import { saveSessionRows } from '../hooks/useEntries';
import TagPicker from './TagPicker';
import VoiceInput from './VoiceInput';
import AIScreenshotLog from './AIScreenshotLog';
import { defineWordWithGemini } from '../utils/ai';
import { useAppStore } from '../store/useAppStore';
import { safeStorage } from '../utils/storage';

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
  
  const [form, setForm] = useState(() => {
    const draftKey = `quick_log_draft_${sectionKey}`;
    const draft = safeStorage.getSessionItem(draftKey);
    return draft || {
      subsection: seed.subsection, topic: seed.topic, source: seed.source,
      label: '',
      timeTaken: '', attempted: '', correct: '', negativeMarking: true, mistakeTags: [], goodTags: [],
      difficulty: 'Medium', vocab: [],
    };
  });
  const [showVocab, setShowVocab] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const stats = computeStats(form);
  const [definingIdx, setDefiningIdx] = useState(null);

  // Autosave form changes to sessionStorage
  useEffect(() => {
    safeStorage.setSessionItem(`quick_log_draft_${sectionKey}`, form);
  }, [form, sectionKey]);

  const labelSuggestions = useMemo(() => {
    const labels = new Set();
    entries.forEach((e) => {
      if (e.label && e.label.trim()) {
        labels.add(e.label.trim());
      }
    });
    return Array.from(labels).sort();
  }, [entries]);

  const topicOptions = useMemo(() => {
    const opts = new Set(TOPIC_SUGGESTIONS[form.subsection] || []);
    entries.forEach((e) => {
      if (e.subsection === form.subsection && e.topic && e.topic.trim()) {
        opts.add(e.topic.trim());
      }
    });
    return Array.from(opts).sort();
  }, [form.subsection, entries]);

  const isInvalid = form.attempted !== '' && form.correct !== '' && Number(form.correct) > Number(form.attempted);

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

    setForm((f) => ({
      ...f,
      timeTaken: time !== undefined && time !== null ? String(time) : f.timeTaken,
      attempted: att !== undefined && att !== null ? String(att) : f.attempted,
      correct: cor !== undefined && cor !== null ? String(cor) : f.correct,
      source: parsed.source || f.source,
      difficulty: parsed.difficulty || f.difficulty,
      topic: parsed.topic || f.topic,
      subsection: parsed.subsection || f.subsection,
      label: lbl || f.label,
    }));
    setStatus({ type: 'success', msg: 'Autofilled from screenshot! Please review details.' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    const hasTime = form.timeTaken !== '';
    const hasAttempted = form.attempted !== '';
    const hasCorrect = form.correct !== '';

    if (hasTime) {
      const time = Number(form.timeTaken);
      if (isNaN(time) || time <= 0) {
        setStatus({ type: 'error', msg: 'Time taken must be a valid number greater than 0.' });
        return;
      }
    }

    if (hasAttempted || hasCorrect) {
      if (!hasAttempted || !hasCorrect) {
        setStatus({ type: 'error', msg: 'If logging questions, both attempted and correct must be filled.' });
        return;
      }
      const att = Number(form.attempted);
      const cor = Number(form.correct);
      if (isNaN(att) || isNaN(cor)) {
        setStatus({ type: 'error', msg: 'Attempted and correct must be valid numbers.' });
        return;
      }
      if (att < 0 || cor < 0) {
        setStatus({ type: 'error', msg: 'Attempted and correct must be non-negative.' });
        return;
      }
      if (!Number.isInteger(att) || !Number.isInteger(cor)) {
        setStatus({ type: 'error', msg: 'Attempted and correct must be whole numbers.' });
        return;
      }
      if (cor > att) {
        setStatus({ type: 'error', msg: 'Correct answers cannot exceed attempted questions.' });
        return;
      }
    }

    const hasContent = form.topic || form.label || form.notes || (form.vocab && form.vocab.length > 0 && form.vocab[0].word) || (form.mistakeTags && form.mistakeTags.length > 0) || (form.goodTags && form.goodTags.length > 0);
    if (!hasTime && !hasAttempted && !hasCorrect && !hasContent) {
      setStatus({ type: 'error', msg: 'Please enter some details (time, questions, topic, notes, or vocab) to log.' });
      return;
    }

    setSaving(true);
    try {
      await saveSessionRows([{ ...form, date: todayStr(), section: sectionKey, notes: '' }]);
      useAppStore.getState().showToast('Session logged successfully!', 'success');
      safeStorage.removeSessionItem(`quick_log_draft_${sectionKey}`);
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
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}>
          <input
            list="quick-topics"
            value={form.topic}
            placeholder="Topic"
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            style={{ width: '100%', paddingRight: '36px' }}
          />
          <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            <VoiceInput onTranscript={(val) => setForm(f => ({ ...f, topic: val }))} />
          </div>
        </div>
        <datalist id="quick-topics">{topicOptions.map((t) => <option key={t} value={t} />)}</datalist>

        <div style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}>
          <input
            list="quick-labels"
            value={form.label}
            placeholder="Heading (e.g. Passage 1)"
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            style={{ width: '100%', paddingRight: '36px' }}
          />
          <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            <VoiceInput onTranscript={(val) => setForm(f => ({ ...f, label: val }))} />
          </div>
        </div>
        <datalist id="quick-labels">
          {labelSuggestions.map((l) => <option key={l} value={l} />)}
        </datalist>
        <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={{ flexShrink: 0 }}>
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
        <label style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          Time (min)
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
            <input type="number" min="0" step="0.5" autoFocus value={form.timeTaken} onChange={(e) => setForm({ ...form, timeTaken: e.target.value })} style={{ width: '100%', paddingRight: '36px', margin: 0 }} />
            <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>
              <VoiceInput onTranscript={(val) => setForm(f => ({ ...f, timeTaken: val }))} isNumeric />
            </div>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          Attempted
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
            <input type="number" min="0" value={form.attempted} onChange={(e) => setForm({ ...form, attempted: e.target.value })} style={{ width: '100%', paddingRight: '36px', margin: 0 }} />
            <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>
              <VoiceInput onTranscript={(val) => setForm(f => ({ ...f, attempted: val }))} isNumeric />
            </div>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', position: 'relative', color: isInvalid ? 'var(--red)' : undefined }}>
          Correct
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
            <input
              type="number"
              min="0"
              value={form.correct}
              onChange={(e) => setForm({ ...form, correct: e.target.value })}
              style={{
                width: '100%',
                paddingRight: '36px',
                margin: 0,
                borderColor: isInvalid ? 'var(--red)' : undefined,
                outlineColor: isInvalid ? 'var(--red)' : undefined
              }}
            />
            <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>
              <VoiceInput onTranscript={(val) => setForm(f => ({ ...f, correct: val }))} isNumeric />
            </div>
          </div>
        </label>
      </div>
      {isInvalid && (
        <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: '-8px', marginBottom: '8px', fontWeight: 500 }}>
          ⚠️ Correct answers ({form.correct}) cannot exceed attempted questions ({form.attempted}).
        </div>
      )}

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
        <span className="quick-log__stats">
          {stats.accuracy === null ? '📖 Concept study log' : `${stats.accuracy}% acc · ${stats.marksPerMinute} mpm · ${stats.marksLost} lost`}
        </span>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save & log next'}</button>
      </div>
      {status && <div className={`status status--${status.type}`}>{status.msg}</div>}
    </form>
    </div>
  );
}
