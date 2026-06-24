import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { formatShort } from '../utils/dates';

export default function ReadingSpeedTrend({ articles }) {
  const data = useMemo(() => {
    return articles
      .filter((a) => a.wordCount > 0 && a.timeTaken > 0)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((a) => ({ day: formatShort(a.date), wpm: a.readingSpeed, title: a.title }));
  }, [articles]);

  return (
    <div className="card">
      <h3>Reading speed trend</h3>
      <p className="insight">Words per minute across your Aeon articles — higher is better.</p>

      {data.length < 2 ? (
        <p className="empty">Log a few more articles with word count and reading time to see your speed trend.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={12} />
            <YAxis stroke="var(--text-secondary)" fontSize={12} />
            <Tooltip content={<SpeedTooltip />} />
            <Line
              type="monotone"
              dataKey="wpm"
              name="WPM"
              stroke="#E8A33D"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function SpeedTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { title, wpm } = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      <p style={{ margin: 0 }}>{wpm} wpm</p>
    </div>
  );
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
};
