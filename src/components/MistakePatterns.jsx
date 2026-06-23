import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MISTAKE_TAGS } from '../constants';

export default function MistakePatterns({ entries }) {
  const counts = MISTAKE_TAGS.map((tag) => ({
    tag,
    count: entries.reduce((acc, e) => acc + ((e.mistakeTags || []).includes(tag) ? 1 : 0), 0),
  })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count);

  const top = counts[0];

  return (
    <div className="card">
      <h3>Mistake patterns (this week)</h3>
      {counts.length === 0 ? (
        <p className="empty">No mistake tags logged this week yet.</p>
      ) : (
        <>
          <p className="insight">
            <strong>{top.tag}</strong> is your most frequent issue this week — {top.count}× across all sections.
          </p>
          <ResponsiveContainer width="100%" height={Math.max(160, counts.length * 34)}>
            <BarChart data={counts} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke="var(--text-secondary)" fontSize={12} />
              <YAxis type="category" dataKey="tag" width={140} stroke="var(--text-secondary)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {counts.map((d, i) => (
                  <Cell key={d.tag} fill={i === 0 ? '#E0566B' : '#5B8DEF'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
