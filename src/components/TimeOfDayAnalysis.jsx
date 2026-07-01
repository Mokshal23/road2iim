import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { aggregate } from '../utils/calc';

const SLOTS = [
  { key: 'morning', label: 'Morning (6 AM - 12 PM)', icon: '🌅', hrs: [6, 12] },
  { key: 'afternoon', label: 'Afternoon (12 PM - 5 PM)', icon: '☀️', hrs: [12, 17] },
  { key: 'evening', label: 'Evening (5 PM - 9 PM)', icon: '🌆', hrs: [17, 21] },
  { key: 'night', label: 'Night (9 PM - 6 AM)', icon: '🌙', hrs: [21, 6] },
];

export default function TimeOfDayAnalysis({ entries = [], sectionKey }) {
  const data = useMemo(() => {
    const groups = { morning: [], afternoon: [], evening: [], night: [] };

    // Filter to entries with attempted questions to analyze performance
    const activeEntries = entries.filter(e => (e.attempted || 0) > 0);

    activeEntries.forEach((e) => {
      if (!e.createdAt) return;
      
      let hr = 12; // default fallback
      try {
        let dateObj;
        if (e.createdAt?.seconds) {
          dateObj = new Date(e.createdAt.seconds * 1000);
        } else if (e.createdAt?.toDate) {
          dateObj = e.createdAt.toDate();
        } else {
          dateObj = new Date(e.createdAt);
        }
        hr = dateObj.getHours();
      } catch (err) {
        console.error(err);
      }

      // Categorize into slots
      if (hr >= 6 && hr < 12) {
        groups.morning.push(e);
      } else if (hr >= 12 && hr < 17) {
        groups.afternoon.push(e);
      } else if (hr >= 17 && hr < 21) {
        groups.evening.push(e);
      } else {
        groups.night.push(e);
      }
    });

    return SLOTS.map((s) => {
      const list = groups[s.key];
      const agg = aggregate(list);
      
      return {
        name: s.label,
        shortName: s.icon + ' ' + s.key.charAt(0).toUpperCase() + s.key.slice(1),
        count: list.length,
        accuracy: list.length ? agg.accuracy : 0,
        mpm: list.length ? agg.marksPerMinute : 0,
        timeTaken: list.reduce((sum, item) => sum + (Number(item.timeTaken) || 0), 0)
      };
    });
  }, [entries]);

  const insight = useMemo(() => {
    const activeSlots = data.filter(d => d.count >= 2);
    if (activeSlots.length < 2) {
      return "Log at least 2 sessions in multiple time slots across the day to see a comprehensive comparison of your performance.";
    }

    // Sort by accuracy descending to find best and worst
    const sorted = [...activeSlots].sort((a, b) => b.accuracy - a.accuracy);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const diff = Math.round(best.accuracy - worst.accuracy);

    if (diff < 5) {
      return `Your performance is remarkably consistent across the day! Accuracy averages around ${Math.round(best.accuracy)}% regardless of when you log your sets.`;
    }

    return `You perform best during the ${best.name.split(' ')[0]} with ${best.accuracy}% accuracy. Your performance drops during the ${worst.name.split(' ')[0]} to ${worst.accuracy}% (a ${diff}% drop). Consider scheduling mock solving during your peak hours!`;
  }, [data]);

  const hasAnyData = data.some(d => d.count > 0);

  if (!hasAnyData) {
    return (
      <div className="card time-of-day-analysis" style={{ marginTop: '24px' }}>
        <h3>🕒 Time-of-day Performance Analysis</h3>
        <p className="insight">Correlates your accuracy and speed (marks/min) with the system timestamp of when you logged the session.</p>
        <p className="empty" style={{ margin: '20px 0 0 0' }}>No practice logs with attempted questions found yet.</p>
      </div>
    );
  }

  return (
    <div className="card time-of-day-analysis" style={{ marginTop: '24px' }}>
      <h3>🕒 Time-of-day Performance Analysis</h3>
      <p className="insight">Correlates your accuracy and speed (marks/min) with the system timestamp of when you logged the session.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '20px' }}>
        <div>
          <table className="day-table">
            <thead>
              <tr>
                <th>Time Slot</th>
                <th>Sessions</th>
                <th>Avg. Accuracy</th>
                <th>Avg. Speed</th>
                <th>Total Time</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.name}>
                  <td style={{ fontWeight: 500 }}>{row.name}</td>
                  <td>{row.count} sets</td>
                  <td style={{ fontWeight: 600, color: row.count ? (row.accuracy >= 70 ? 'var(--success)' : 'var(--danger)') : 'inherit' }}>
                    {row.count ? `${row.accuracy}%` : '—'}
                  </td>
                  <td>{row.count ? `${row.mpm} mpm` : '—'}</td>
                  <td>{row.count ? `${row.timeTaken}m` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="insight" style={{ marginTop: '16px', background: 'var(--surface)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
            💡 <strong>Strategic Insight</strong>: {insight}
          </p>
        </div>

        <div style={{ height: '240px', background: 'var(--surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.filter(d => d.count > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="shortName" stroke="var(--text-secondary)" style={{ fontSize: '11px' }} />
              <YAxis stroke="var(--text-secondary)" domain={[0, 100]} style={{ fontSize: '11px' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '6px' }}
                labelStyle={{ fontWeight: 'bold', color: 'var(--text)' }}
              />
              <Bar dataKey="accuracy" name="Accuracy (%)" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
