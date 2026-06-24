import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { SECTIONS } from '../constants';
import { daysBetween, formatShort, weekRange, shiftWeek, formatPretty } from '../utils/dates';
import { aggregate } from '../utils/calc';

export default function WeeklyTrends({ entries, anchorDate, onAnchorChange, sectionKey }) {
  const section = SECTIONS[sectionKey];
  const subsections = section.subsections;
  const { start, end } = weekRange(anchorDate);
  const days = daysBetween(start, end);

  const subColors = subsections.length === 1
    ? [section.color]
    : [section.color, section.color + '99'];

  const data = days.map((day) => {
    const row = { day: formatShort(day), fullDate: day };
    for (const sub of subsections) {
      const dayEntries = entries.filter((e) => e.date === day && e.subsection === sub);
      const agg = aggregate(dayEntries);
      const key = sub.replace(/\s+/g, '_');
      row[`${key}_accuracy`] = dayEntries.length ? agg.accuracy : null;
      row[`${key}_mpm`] = dayEntries.length ? agg.marksPerMinute : null;
    }
    return row;
  });

  const weekEntries = entries.filter((e) => e.date >= start && e.date <= end);
  const summaries = subsections.map((sub, i) => ({
    sub,
    key: sub.replace(/\s+/g, '_'),
    color: subColors[i],
    agg: aggregate(weekEntries.filter((e) => e.subsection === sub)),
    count: weekEntries.filter((e) => e.subsection === sub).length,
  }));

  return (
    <div className="card">
      <div className="card__head">
        <h3>Weekly trends</h3>
        <div className="week-nav">
          <button className="btn btn--ghost btn--sm" onClick={() => onAnchorChange(shiftWeek(anchorDate, -1))}>← Prev</button>
          <span>{formatPretty(start)} – {formatPretty(end)}</span>
          <button className="btn btn--ghost btn--sm" onClick={() => onAnchorChange(shiftWeek(anchorDate, 1))}>Next →</button>
        </div>
      </div>

      <div className="summary-row">
        {summaries.map((s) => (
          <div key={s.key} className="summary-pill" style={{ borderColor: s.color }}>
            <span className="summary-pill__label" style={{ color: s.color }}>{s.sub}</span>
            <span className="summary-pill__stat">{s.count ? `${s.agg.accuracy}%` : '—'} acc</span>
            <span className="summary-pill__stat">{s.count ? s.agg.marksPerMinute : '—'} mpm</span>
            <span className="summary-pill__stat">{s.agg.timeTaken}m logged</span>
          </div>
        ))}
      </div>

      <div className="chart-block">
        <p className="chart-block__title">Accuracy %</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={12} />
            <YAxis stroke="var(--text-secondary)" fontSize={12} domain={[0, 100]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {summaries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={`${s.key}_accuracy`}
                name={s.sub}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-block">
        <p className="chart-block__title">Marks per minute</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={12} />
            <YAxis stroke="var(--text-secondary)" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {summaries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={`${s.key}_mpm`}
                name={s.sub}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
};
