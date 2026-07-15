import { useState, useMemo, useEffect } from 'react';
import { addTodo, toggleTodoDone, removeTodo, updateTodo } from '../hooks/useTodos';
import { formatPretty, todayStr } from '../utils/dates';

export default function PersonalTodos({ todos = [] }) {
  const [form, setForm] = useState({ text: '', dueDate: '', priority: 'Medium' });
  const [saving, setSaving] = useState(false);
  
  // Drag and Touch states
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [touchActiveIndex, setTouchActiveIndex] = useState(null);
  const [touchStartY, setTouchStartY] = useState(0);

  // Firestore sorted lists
  const pending = useMemo(() => {
    return todos
      .filter((t) => !t.done)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [todos]);

  const completed = useMemo(() => {
    return todos
      .filter((t) => t.done)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [todos]);

  // Local optimistic sorting state
  const [localPending, setLocalPending] = useState([]);

  // Sync local pending state when Firestore pending updates and no active interaction is happening
  useEffect(() => {
    if (draggedIndex === null && touchActiveIndex === null) {
      setLocalPending(pending);
    }
  }, [pending, draggedIndex, touchActiveIndex]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.text.trim()) return;
    setSaving(true);
    const maxOrder = pending.reduce((max, t) => (t.order > max ? t.order : max), 0);
    await addTodo({
      ...form,
      order: maxOrder ? maxOrder + 1000 : Date.now()
    });
    setForm({ text: '', dueDate: '', priority: 'Medium' });
    setSaving(false);
  }

  // Saves final sorted orders to database
  async function saveNewOrder(list) {
    try {
      await Promise.all(
        list.map((item, idx) => {
          const newOrder = 1000 * (idx + 1);
          if (item.order !== newOrder) {
            return updateTodo(item.id, { order: newOrder });
          }
          return Promise.resolve();
        })
      );
    } catch (err) {
      console.error('Failed to update todo order:', err);
    }
  }

  // Desktop Drag and Drop handlers
  function handleDragStart(index) {
    setDraggedIndex(index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Swap items in local state instantly for live preview
    const newPending = [...localPending];
    const [movedItem] = newPending.splice(draggedIndex, 1);
    newPending.splice(index, 0, movedItem);
    setLocalPending(newPending);
    setDraggedIndex(index);
  }

  async function handleDragEnd() {
    setDraggedIndex(null);
    await saveNewOrder(localPending);
  }

  // Touch Event handlers (iPad, mobile phone)
  function handleTouchStart(e, index) {
    setTouchActiveIndex(index);
    setTouchStartY(e.touches[0].clientY);
  }

  function handleTouchMove(e) {
    if (touchActiveIndex === null) return;
    const clientY = e.touches[0].clientY;
    const dY = clientY - touchStartY;
    const rowHeight = 44; // approximate height of a list item

    if (dY > rowHeight && touchActiveIndex < localPending.length - 1) {
      // Drag down: swap with the item below
      const targetIndex = touchActiveIndex + 1;
      const newPending = [...localPending];
      const [movedItem] = newPending.splice(touchActiveIndex, 1);
      newPending.splice(targetIndex, 0, movedItem);
      
      setLocalPending(newPending);
      setTouchActiveIndex(targetIndex);
      setTouchStartY(clientY);
    } else if (dY < -rowHeight && touchActiveIndex > 0) {
      // Drag up: swap with the item above
      const targetIndex = touchActiveIndex - 1;
      const newPending = [...localPending];
      const [movedItem] = newPending.splice(touchActiveIndex, 1);
      newPending.splice(targetIndex, 0, movedItem);
      
      setLocalPending(newPending);
      setTouchActiveIndex(targetIndex);
      setTouchStartY(clientY);
    }
  }

  async function handleTouchEnd() {
    if (touchActiveIndex === null) return;
    setTouchActiveIndex(null);
    await saveNewOrder(localPending);
  }

  // Rearranges via button clicks (mobile arrow clicks)
  async function moveItem(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= localPending.length) return;

    const newPending = [...localPending];
    const [movedItem] = newPending.splice(index, 1);
    newPending.splice(targetIndex, 0, movedItem);

    setLocalPending(newPending);
    await saveNewOrder(newPending);
  }

  const activeList = draggedIndex !== null || touchActiveIndex !== null ? localPending : pending;

  return (
    <div className="card todo-card">
      <h3>📋 My to-dos</h3>

      {activeList.length === 0 && completed.length === 0 ? (
        <p className="empty">No to-dos yet — add one below.</p>
      ) : (
        <ul className="task-list" style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
          {activeList.map((t, index) => (
            <TodoRow
              key={t.id}
              todo={t}
              index={index}
              totalPending={activeList.length}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMoveUp={() => moveItem(index, -1)}
              onMoveDown={() => moveItem(index, 1)}
              isDraggable={true}
              isDragging={draggedIndex === index || touchActiveIndex === index}
            />
          ))}
          {completed.slice(0, 5).map((t) => (
            <TodoRow key={t.id} todo={t} isDraggable={false} />
          ))}
        </ul>
      )}

      <form className="task-form" onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder='Add a to-do — e.g. "Revise Geometry formulas"'
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          required
          style={{ flex: 2, minWidth: '180px' }}
        />
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          style={{ flex: 1, minWidth: '100px' }}
        >
          <option value="High">🔴 High Priority</option>
          <option value="Medium">🟡 Medium Priority</option>
          <option value="Low">🔵 Low Priority</option>
        </select>
        <input
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          style={{ flex: 1, minWidth: '120px' }}
        />
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? '…' : 'Add'}
        </button>
      </form>
    </div>
  );
}

function TodoRow({
  todo,
  index,
  totalPending,
  onDragStart,
  onDragOver,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMoveUp,
  onMoveDown,
  isDraggable,
  isDragging
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editDueDate, setEditDueDate] = useState(todo.dueDate || '');
  const [editPriority, setEditPriority] = useState(todo.priority || 'Medium');
  const [updating, setUpdating] = useState(false);

  const overdue = todo.dueDate && !todo.done && todo.dueDate < todayStr();

  async function handleSave() {
    if (!editText.trim()) return;
    setUpdating(true);
    try {
      await updateTodo(todo.id, {
        text: editText,
        dueDate: editDueDate,
        priority: editPriority
      });
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update todo');
    } finally {
      setUpdating(false);
    }
  }

  // Define priority badge styles
  const getBadgeStyle = (priority) => {
    switch (priority) {
      case 'High':
        return {
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.25)'
        };
      case 'Low':
        return {
          background: 'rgba(59, 130, 246, 0.15)',
          color: '#3b82f6',
          border: '1px solid rgba(59, 130, 246, 0.25)'
        };
      case 'Medium':
      default:
        return {
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.25)'
        };
    }
  };

  const badgeStyle = {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    marginRight: '8px'
  };

  if (editing) {
    return (
      <li className="task-row edit-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--surface-raised)', padding: '10px', borderRadius: '8px', marginBottom: '8px', border: '1px dashed var(--border)' }}>
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          required
          style={{ flex: 2, minWidth: '150px', padding: '6px', margin: 0 }}
        />
        <select
          value={editPriority}
          onChange={(e) => setEditPriority(e.target.value)}
          style={{ flex: 1, minWidth: '90px', padding: '6px', margin: 0 }}
        >
          <option value="High">🔴 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🔵 Low</option>
        </select>
        <input
          type="date"
          value={editDueDate}
          onChange={(e) => setEditDueDate(e.target.value)}
          style={{ flex: 1, minWidth: '110px', padding: '6px', margin: 0 }}
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={updating} style={{ minHeight: 'auto', padding: '6px 12px' }}>
            {updating ? '…' : 'Save'}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setEditing(false)} disabled={updating} style={{ minHeight: 'auto', padding: '6px 12px' }}>
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`task-row ${todo.done ? 'task-row--done' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
        gap: '8px',
        cursor: isDraggable && !todo.done ? 'grab' : 'default',
        background: isDragging ? 'rgba(74, 144, 226, 0.08)' : 'transparent',
        transition: 'background 0.2s ease',
        touchAction: 'pan-y' // allows page scrolling normally on mobile/iPad touch
      }}
      draggable={isDraggable && !todo.done ? 'true' : 'false'}
      onDragStart={isDraggable && !todo.done ? onDragStart : undefined}
      onDragOver={isDraggable && !todo.done ? onDragOver : undefined}
      onDragEnd={isDraggable && !todo.done ? onDragEnd : undefined}
    >
      {isDraggable && !todo.done && (
        <span
          style={{
            cursor: 'grab',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            marginRight: '4px',
            userSelect: 'none',
            padding: '6px', // make touch target slightly larger for fingers
            touchAction: 'none' // locks scrolling ONLY when active touching the handle
          }}
          title="Drag to rearrange"
          onTouchStart={onTouchStart}
          onTouchMove={(e) => {
            e.preventDefault(); // lock viewport scroll while dragging handle
            onTouchMove(e);
          }}
          onTouchEnd={onTouchEnd}
        >
          ⠿
        </span>
      )}

      <input type="checkbox" checked={todo.done} onChange={() => toggleTodoDone(todo)} style={{ cursor: 'pointer' }} />
      
      {!todo.done && (
        <span style={{ ...badgeStyle, ...getBadgeStyle(todo.priority) }}>
          {todo.priority}
        </span>
      )}

      <span className="task-row__text" style={{ flex: 1, textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? 'var(--text-secondary)' : 'var(--text)' }}>
        {todo.text}
      </span>

      {todo.dueDate && (
        <span className="task-row__due" style={{ fontSize: '11px', color: overdue ? 'var(--danger)' : 'var(--text-secondary)', marginRight: '8px' }}>
          {overdue ? '⚠️ overdue ' : 'due '} {formatPretty(todo.dueDate)}
        </span>
      )}

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} className="todo-actions">
        {isDraggable && !todo.done && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px' }}>
            <button
              type="button"
              className="icon-btn"
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              disabled={index === 0}
              style={{ fontSize: '9px', padding: '2px 4px', opacity: index === 0 ? 0.3 : 0.8 }}
              title="Move Up"
            >
              ▲
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              disabled={index === totalPending - 1}
              style={{ fontSize: '9px', padding: '2px 4px', opacity: index === totalPending - 1 ? 0.3 : 0.8 }}
              title="Move Down"
            >
              ▼
            </button>
          </div>
        )}

        <button 
          className="icon-btn" 
          onClick={(e) => { e.stopPropagation(); setEditing(true); }} 
          aria-label="Edit to-do"
          style={{ fontSize: '13px', padding: '4px' }}
        >
          ✎
        </button>
        <button 
          className="icon-btn" 
          onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this to-do item?')) removeTodo(todo.id); }} 
          aria-label="Delete to-do"
          style={{ fontSize: '13px', padding: '4px' }}
        >
          ✕
        </button>
      </div>
    </li>
  );
}
