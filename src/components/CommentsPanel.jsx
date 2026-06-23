import { useState } from 'react';
import { addComment, removeComment } from '../hooks/useComments';
import { formatPretty, todayStr } from '../utils/dates';

export default function CommentsPanel({ comments, canWrite = false }) {
  const [text, setText] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    await addComment({ date, text: text.trim() });
    setText('');
    setSaving(false);
  }

  return (
    <div className="card">
      <h3>Mentor notes</h3>

      {canWrite && (
        <form className="comment-form" onSubmit={handleSubmit}>
          <div className="comment-form__row">
            <input type="date" max={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
            <input
              type="text"
              placeholder="Leave a note for Mokshal — e.g. focus on Arithmetic this week"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? '…' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {comments.length === 0 ? (
        <p className="empty">No notes yet.</p>
      ) : (
        <ul className="comment-list">
          {comments.slice(0, 12).map((c) => (
            <li key={c.id} className="comment-item">
              <span className="comment-item__date">{c.date ? formatPretty(c.date) : 'General'}</span>
              <span className="comment-item__text">{c.text}</span>
              {canWrite && (
                <button className="icon-btn" onClick={() => removeComment(c.id)} aria-label="Delete note">✕</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
