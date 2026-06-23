import { useMemo, useState } from 'react';
import { SECTIONS } from '../constants';
import { formatPretty, todayStr, groupByDate } from '../utils/dates';
import { aggregate } from '../utils/calc';
import { deleteEntry } from '../hooks/useEntries';

export default function DayDrilldown({ entries, readOnly = false }) {
  const [selected, setSelected] = useState(null);
  const grouped = useMemo(() => groupByDate(entries), [entries]);
  const recentDates = useMemo(() => Object.keys(grouped).sort((a, b) => b.localeCompare(a)).slice(0, 14), [grouped]);

  const activeDate = selected || recentDates[0] || null;
  const dayEntries = activeDate ? (grouped[activeDate] || []) : [];
  const dayAgg = aggregate(dayEntries);

  return (
    <div className="card">
      <div className="card__head">
        <h3>Day-by-day log</h3>
        <input
          type="date"
          max={todayStr()}
          value={selected || ''}
          onChange={(e) => setSelected(e.target.value)}
        />
      </div>

      <div className="day-chips">
        {recentDates.map((d) => (
          <button
            key={d}
            className={`day-chip ${d === activeDate ? 'day-chip--active' : ''}`}
            onClick={() => setSelected(d)}
          >
            {formatPretty(d).split(',')[0]} {d.slice(-2)}
          </button>
        ))}
      </div>

      {!activeDate || dayEntries.length === 0 ? (
        <p className="empty">No entries for this date.</p>
      ) : (
        <>
          <p className="day-summary">
            <strong>{formatPretty(activeDate)}</strong> — {dayEntries.length} session{dayEntries.length > 1 ? 's' : ''},{' '}
            {dayAgg.accuracy}% overall accuracy, {dayAgg.marksPerMinute} marks/min, {dayAgg.timeTaken} min total
          </p>
          <table className="day-table">
            <thead>
              <tr>
                <th>Section</th><th>Subsection</th><th>Topic</th><th>Label</th>
                <th>Time</th><th>Att.</th><th>Cor.</th><th>Acc.</th><th>Mpm</th><th>Tags</th><th>Source</th><th>Notes</th>
                {!readOnly && <th></th>}
              </tr>
            </thead>
            <tbody>
              {dayEntries.map((e) => (
                <tr key={e.id}>
                  <td><span className="dot" style={{ background: SECTIONS[e.section]?.color }} /> {SECTIONS[e.section]?.label}</td>
                  <td>{e.subsection}</td>
                  <td>{e.topic}</td>
                  <td>{e.label || '—'}</td>
                  <td>{e.timeTaken}m</td>
                  <td>{e.attempted}</td>
                  <td>{e.correct}</td>
                  <td>{e.accuracy}%</td>
                  <td>{e.marksPerMinute}</td>
                  <td className="tags-cell">{(e.mistakeTags || []).join(', ')}</td>
                  <td>{e.source}</td>
                  <td className="tags-cell">{e.notes || '—'}</td>
                  {!readOnly && (
                    <td>
                      <button className="icon-btn" onClick={() => deleteEntry(e.id)} aria-label="Delete">🗑</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
