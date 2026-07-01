import { useState } from 'react';
import Modal from './Modal';
import { MOCK_SOURCES, SECTIONS, POSITIVE_TAGS, MISTAKE_TAGS } from '../constants';
import { updateMockTest } from '../hooks/useMockTests';
import TagPicker from './TagPicker';
import VoiceInput from './VoiceInput';

const SECTION_KEYS = ['VARC', 'LRDI', 'QA'];

export default function EditMockModal({ mock, onClose }) {
  const [date, setDate] = useState(mock.date);
  const [source, setSource] = useState(mock.source);
  const [label, setLabel] = useState(mock.label || '');
  const [overallScore, setOverallScore] = useState(mock.overallScore);
  const [overallPercentile, setOverallPercentile] = useState(mock.overallPercentile);
  const [notes, setNotes] = useState(mock.notes || '');
  const [sections, setSections] = useState(
    Object.fromEntries(SECTION_KEYS.map((k) => [k, {
      attempted: mock.sections?.[k]?.attempted ?? 0,
      correct: mock.sections?.[k]?.correct ?? 0,
      timeTaken: mock.sections?.[k]?.timeTaken ?? 0,
    }]))
  );
  const [goodTags, setGoodTags] = useState(mock.goodTags || []);
  const [mistakeTags, setMistakeTags] = useState(mock.mistakeTags || []);
  const [saving, setSaving] = useState(false);

  function updateSection(key, patch) {
    setSections((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await updateMockTest(mock.id, { date, source, label, overallScore, overallPercentile, notes, sections, goodTags, mistakeTags });
    setSaving(false);
    onClose();
  }

  return (
    <Modal title="Edit mock test" onClose={onClose}>
      <form onSubmit={handleSave}>
        <div className="row-card__grid">
          <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label>Source<select value={source} onChange={(e) => setSource(e.target.value)}>{MOCK_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            Label
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
              <input value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: '100%', paddingRight: '36px', margin: 0 }} />
              <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                <VoiceInput onTranscript={(val) => setLabel(val)} />
              </div>
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            Overall percentile
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
              <input type="number" min="0" max="100" step="0.01" value={overallPercentile} onChange={(e) => setOverallPercentile(e.target.value)} required style={{ width: '100%', paddingRight: '36px', margin: 0 }} />
              <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>
                <VoiceInput onTranscript={(val) => setOverallPercentile(val)} isNumeric />
              </div>
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            Overall score
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
              <input type="number" step="0.01" value={overallScore} onChange={(e) => setOverallScore(e.target.value)} required style={{ width: '100%', paddingRight: '36px', margin: 0 }} />
              <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>
                <VoiceInput onTranscript={(val) => setOverallScore(val)} isNumeric />
              </div>
            </div>
          </label>
        </div>

        <div className="mock-sections">
          {SECTION_KEYS.map((key) => {
            const cfg = SECTIONS[key];
            const s = sections[key];
            return (
              <div key={key} className="mock-section" style={{ borderColor: cfg.color }}>
                <h4 style={{ color: cfg.color }}>{cfg.label}</h4>
                <label style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  Attempted
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
                    <input type="number" min="0" value={s.attempted} onChange={(e) => updateSection(key, { attempted: e.target.value })} required style={{ width: '100%', paddingRight: '36px', margin: 0 }} />
                    <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>
                      <VoiceInput onTranscript={(val) => updateSection(key, { attempted: val })} isNumeric />
                    </div>
                  </div>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  Correct
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
                    <input type="number" min="0" value={s.correct} onChange={(e) => updateSection(key, { correct: e.target.value })} required style={{ width: '100%', paddingRight: '36px', margin: 0 }} />
                    <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>
                      <VoiceInput onTranscript={(val) => updateSection(key, { correct: val })} isNumeric />
                    </div>
                  </div>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  Time (min)
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
                    <input type="number" min="0" step="0.5" value={s.timeTaken} onChange={(e) => updateSection(key, { timeTaken: e.target.value })} required style={{ width: '100%', paddingRight: '36px', margin: 0 }} />
                    <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>
                      <VoiceInput onTranscript={(val) => updateSection(key, { timeTaken: val })} isNumeric />
                    </div>
                  </div>
                </label>
              </div>
            );
          })}
        </div>

        <div className="row-card__tags" style={{ marginTop: '15px' }}>
          <span className="row-card__tags-label">What went well <span className="optional">(optional, max 3)</span>:</span>
          <TagPicker value={goodTags} onChange={setGoodTags} options={POSITIVE_TAGS} good />
        </div>

        <div className="row-card__tags" style={{ marginTop: '10px' }}>
          <span className="row-card__tags-label">What went wrong <span className="optional">(optional, max 3)</span>:</span>
          <TagPicker value={mistakeTags} onChange={setMistakeTags} options={MISTAKE_TAGS} />
        </div>

        <label className="aeon-summary" style={{ marginTop: '15px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          Notes
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', paddingRight: '36px', margin: 0 }} />
            <div style={{ position: 'absolute', right: '8px', bottom: '8px' }}>
              <VoiceInput onTranscript={(val) => setNotes(n => n ? n + ' ' + val : val)} />
            </div>
          </div>
        </label>

        <div className="entry-form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
