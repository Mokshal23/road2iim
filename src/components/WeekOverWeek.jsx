import { SECTION_LIST } from '../constants';
import { aggregate } from '../utils/calc';
import { weekRange, shiftWeek } from '../utils/dates';

export default function WeekOverWeek({ entries, anchorDate }) {
  const thisWeek = weekRange(anchorDate);
  const lastWeekAnchor = shiftWeek(anchorDate, -1);
  const lastWeek = weekRange(lastWeekAnchor);

  const thisWeekEntries = entries.filter((e) => e.date >= thisWeek.start && e.date <= thisWeek.end);
  const lastWeekEntries = entries.filter((e) => e.date >= lastWeek.start && e.date <= lastWeek.end);

  return (
    <div className="card">
      <h3>This week vs last week</h3>
      <div className="wow-grid">
        {SECTION_LIST.map((s) => {
          const cur = aggregate(thisWeekEntries.filter((e) => e.section === s.key));
          const prev = aggregate(lastWeekEntries.filter((e) => e.section === s.key));
          const hasCur = thisWeekEntries.some((e) => e.section === s.key);
          const hasPrev = lastWeekEntries.some((e) => e.section === s.key);

          return (
            <div key={s.key} className="wow-card" style={{ borderColor: s.color }}>
              <h4 style={{ color: s.color }}>{s.label}</h4>
              <WowRow label="Accuracy" cur={hasCur ? cur.accuracy : null} prev={hasPrev ? prev.accuracy : null} suffix="%" />
              <WowRow label="Marks/min" cur={hasCur ? cur.marksPerMinute : null} prev={hasPrev ? prev.marksPerMinute : null} />
              <WowRow label="Questions attempted" cur={hasCur ? cur.attempted : null} prev={hasPrev ? prev.attempted : null} higherIsBetter={null} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WowRow({ label, cur, prev, suffix = '', higherIsBetter = true }) {
  const hasBoth = cur !== null && prev !== null;
  const delta = hasBoth ? round(cur - prev) : null;
  const positive = delta !== null && delta > 0;
  const negative = delta !== null && delta < 0;
  const goodDirection = higherIsBetter === null ? null : (higherIsBetter ? positive : negative);
  const badDirection = higherIsBetter === null ? null : (higherIsBetter ? negative : positive);

  return (
    <div className="wow-row">
      <span className="wow-row__label">{label}</span>
      <span className="wow-row__values">
        <span className="wow-row__cur">{cur ?? '—'}{cur !== null ? suffix : ''}</span>
        <span className="wow-row__prev">prev {prev ?? '—'}{prev !== null ? suffix : ''}</span>
        {hasBoth && delta !== 0 && (
          <span className={`wow-row__delta ${goodDirection ? 'wow-row__delta--up' : badDirection ? 'wow-row__delta--down' : ''}`}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}{suffix}
          </span>
        )}
      </span>
    </div>
  );
}

function round(n) {
  return Math.round(n * 10) / 10;
}
