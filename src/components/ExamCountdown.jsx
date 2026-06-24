import { useState } from 'react';
import { saveExamDate } from '../hooks/useExamDate';
import { todayStr, formatPretty } from '../utils/dates';

export default function ExamCountdown({ examDate, confirmed, targets, entries, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ date: examDate, confirmed });
  const [saving, setSaving] = useState(false);

  const today = todayStr();
  const daysLeft = Math.ceil((new Date(examDate + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);

  const sevenDaysAgo = shiftedDate(-6); // inclusive 7-day window
  const last7 = entries.filter((e) => e.date >= sevenDaysAgo && e.date <= today);
  const qaDilrHours = last7
    .filter((e) => e.section === 'QA' || e.section === 'LRDI')
    .reduce((acc, e) => acc + (Number(e.timeTaken) || 0), 0) / 60 / 7;
  const targetHoursPerDay = (targets.qaHours || 0) + (targets.dilrHours || 0);
  const gap = round1(targetHoursPerDay - qaDilrHours);
  const onPace = gap <= 0;

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await saveExamDate(form.date, form.confirmed);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="card countdown-card">
      <div className="card__head">
        <h3>Days to CAT</h3>
        {!readOnly && (
          <button className="btn btn--ghost btn--sm" onClick={() => { setForm({ date: examDate, confirmed }); setEditing((v) => !v); }}>
            {editing ? 'Cancel' : 'Edit date'}
          </button>
        )}
      </div>

      {editing ? (
        <form className="goal-form" onSubmit={handleSave}>
          <div className="goal-form__grid">
            <label>
              Exam date
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={form.confirmed} onChange={(e) => setForm({ ...form, confirmed: e.target.checked })} />
              Officially confirmed
            </label>
          </div>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </form>
      ) : (
        <>
          <div className="countdown-hero">
            <span className="countdown-hero__number">{daysLeft}</span>
            <span className="countdown-hero__label">day{daysLeft === 1 ? '' : 's'} left</span>
          </div>
          <p className="countdown-meta">
            {formatPretty(examDate)}{!confirmed && <span className="countdown-provisional"> · provisional, awaiting official notification</span>}
          </p>
          {targetHoursPerDay > 0 && (
            <p className={`countdown-pace ${onPace ? 'countdown-pace--on' : 'countdown-pace--off'}`}>
              Trailing 7-day average: <strong>{round1(qaDilrHours)} hrs/day</strong> QA+LRDI practice
              {' '}(target {targetHoursPerDay} hrs/day).{' '}
              {onPace ? "You're on pace." : <>Gap: <strong>+{gap} hrs/day</strong> needed to hit target.</>}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function shiftedDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
