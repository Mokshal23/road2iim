import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SECTION_LIST } from '../constants';
import { todayStr } from '../utils/dates';

export default function SectionBalance({ entries, aeonArticles = [] }) {
  const [range, setRange] = useState('day'); // 'day' or 'week'

  const today = todayStr();

  // Filter based on selected range
  const filteredEntries = range === 'day'
    ? entries.filter((e) => e.date === today)
    : entries;

  const filteredArticles = range === 'day'
    ? (aeonArticles || []).filter((a) => a.date === today)
    : aeonArticles;

  const data = SECTION_LIST.map((s) => {
    let value = filteredEntries.filter((e) => e.section === s.key).reduce((acc, e) => acc + (Number(e.timeTaken) || 0), 0);
    if (s.key === 'VARC') {
      value += (filteredArticles || []).reduce((acc, a) => acc + (Number(a.timeTaken) || 0), 0);
    }
    return { name: s.key === 'VARC' ? 'VARC (incl. reading)' : s.label, value, color: s.color };
  });

  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <h3 style={{ margin: 0 }}>Section balance</h3>
        <div className="seg" style={{ display: 'flex', background: 'var(--surface-raised)', borderRadius: '6px', padding: '2px' }}>
          <button
            type="button"
            className={`seg__btn ${range === 'day' ? 'seg__btn--active-neutral' : ''}`}
            onClick={() => setRange('day')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11.5px',
              border: 'none',
              background: range === 'day' ? 'var(--surface)' : 'transparent',
              color: 'var(--text)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Today
          </button>
          <button
            type="button"
            className={`seg__btn ${range === 'week' ? 'seg__btn--active-neutral' : ''}`}
            onClick={() => setRange('week')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11.5px',
              border: 'none',
              background: range === 'week' ? 'var(--surface)' : 'transparent',
              color: 'var(--text)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            This Week
          </button>
        </div>
      </div>

      {total === 0 ? (
        <p className="empty">
          {range === 'day' ? 'No sessions logged today yet.' : 'No sessions logged this week yet.'}
        </p>
      ) : (
        <div className="donut-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v} min (${total ? Math.round((v / total) * 100) : 0}%)`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <p className="donut-total">{Math.round(total)} min total</p>
        </div>
      )}
    </div>
  );
}
