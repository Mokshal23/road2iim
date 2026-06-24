import { useState } from 'react';
import { SECTIONS } from '../constants';
import { addGoal, removeGoal } from '../hooks/useGoals';
import { aggregate } from '../utils/calc';
import { todayStr, formatPretty } from '../utils/dates';

const METRICS = {
  accuracy: { label: 'Accuracy %', better: 'higher' },
  marksPerMinute: { label: 'Marks / minute', better: 'higher' },
  timePerQuestion: { label: 'Minutes / question', better: 'lower' },
};

export default function GoalsPanel({ goals, entries, readOnly = false, sectionKey }) {
  const [form, setForm] = useState({ metric: 'accuracy', target: '', deadline: '', label: '' });
  const [saving, setSaving] = useState(false);

  const sectionGoals = goals.filter((g) => g.section === sectionKey);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.target || !form.deadline) return;
    setSaving(true);
    await addGoal({ ...form, section: sectionKey, target: Number(form.target) });
    setForm({ metric: 'accuracy', target: '', deadline: '', label: '' });
    setSaving(false);
  }

  // last 7 days of entries, regardless of which calendar week they fall in
  const last7 = entries.filter((e) => e.date >= shiftedDate(-7));

  return (
    <div className="card">
      <h3>Goals &amp; progress</h3>

      {sectionGoals.length === 0 ? (
        <p className="empty">No goals set yet.</p>
      ) : (
        <div className="goals-list">
          {sectionGoals.map((g) => {
            const sectionEntries = last7.filter((e) => e.section === g.section);
            const agg = aggregate(sectionEntries);
            const current = g.metric === 'timePerQuestion'
              ? (agg.attempted > 0 ? round(agg.timeTaken / agg.attempted) : null)
              : agg[g.metric];
            const hasData = sectionEntries.length > 0 && current !== null;
            const better = METRICS[g.metric]?.better;
            const onTrack = hasData && (better === 'higher' ? current >= g.target : current <= g.target);
            const daysLeft = Math.ceil((new Date(g.deadline) - new Date(todayStr())) / 86400000);

            return (
              <div key={g.id} className={`goal-card ${hasData ? (onTrack ? 'goal-card--on' : 'goal-card--off') : ''}`}>
                <div className="goal-card__top">
                  <span className="dot" style={{ background: SECTIONS[g.section]?.color }} />
                  <strong>{SECTIONS[g.section]?.label}</strong>
                  <span className="goal-card__metric">{METRICS[g.metric]?.label}</span>
                  {!readOnly && (
                    <button className="icon-btn" onClick={() => removeGoal(g.id)} aria-label="Remove goal">✕</button>
                  )}
                </div>
                {g.label && <p className="goal-card__label">{g.label}</p>}
                <p className="goal-card__progress">
                  Target: <strong>{g.target}</strong> by {formatPretty(g.deadline)} ({daysLeft >= 0 ? `${daysLeft}d left` : 'overdue'})
                  <br />
                  Last 7 days: <strong>{hasData ? current : 'no data yet'}</strong>
                  {hasData && (
                    <span className={`goal-tag ${onTrack ? 'goal-tag--on' : 'goal-tag--off'}`}>
                      {onTrack ? 'On pace' : 'Off pace'}
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <form className="goal-form" onSubmit={handleAdd}>
          <h4>Add a goal</h4>
          <div className="goal-form__grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <label>
              Metric
              <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
                {Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label>
              Target
              <input type="number" step="0.1" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} required />
            </label>
            <label>
              Deadline
              <input type="date" min={todayStr()} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
            </label>
            <label className="goal-form__note">
              Note <span className="optional">(optional)</span>
              <input value={form.label} placeholder="e.g. before mock #4" onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </label>
          </div>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? 'Saving…' : 'Add goal'}
          </button>
        </form>
      )}
    </div>
  );
}

function shiftedDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function round(n) {
  return Math.round(n * 100) / 100;
}
