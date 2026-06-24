import { SECTIONS } from '../constants';
import { aggregate } from '../utils/calc';
import { weekRange, shiftWeek } from '../utils/dates';

export default function WeekOverWeek({ entries, anchorDate, sectionKey }) {
  const section = SECTIONS[sectionKey];
  const subsections = section.subsections;
  const thisWeek = weekRange(anchorDate);
  const lastWeekAnchor = shiftWeek(anchorDate, -1);
  const lastWeek = weekRange(lastWeekAnchor);

  const thisWeekEntries = entries.filter((e) => e.date >= thisWeek.start && e.date <= thisWeek.end);
  const lastWeekEntries = entries.filter((e) => e.date >= lastWeek.start && e.date <= lastWeek.end);

  const cur = aggregate(thisWeekEntries);
  const prev = aggregate(lastWeekEntries);
  const hasCur = thisWeekEntries.length > 0;
  const hasPrev = lastWeekEntries.length > 0;

  return (
    <div className="card">
      <h3>This week vs last week</h3>
      <div className="wow-card" style={{ borderColor: section.color }}>
        <h4 style={{ color: section.color }}>{section.label}</h4>
        <WowRow label="Accuracy" cur={hasCur ? cur.accuracy : null} prev={hasPrev ? prev.accuracy : null} suffix="%" />
        <WowRow label="Marks/min" cur={hasCur ? cur.marksPerMinute : null} prev={hasPrev ? prev.marksPerMinute : null} />
        <WowRow label="Marks lost" cur={hasCur ? (cur.marksLost ?? 0) : null} prev={hasPrev ? (prev.marksLost ?? 0) : null} higherIsBetter={false} />
        <WowRow label="Questions attempted" cur={hasCur ? cur.attempted : null} prev={hasPrev ? prev.attempted : null} higherIsBetter={null} />

        {subsections.length > 1 && subsections.map((sub) => {
          const subCur = aggregate(thisWeekEntries.filter((e) => e.subsection === sub));
          const subPrev = aggregate(lastWeekEntries.filter((e) => e.subsection === sub));
          const hasSubCur = thisWeekEntries.some((e) => e.subsection === sub);
          const hasSubPrev = lastWeekEntries.some((e) => e.subsection === sub);
          return (
            <WowRow
              key={sub}
              label={`${sub} acc.`}
              cur={hasSubCur ? subCur.accuracy : null}
              prev={hasSubPrev ? subPrev.accuracy : null}
              suffix="%"
            />
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
