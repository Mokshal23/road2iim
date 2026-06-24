import { useState } from 'react';
import { addTodo, toggleTodoDone, removeTodo } from '../hooks/useTodos';
import { formatPretty, todayStr } from '../utils/dates';

export default function PersonalTodos({ todos }) {
  const [form, setForm] = useState({ text: '', dueDate: '' });
  const [saving, setSaving] = useState(false);

  const pending = todos.filter((t) => !t.done);
  const completed = todos.filter((t) => t.done);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.text.trim()) return;
    setSaving(true);
    await addTodo(form);
    setForm({ text: '', dueDate: '' });
    setSaving(false);
  }

  return (
    <div className="card todo-card">
      <h3>📋 My to-dos</h3>

      {pending.length === 0 && completed.length === 0 ? (
        <p className="empty">No to-dos yet — add one below.</p>
      ) : (
        <ul className="task-list">
          {pending.map((t) => (
            <TodoRow key={t.id} todo={t} />
          ))}
          {completed.slice(0, 5).map((t) => (
            <TodoRow key={t.id} todo={t} />
          ))}
        </ul>
      )}

      <form className="task-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder='Add a to-do — e.g. "Revise Geometry formulas"'
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
        />
        <input
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        />
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? '…' : 'Add'}
        </button>
      </form>
    </div>
  );
}

function TodoRow({ todo }) {
  const overdue = todo.dueDate && !todo.done && todo.dueDate < todayStr();
  return (
    <li className={`task-row ${todo.done ? 'task-row--done' : ''}`}>
      <input type="checkbox" checked={todo.done} onChange={() => toggleTodoDone(todo)} />
      <span className="task-row__text">{todo.text}</span>
      {todo.dueDate && (
        <span className="task-row__due" style={overdue ? { color: 'var(--danger)' } : undefined}>
          due {formatPretty(todo.dueDate)}
        </span>
      )}
      <button className="icon-btn" onClick={() => removeTodo(todo.id)} aria-label="Delete to-do">✕</button>
    </li>
  );
}
