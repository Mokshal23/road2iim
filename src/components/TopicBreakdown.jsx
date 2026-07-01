import { SECTIONS } from '../constants';
import { aggregate } from '../utils/calc';

export default function TopicBreakdown({ entries, sectionKey }) {
  const section = SECTIONS[sectionKey];
  const subsections = section.subsections;
  const sectionEntries = entries.filter((e) => e.section === sectionKey);

  return (
    <div className="card">
      <h3>Topic-wise breakdown (this week)</h3>
      {sectionEntries.length === 0 ? (
        <p className="empty">No sessions logged this week yet.</p>
      ) : (
        <div className="topic-grid">
          {subsections.map((sub) => {
            const subEntries = sectionEntries.filter((e) => e.subsection === sub);
            if (subEntries.length === 0) return null;
            const topics = [...new Set(subEntries.map((e) => e.topic))];
            const rows = topics
              .map((t) => ({ topic: t, agg: aggregate(subEntries.filter((e) => e.topic === t)) }))
              .sort((a, b) => a.agg.accuracy - b.agg.accuracy);

            return (
              <div key={sub} className="topic-col">
                {subsections.length > 1 && <h4 style={{ color: section.color }}>{sub}</h4>}
                <table className="topic-table">
                  <thead>
                    <tr><th>Topic</th><th>Acc.</th><th>Mpm</th><th>Qs</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.topic} className={r.agg.attempted > 0 && r.agg.accuracy < 50 ? 'row--weak' : ''}>
                        <td>{r.topic}</td>
                        <td>{r.agg.attempted > 0 ? `${r.agg.accuracy}%` : '—'}</td>
                        <td>{r.agg.attempted > 0 ? r.agg.marksPerMinute : '—'}</td>
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
