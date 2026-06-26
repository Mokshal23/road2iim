import { useMemo, useState } from 'react';
import { addComment, addReply, removeComment } from '../hooks/useComments';
import { formatPretty, todayStr } from '../utils/dates';

export default function CommentsPanel({ comments, canWrite = false, viewerRole = 'student' }) {
  const [text, setText] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  const threads = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parentId);
    const repliesByParent = {};
    for (const c of comments) {
      if (c.parentId) {
        if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = [];
        repliesByParent[c.parentId].push(c);
      }
    }
    return topLevel.map((t) => ({
      ...t,
      replies: (repliesByParent[t.id] || []).sort((a, b) => {
        const getMs = (e) => {
          if (!e.createdAt) return 0;
          if (typeof e.createdAt === 'string') return new Date(e.createdAt).getTime();
          if (e.createdAt?.seconds) return e.createdAt.seconds * 1000;
          if (e.createdAt?.toMillis) return e.createdAt.toMillis();
          return 0;
        };
        return getMs(a) - getMs(b);
      }),
    }));
  }, [comments]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    await addComment({ date, text: text.trim(), author: 'mentor' });
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

      {threads.length === 0 ? (
        <p className="empty">No notes yet.</p>
      ) : (
        <ul className="comment-list">
          {threads.slice(0, 12).map((t) => (
            <Thread key={t.id} thread={t} canDelete={canWrite} viewerRole={viewerRole} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Thread({ thread, canDelete, viewerRole }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSaving(true);
    await addReply({ parentId: thread.id, text: replyText.trim(), author: viewerRole });
    setReplyText('');
    setSaving(false);
    setReplying(false);
  }

  return (
    <li className="comment-item">
      <div className="comment-item__top">
        <span className="comment-item__date">{thread.date ? formatPretty(thread.date) : 'General'}</span>
        <span className="comment-item__text">{thread.text}</span>
        {canDelete && (
          <button className="icon-btn" onClick={() => removeComment(thread.id)} aria-label="Delete note">✕</button>
        )}
      </div>

      {thread.replies?.length > 0 && (
        <ul className="reply-list">
          {thread.replies.map((r) => (
            <li key={r.id} className="reply-item">
              <span className="reply-item__author">{r.author === 'mentor' ? 'Mentor' : 'Mokshal'}:</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}

      {replying ? (
        <form className="reply-form" onSubmit={handleReply}>
          <input
            type="text"
            autoFocus
            placeholder="Write a reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? '…' : 'Reply'}</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReplying(false)}>Cancel</button>
        </form>
      ) : (
        <button className="reply-toggle" onClick={() => setReplying(true)}>Reply</button>
      )}
    </li>
  );
}
