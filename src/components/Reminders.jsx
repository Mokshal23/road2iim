import { useState } from 'react';
import { addReminder, dismissReminder, removeReminder } from '../hooks/useReminders';
import { formatPretty, todayStr } from '../utils/dates';

export default function Reminders({ reminders }) {
  const [form, setForm] = useState({ text: '', date: '' });
  const [saving, setSaving] = useState(false);

  const today = todayStr();
  const minDate = shiftDate(today, -1);
  const maxDate = shiftDate(today, 7);

  const visible = reminders
    .filter((r) => !r.dismissed && r.date >= minDate && r.date <= maxDate)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.text.trim() || !form.date) return;
    setSaving(true);
    await addReminder(form);
    setForm({ text: '', date: '' });
    setSaving(false);
  }

  return (
    <div className="card reminder-card">
      <h3>🔔 Upcoming</h3>

      {visible.length === 0 ? (
        <p className="empty">No upcoming reminders.</p>
      ) : (
        <ul className="reminder-list">
          {visible.map((r) => {
            const cls =
              r.date < today ? 'reminder-item reminder-item--overdue' :
              r.date === today ? 'reminder-item reminder-item--today' :
              'reminder-item';
            return (
              <li key={r.id} className={cls}>
                <span className="reminder-item__text">{r.text}</span>
                <span className="reminder-item__date">{formatPretty(r.date)}</span>
                <button className="icon-btn" onClick={() => dismissReminder(r.id)} aria-label="Dismiss reminder">✓</button>
                <button className="icon-btn" onClick={() => removeReminder(r.id)} aria-label="Delete reminder">✕</button>
              </li>
            );
          })}
        </ul>
      )}

      <form className="reminder-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder='Reminder — e.g. "SimCAT this Saturday"'
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
        />
        <input
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? '…' : 'Add'}
        </button>
      </form>
    </div>
  );
}

/** Shift a YYYY-MM-DD string by n days and return a new YYYY-MM-DD string. */
function shiftDate(dateStr, n) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  } catch (e) {
    console.error('Error shifting date:', e);
    return '';
  }
}
