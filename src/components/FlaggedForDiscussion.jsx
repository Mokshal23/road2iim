import { SECTIONS } from '../constants';
import { formatPretty } from '../utils/dates';
import { toggleEntryFlag } from '../hooks/useEntries';
import { toggleMockFlag } from '../hooks/useMockTests';

export default function FlaggedForDiscussion({ entries, mocks }) {
  const flaggedEntries = entries.filter((e) => e.flagged);
  const flaggedMocks = mocks.filter((m) => m.flagged);
  const total = flaggedEntries.length + flaggedMocks.length;

  if (total === 0) return null;

  return (
    <div className="card flagged-card">
      <h3>⭐ Flagged for discussion ({total})</h3>
      <ul className="flagged-list">
        {flaggedEntries.map((e) => (
          <li key={e.id}>
            <span className="dot" style={{ background: SECTIONS[e.section]?.color }} />
            <span>{formatPretty(e.date)} — {SECTIONS[e.section]?.label} · {e.topic} ({e.accuracy}% acc, {e.marksPerMinute} mpm)</span>
            <button className="icon-btn" onClick={() => toggleEntryFlag(e)} aria-label="Clear flag">✕</button>
          </li>
        ))}
        {flaggedMocks.map((m) => (
          <li key={m.id}>
            <span className="dot" style={{ background: '#9aa0ab' }} />
            <span>{formatPretty(m.date)} — {m.source} mock ({m.overallPercentile}%ile, {m.overallScore} score)</span>
            <button className="icon-btn" onClick={() => toggleMockFlag(m)} aria-label="Clear flag">✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
