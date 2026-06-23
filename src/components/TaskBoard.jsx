import { useState } from 'react';
import { TASK_SECTIONS, TASK_SECTION_META } from '../constants';
import { addTask, toggleTaskDone, removeTask } from '../hooks/useTasks';
import { formatPretty, todayStr } from '../utils/dates';

export default function TaskBoard({ tasks, canManage = false, sectionFilter = null, compact = false }) {
  const [form, setForm] = useState({ text: '', section: sectionFilter || 'General', dueDate: '' });
  const [saving, setSaving] = useState(false);

  const visible = sectionFilter ? tasks.filter((t) => t.section === sectionFilter) : tasks;
  const pending = visible.filter((t) => t.status !== 'done');
  const done = visible.filter((t) => t.status === 'done');

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.text.trim()) return;
    setSaving(true);
    await addTask(form);
    setForm({ text: '', section: sectionFilter || 'General', dueDate: '' });
    setSaving(false);
  }

  if (compact && pending.length === 0) return null;

  return (
    <div className={compact ? 'task-banner' : 'card'}>
      {!compact && <h3>{sectionFilter ? `Mentor tasks — ${TASK_SECTION_META[sectionFilter]?.label}` : 'Mentor tasks'}</h3>}

      {pending.length === 0 && done.length === 0 ? (
        !compact && <p className="empty">No tasks yet.</p>
      ) : (
        <ul className="task-list">
          {pending.map((t) => <TaskRow key={t.id} task={t} canManage={canManage} />)}
          {!compact && done.slice(0, 8).map((t) => <TaskRow key={t.id} task={t} canManage={canManage} />)}
        </ul>
      )}

      {canManage && !compact && (
        <form className="task-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder='New task — e.g. "Do 3 DILR sets on arrangements this week"'
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />
          <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
            {TASK_SECTIONS.map((s) => <option key={s} value={s}>{TASK_SECTION_META[s].label}</option>)}
          </select>
          <input type="date" min={todayStr()} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? '…' : 'Assign'}</button>
        </form>
      )}
    </div>
  );
}

function TaskRow({ task, canManage }) {
  const meta = TASK_SECTION_META[task.section] || TASK_SECTION_META.General;
  const isDone = task.status === 'done';
  return (
    <li className={`task-row ${isDone ? 'task-row--done' : ''}`}>
      <input type="checkbox" checked={isDone} onChange={() => toggleTaskDone(task)} />
      <span className="dot" style={{ background: meta.color }} />
      <span className="task-row__text">{task.text}</span>
      {task.dueDate && <span className="task-row__due">due {formatPretty(task.dueDate)}</span>}
      {canManage && (
        <button className="icon-btn" onClick={() => removeTask(task.id)} aria-label="Delete task">✕</button>
      )}
    </li>
  );
}
