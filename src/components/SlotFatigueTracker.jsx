import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { aggregate } from '../utils/calc';
import { todayStr } from '../utils/dates';

// Buckets mapping by chronological attempt sequence
const BUCKETS = [
  { key: '1st', label: '1st Set' },
  { key: '2nd', label: '2nd Set' },
  { key: '3rd', label: '3rd Set' },
  { key: '4th', label: '4th Set' },
  { key: '5th', label: '5th Set' },
  { key: '6th+', label: '6th+ Set' },
];

export default function SlotFatigueTracker({ entries = [], sectionKey, selectedDate }) {
  const dateToUse = selectedDate || todayStr();

  // Filter entries to only include those from the selected day and section
  const sectionEntries = useMemo(() => {
    return entries.filter((e) => e.section === sectionKey && e.date === dateToUse);
  }, [entries, sectionKey, dateToUse]);

  const chartData = useMemo(() => {
    const bucketEntries = { '1st': [], '2nd': [], '3rd': [], '4th': [], '5th': [], '6th+': [] };

    // Sort chronologically using createdAt or sessionSeq
    const sorted = [...sectionEntries].sort((a, b) => {
      const getMs = (e) => {
        if (e.createdAt?.seconds) return e.createdAt.seconds * 1000;
        if (e.createdAt?.toMillis) return e.createdAt.toMillis();
        return 0; // Exclude or put at beginning if no timestamp
      };
      const msA = getMs(a);
      const msB = getMs(b);
      if (msA !== msB) return msA - msB;
      return (a.sessionSeq || 0) - (b.sessionSeq || 0);
    });

    // Classify sorted entries into sequence order buckets
    sorted.forEach((e, idx) => {
      if (idx === 0) bucketEntries['1st'].push(e);
      else if (idx === 1) bucketEntries['2nd'].push(e);
      else if (idx === 2) bucketEntries['3rd'].push(e);
      else if (idx === 3) bucketEntries['4th'].push(e);
      else if (idx === 4) bucketEntries['5th'].push(e);
      else bucketEntries['6th+'].push(e);
    });

    // Aggregate stats per sequence bucket
    return BUCKETS.map((b) => {
      const list = bucketEntries[b.key];
      const agg = aggregate(list);
      const avgTime = list.length
        ? list.reduce((sum, e) => sum + (Number(e.timeTaken) || 0), 0) / list.length
        : 0;

      return {
        name: b.label,
        count: list.length,
        accuracy: list.length ? agg.accuracy : 0,
        mpm: list.length ? agg.marksPerMinute : 0,
        timeTaken: Math.round(avgTime * 10) / 10,
      };
    });
  }, [sectionEntries]);

  // Generate sequence-based coaching insight
  const insight = useMemo(() => {
    const fresh = chartData[0]; // 1st Set
    const lastIdx = chartData.findLastIndex((d) => d.count > 0);

    if (lastIdx <= 0) {
      return 'Practice multiple sessions on this day to see how your performance changes across sets.';
    }

    const current = chartData[lastIdx];
    const label = current.name;

    const accDelta = Math.round(current.accuracy - fresh.accuracy);
    const mpmDelta = Math.round((current.mpm - fresh.mpm) * 100) / 100;
    const timeDelta = Math.round((current.timeTaken - fresh.timeTaken) * 10) / 10;

    let text = `Comparing your ${label} to your 1st Set: `;
    const changes = [];

    if (Math.abs(accDelta) >= 5) {
      changes.push(`accuracy ${accDelta > 0 ? 'improved' : 'dropped'} by ${Math.abs(accDelta)}%`);
    }
    if (Math.abs(mpmDelta) >= 0.2) {
      changes.push(`speed ${mpmDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(mpmDelta)} MPM`);
    }
    if (Math.abs(timeDelta) >= 1) {
      changes.push(`time per set ${timeDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(timeDelta)} mins`);
    }

    if (changes.length > 0) {
      text += `your ${changes.join(', ')}.`;
      if (accDelta < -5 || mpmDelta < -0.2 || timeDelta > 3) {
        text += ' Fatigue drop-off detected. Consider taking a short break before this set.';
      } else {
        text += ' Consistent focus maintained.';
      }
    } else {
      text += 'your accuracy, speed, and time taken remained highly stable. Excellent consistency!';
    }

    return text;
  }, [chartData]);

  const hasData = chartData.some((d) => d.count > 0);

  return (
    <div className="card fatigue-tracker">
      <h3>⏳ Cumulative fatigue analysis ({dateToUse})</h3>
      <p className="insight">
        Analyzes how your accuracy, speed (MPM), and time taken change chronologically across multiple sets on this day.
      </p>

      {!hasData ? (
        <p className="empty">Practice more across multiple sessions on this day to see your fatigue analysis.</p>
      ) : (
        <>
          <p className="fatigue-insight" style={{ marginBottom: 20, color: 'var(--amber)', fontSize: 13, fontWeight: 500 }}>
            💡 {insight}
          </p>

          <div className="fatigue-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {/* Accuracy Chart */}
            <div className="fatigue-chart-wrap">
              <h4 style={{ marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)' }}>Accuracy drop-off</h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 5, right: 12, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} tickFormatter={(v) => v.split(' ')[0]} />
                  <YAxis stroke="var(--text-secondary)" fontSize={10} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Accuracy']} />
                  <Bar dataKey="accuracy" fill="#BD4856" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Speed Chart */}
            <div className="fatigue-chart-wrap">
              <h4 style={{ marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)' }}>Speed (MPM) drop-off</h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 5, right: 12, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} tickFormatter={(v) => v.split(' ')[0]} />
                  <YAxis stroke="var(--text-secondary)" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'MPM']} />
                  <Bar dataKey="mpm" fill="#4A75C7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Time Taken Chart */}
            <div className="fatigue-chart-wrap">
              <h4 style={{ marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)' }}>Time Taken (mins)</h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 5, right: 12, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} tickFormatter={(v) => v.split(' ')[0]} />
                  <YAxis stroke="var(--text-secondary)" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}m`, 'Time Taken']} />
                  <Bar dataKey="timeTaken" fill="#DFA83F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 11,
};
