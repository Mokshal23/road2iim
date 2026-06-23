import { useState } from 'react';
import { todayStr } from '../utils/dates';
import { saveDailyTargets } from '../hooks/useDailyTargets';

export default function DailyGoalMeter({ entries, aeonArticles, targets, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(targets);
  const [saving, setSaving] = useState(false);
  const today = todayStr();

  const varcCount = entries.filter((e) => e.date === today && e.section === 'VARC').length;
  const qaHours = entries.filter((e) => e.date === today && e.section === 'QA')
    .reduce((acc, e) => acc + (Number(e.timeTaken) || 0), 0) / 60;
  const dilrHours = entries.filter((e) => e.date === today && e.section === 'LRDI')
    .reduce((acc, e) => acc + (Number(e.timeTaken) || 0), 0) / 60;
  const aeonCount = aeonArticles.filter((a) => a.date === today).length;

  const meters = [
    { key: 'varc', label: 'VARC sets', value: varcCount, target: targets.varcCount, unit: 'sets', color: '#E8A33D' },
    { key: 'qa', label: 'QA practice', value: qaHours, target: targets.qaHours, unit: 'hrs', color: '#2BB3A3' },
    { key: 'dilr', label: 'LRDI practice', value: dilrHours, target: targets.dilrHours, unit: 'hrs', color: '#5B8DEF' },
    { key: 'aeon', label: 'Aeon articles', value: aeonCount, target: targets.aeonCount, unit: 'read', color: '#9aa0ab' },
  ];

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await saveDailyTargets({
      varcCount: Number(form.varcCount),
      qaHours: Number(form.qaHours),
      dilrHours: Number(form.dilrHours),
      aeonCount: Number(form.aeonCount),
    });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="card">
      <div className="card__head">
        <h3>Today's goals</h3>
        {!readOnly && (
          <button className="btn btn--ghost btn--sm" onClick={() => { setForm(targets); setEditing((v) => !v); }}>
            {editing ? 'Cancel' : 'Edit targets'}
          </button>
        )}
      </div>

      {editing ? (
        <form className="goal-form" onSubmit={handleSave}>
          <div className="goal-form__grid">
            <label>VARC sets/day<input type="number" min="0" step="1" value={form.varcCount} onChange={(e) => setForm({ ...form, varcCount: e.target.value })} /></label>
            <label>QA hrs/day<input type="number" min="0" step="0.5" value={form.qaHours} onChange={(e) => setForm({ ...form, qaHours: e.target.value })} /></label>
            <label>LRDI hrs/day<input type="number" min="0" step="0.5" value={form.dilrHours} onChange={(e) => setForm({ ...form, dilrHours: e.target.value })} /></label>
            <label>Aeon articles/day<input type="number" min="0" step="1" value={form.aeonCount} onChange={(e) => setForm({ ...form, aeonCount: e.target.value })} /></label>
          </div>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Saving…' : 'Save targets'}</button>
        </form>
      ) : (
        <div className="meter-grid">
          {meters.map((m) => {
            const pct = m.target > 0 ? Math.min(100, Math.round((m.value / m.target) * 100)) : 0;
            const done = m.value >= m.target && m.target > 0;
            return (
              <div key={m.key} className="meter">
                <div className="meter__top">
                  <span>{m.label}</span>
                  <span className="meter__value">{round1(m.value)} / {m.target} {m.unit}</span>
                </div>
                <div className="meter__track">
                  <div
                    className="meter__fill"
                    style={{ width: `${pct}%`, background: done ? 'var(--success)' : m.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
