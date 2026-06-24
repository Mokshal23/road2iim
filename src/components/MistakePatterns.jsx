import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import { MISTAKE_TAGS, SECTIONS } from '../constants';
import { weekRange, formatShort } from '../utils/dates';

const TREND_COLORS = ['#E0566B', '#E8A33D', '#5B8DEF', '#2BB3A3'];

export default function MistakePatterns({ weekEntries, allEntries, sectionKey }) {
  const [view, setView] = useState('week');

  const sectionWeek = weekEntries.filter((e) => e.section === sectionKey);
  const sectionAll = allEntries.filter((e) => e.section === sectionKey);

  return (
    <div className="card">
      <div className="card__head">
        <h3>Mistake patterns</h3>
        <div className="seg">
          <button className={`seg__btn ${view === 'week' ? 'seg__btn--active-neutral' : ''}`} onClick={() => setView('week')}>This week</button>
          <button className={`seg__btn ${view === 'trend' ? 'seg__btn--active-neutral' : ''}`} onClick={() => setView('trend')}>All-time trend</button>
        </div>
      </div>
      {view === 'week' ? <ThisWeekView entries={sectionWeek} sectionKey={sectionKey} /> : <TrendView entries={sectionAll} sectionKey={sectionKey} />}
    </div>
  );
}

function ThisWeekView({ entries, sectionKey }) {
  const sectionLabel = SECTIONS[sectionKey]?.label || sectionKey;
  const counts = MISTAKE_TAGS.map((tag) => ({
    tag,
    count: entries.reduce((acc, e) => acc + ((e.mistakeTags || []).includes(tag) ? 1 : 0), 0),
  })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count);

  const top = counts[0];

  if (counts.length === 0) return <p className="empty">No mistake tags logged this week yet.</p>;

  return (
    <>
      <p className="insight">
        <strong>{top.tag}</strong> is your most frequent {sectionLabel} issue this week — {top.count}× across sessions.
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
  );
}

function TrendView({ entries, sectionKey }) {
  const sectionLabel = SECTIONS[sectionKey]?.label || sectionKey;
  const { data, topTags } = useMemo(() => buildWeeklyTrend(entries), [entries]);

  if (data.length === 0) return <p className="empty">Not enough history yet — keep logging and this will fill in.</p>;

  return (
    <>
      <p className="insight">Weekly count of your top {topTags.length} recurring {sectionLabel} mistake tags, across your full history.</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="week" stroke="var(--text-secondary)" fontSize={11} />
          <YAxis allowDecimals={false} stroke="var(--text-secondary)" fontSize={12} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {topTags.map((tag, i) => (
            <Line key={tag} type="monotone" dataKey={tag} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

function buildWeeklyTrend(entries) {
  if (entries.length === 0) return { data: [], topTags: [] };

  const totals = MISTAKE_TAGS.map((tag) => ({
    tag, count: entries.reduce((acc, e) => acc + ((e.mistakeTags || []).includes(tag) ? 1 : 0), 0),
  })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count);
  const topTags = totals.slice(0, 4).map((t) => t.tag);
  if (topTags.length === 0) return { data: [], topTags: [] };

  const byWeekStart = {};
  for (const e of entries) {
    const { start } = weekRange(e.date);
    if (!byWeekStart[start]) byWeekStart[start] = {};
    for (const tag of e.mistakeTags || []) {
      if (!topTags.includes(tag)) continue;
      byWeekStart[start][tag] = (byWeekStart[start][tag] || 0) + 1;
    }
  }

  const weeks = Object.keys(byWeekStart).sort();
  const data = weeks.map((start) => ({
    week: formatShort(start),
    ...Object.fromEntries(topTags.map((tag) => [tag, byWeekStart[start][tag] || 0])),
  }));

  return { data, topTags };
}
