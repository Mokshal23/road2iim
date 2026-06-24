import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SECTION_LIST } from '../constants';

export default function SectionBalance({ entries, aeonArticles = [] }) {
  const data = SECTION_LIST.map((s) => {
    let value = entries.filter((e) => e.section === s.key).reduce((acc, e) => acc + (Number(e.timeTaken) || 0), 0);
    if (s.key === 'VARC') {
      value += (aeonArticles || []).reduce((acc, a) => acc + (Number(a.timeTaken) || 0), 0);
    }
    return { name: s.key === 'VARC' ? 'VARC (incl. reading)' : s.label, value, color: s.color };
  });
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div className="card">
      <h3>Section balance (this week)</h3>
      {total === 0 ? (
        <p className="empty">No sessions logged this week yet.</p>
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
