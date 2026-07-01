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
      <div className="card time-of-day-analysis ai-card" style={{ marginTop: '24px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🕒 Time-of-day Performance Analysis</h3>
        <p className="insight" style={{ color: 'var(--text-secondary)' }}>Correlates your accuracy and speed (marks/min) with the system timestamp of when you logged the session.</p>
        <p className="empty" style={{ margin: '20px 0 0 0', color: 'var(--text-secondary)' }}>No practice logs with attempted questions found yet.</p>
      </div>
    );
  }

  return (
    <div className="card time-of-day-analysis ai-card" style={{ marginTop: '24px', padding: '24px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>🕒 Time-of-day Performance Analysis</h3>
      <p className="insight" style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Correlates your accuracy and speed (marks/min) with the system timestamp of when you logged the session.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <div>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table className="day-table" style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                  <th style={{ padding: '12px 16px' }}>Time Slot</th>
                  <th>Sessions</th>
                  <th>Avg. Accuracy</th>
                  <th>Avg. Speed</th>
                  <th style={{ paddingRight: '16px' }}>Total Time</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ fontWeight: 500, padding: '12px 16px' }}>{row.name}</td>
                    <td>{row.count} sets</td>
                    <td style={{ fontWeight: 600, color: row.count ? (row.accuracy >= 70 ? 'var(--success)' : 'var(--danger)') : 'inherit' }}>
                      {row.count ? `${row.accuracy}%` : '—'}
                    </td>
                    <td>{row.count ? `${row.mpm} mpm` : '—'}</td>
                    <td style={{ paddingRight: '16px' }}>{row.count ? `${row.timeTaken}m` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop: '20px',
            background: 'linear-gradient(90deg, rgba(74, 144, 226, 0.08) 0%, rgba(74, 144, 226, 0.01) 100%)',
            padding: '16px',
            borderRadius: '10px',
            borderLeft: '4px solid var(--blue)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>💡</span>
            <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text)' }}>
              <strong>Strategic Insight</strong>: {insight}
            </div>
          </div>
        </div>

        <div style={{
          height: '100%',
          minHeight: '260px',
          background: 'var(--surface-raised)',
          padding: '20px 16px 12px 16px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data.filter(d => d.count > 0)} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4a75c7" stopOpacity={0.95}/>
                  <stop offset="100%" stopColor="#4a75c7" stopOpacity={0.35}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="shortName" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-secondary)" domain={[0, 100]} fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: 'var(--text)' }}
                labelStyle={{ fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}
              />
              <Bar dataKey="accuracy" name="Accuracy (%)" fill="url(#accuracyGrad)" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
