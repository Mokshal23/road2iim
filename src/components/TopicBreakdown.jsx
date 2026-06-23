import { SECTION_LIST } from '../constants';
import { aggregate } from '../utils/calc';

export default function TopicBreakdown({ entries }) {
  return (
    <div className="card">
      <h3>Topic-wise breakdown (this week)</h3>
      {entries.length === 0 ? (
        <p className="empty">No sessions logged this week yet.</p>
      ) : (
        <div className="topic-grid">
          {SECTION_LIST.map((s) => {
            const sectionEntries = entries.filter((e) => e.section === s.key);
            if (sectionEntries.length === 0) return null;
            const topics = [...new Set(sectionEntries.map((e) => e.topic))];
            const rows = topics
              .map((t) => ({ topic: t, agg: aggregate(sectionEntries.filter((e) => e.topic === t)) }))
              .sort((a, b) => a.agg.accuracy - b.agg.accuracy);

            return (
              <div key={s.key} className="topic-col">
                <h4 style={{ color: s.color }}>{s.label}</h4>
                <table className="topic-table">
                  <thead>
                    <tr><th>Topic</th><th>Acc.</th><th>Mpm</th><th>Qs</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.topic} className={r.agg.accuracy < 50 ? 'row--weak' : ''}>
                        <td>{r.topic}</td>
                        <td>{r.agg.accuracy}%</td>
                        <td>{r.agg.marksPerMinute}</td>
                        <td>{r.agg.attempted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
