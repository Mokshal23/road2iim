import { SECTION_LIST, MISTAKE_TAGS } from '../constants';
import { aggregate } from '../utils/calc';
import { weekRange, shiftWeek, todayStr, formatPretty } from '../utils/dates';

export default function WeeklyDigest({ entries, tasks }) {
  const today = todayStr();
  const thisWeek = weekRange(today);
  const lastWeek = weekRange(shiftWeek(today, -1));

  const thisWeekEntries = entries.filter((e) => e.date >= thisWeek.start && e.date <= thisWeek.end);
  const lastWeekEntries = entries.filter((e) => e.date >= lastWeek.start && e.date <= lastWeek.end);

  const sectionLines = SECTION_LIST.map((s) => {
    const cur = aggregate(thisWeekEntries.filter((e) => e.section === s.key));
    const prev = aggregate(lastWeekEntries.filter((e) => e.section === s.key));
    const hasCur = thisWeekEntries.some((e) => e.section === s.key);
    const hasPrev = lastWeekEntries.some((e) => e.section === s.key);
    if (!hasCur) return null;
    const delta = hasPrev ? Math.round((cur.accuracy - prev.accuracy) * 10) / 10 : null;
    return { section: s, accuracy: cur.accuracy, delta };
  }).filter(Boolean);

  const tagCounts = MISTAKE_TAGS.map((tag) => ({
    tag,
    count: thisWeekEntries.reduce((acc, e) => acc + ((e.mistakeTags || []).includes(tag) ? 1 : 0), 0),
  })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count);
  const topTag = tagCounts[0];

  const tasksCompletedThisWeek = (tasks || []).filter((t) => {
    if (t.status !== 'done' || !t.completedAt) return false;
    const d = t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt);
    const ds = d.toISOString().slice(0, 10);
    return ds >= thisWeek.start && ds <= thisWeek.end;
  }).length;

  const totalSessions = thisWeekEntries.length;

  if (totalSessions === 0) {
    return (
      <div className="card digest-card">
        <h3>This week, at a glance</h3>
        <p className="empty">Nothing logged yet for {formatPretty(thisWeek.start)} – {formatPretty(thisWeek.end)}.</p>
      </div>
    );
  }

  return (
    <div className="card digest-card">
      <h3>This week, at a glance</h3>
      <p className="digest-card__lede">
        {totalSessions} session{totalSessions === 1 ? '' : 's'} logged this week
        {topTag && <> — <strong>{topTag.tag}</strong> showed up most ({topTag.count}×)</>}.
        {tasksCompletedThisWeek > 0 && <> {tasksCompletedThisWeek} mentor task{tasksCompletedThisWeek === 1 ? '' : 's'} closed out.</>}
      </p>
      <ul className="digest-card__list">
        {sectionLines.map(({ section, accuracy, delta }) => (
          <li key={section.key}>
            <span className="dot" style={{ background: section.color }} />
            <strong>{section.label}</strong>: {accuracy}% accuracy
            {delta !== null && delta !== 0 && (
              <span className={delta > 0 ? 'digest-delta digest-delta--up' : 'digest-delta digest-delta--down'}>
                {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}% vs last week
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
