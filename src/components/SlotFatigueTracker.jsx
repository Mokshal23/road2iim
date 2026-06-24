import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { aggregate } from '../utils/calc';

// Buckets mapping
const BUCKETS = [
  { key: 'fresh', label: '0-30m Fresh', min: 0, max: 30 },
  { key: 'focused', label: '30-50m Focused', min: 30, max: 50 },
  { key: 'fatigued', label: '50-90m Fatigued', min: 50, max: 90 },
  { key: 'exhausted', label: '90m+ Exhausted', min: 90, max: Infinity },
];

export default function SlotFatigueTracker({ entries = [], sectionKey }) {
  const sectionEntries = useMemo(() => entries.filter((e) => e.section === sectionKey), [entries, sectionKey]);

  const chartData = useMemo(() => {
    // Group entries by date
    const byDate = {};
    for (const e of sectionEntries) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    }

    // Classify entries into buckets
    const bucketEntries = { fresh: [], focused: [], fatigued: [], exhausted: [] };

    for (const date of Object.keys(byDate)) {
      const dateList = byDate[date];

      // Sort chronologically using createdAt or sessionSeq
      const sorted = [...dateList].sort((a, b) => {
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

      // Track cumulative time today before this entry
      let cumulativeTime = 0;
      for (const e of sorted) {
        // Find which bucket this cumulative time belongs to
        const bucket = BUCKETS.find((b) => cumulativeTime >= b.min && cumulativeTime < b.max);
        if (bucket) {
          bucketEntries[bucket.key].push(e);
        }
        cumulativeTime += Number(e.timeTaken) || 0;
      }
    }

    // Aggregate stats per bucket
    return BUCKETS.map((b) => {
      const list = bucketEntries[b.key];
      const agg = aggregate(list);
      return {
        name: b.label,
        count: list.length,
        accuracy: list.length ? agg.accuracy : 0,
        mpm: list.length ? agg.marksPerMinute : 0,
      };
    });
  }, [sectionEntries]);

  // Generate insight text based on trends
  const insight = useMemo(() => {
    const fresh = chartData[0];
    const fatigued = chartData[2];
    const exhausted = chartData[3];

    let accuracyDrop = 0;
    let speedDrop = 0;

    const baseAcc = fresh.count ? fresh.accuracy : null;
    const baseMpm = fresh.count ? fresh.mpm : null;

    const compAcc = exhausted.count ? exhausted.accuracy : (fatigued.count ? fatigued.accuracy : null);
    const compMpm = exhausted.count ? exhausted.mpm : (fatigued.count ? fatigued.mpm : null);
    const compLabel = exhausted.count ? '90m+' : '50-90m';

    if (baseAcc !== null && compAcc !== null) accuracyDrop = Math.round(baseAcc - compAcc);
    if (baseMpm !== null && compMpm !== null) speedDrop = Math.round((baseMpm - compMpm) * 100) / 100;

    if (accuracyDrop > 5 && speedDrop > 0.2) {
      return `Your accuracy drops by ${accuracyDrop}% and your speed drops by ${speedDrop} MPM in the ${compLabel} range. Consider taking a break at the 50-minute mark.`;
    } else if (accuracyDrop > 5) {
      return `Your accuracy drops by ${accuracyDrop}% as your practice session goes longer. You are maintaining speed but making more careless errors.`;
    } else if (speedDrop > 0.2) {
      return `Your speed drops by ${speedDrop} MPM as fatigue sets in. You are taking longer per question but maintaining accuracy.`;
    }

    return 'Your speed and accuracy remain relatively stable across long study sessions. Keep it up!';
  }, [chartData]);

  const hasData = chartData.some((d) => d.count > 0);

  return (
    <div className="card fatigue-tracker">
      <h3>⏳ Cumulative fatigue analysis</h3>
      <p className="insight">Analyzes how your speed and accuracy change as you spend more time on this section in a day.</p>

      {!hasData ? (
        <p className="empty">Practice more across multiple sessions today to see your fatigue analysis.</p>
      ) : (
        <>
          <p className="fatigue-insight" style={{ marginBottom: 20, color: 'var(--amber)', fontSize: 13, fontWeight: 500 }}>
            💡 {insight}
          </p>

          <div className="fatigue-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
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
