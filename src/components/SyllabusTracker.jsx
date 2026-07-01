import { useMemo } from 'react';
import { SECTIONS, TOPIC_SUGGESTIONS, CAT_SYLLABUS_WEIGHTAGE } from '../constants';
import { aggregate } from '../utils/calc';

export default function SyllabusTracker({ entries = [], sectionKey }) {
  const section = SECTIONS[sectionKey];
  const subsections = section.subsections;

  const data = useMemo(() => {
    const trackerData = {};
    for (const sub of subsections) {
      const topics = TOPIC_SUGGESTIONS[sub] || [];
      trackerData[sub] = topics.map((topic) => {
        const topicEntries = entries.filter((e) => e.topic === topic);
        const agg = aggregate(topicEntries);
        const weight = CAT_SYLLABUS_WEIGHTAGE[sectionKey]?.[topic] || 'Medium';

        // Warnings for high weightage but low preparation
        let warning = null;
        if (weight === 'High') {
          if (topicEntries.length === 0) {
            warning = 'Not started';
          } else if (agg.attempted < 20) {
            warning = 'Low attempts';
          } else if (agg.attempted > 0 && agg.accuracy < 65) {
            warning = 'Low accuracy';
          }
        }

        return {
          topic,
          weight,
          attempts: agg.attempted,
          accuracy: agg.attempted > 0 ? agg.accuracy : null,
          warning,
        };
      });
    }
    return trackerData;
  }, [entries, sectionKey, subsections]);

  return (
    <div className="card syllabus-tracker">
      <h3>🎯 Syllabus tracker &amp; weightage</h3>
      <p className="insight">Prioritize high-weightage topics. Warning badges flag areas needing focus.</p>

      {subsections.map((sub) => {
        const list = data[sub] || [];
        return (
          <div key={sub} className="syllabus-tracker__section" style={{ marginBottom: 20 }}>
            {subsections.length > 1 && <h4 style={{ color: section.color, marginBottom: 8 }}>{sub}</h4>}
            <table className="day-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Weight</th>
                  <th>Attempts</th>
                  <th>Accuracy</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const weightCls = `weight-badge weight-badge--${row.weight.toLowerCase()}`;
                  return (
                    <tr key={row.topic}>
                      <td style={{ fontWeight: 500 }}>{row.topic}</td>
                      <td>
                        <span className={weightCls}>{row.weight}</span>
                      </td>
                      <td>{row.attempts || '0'} Qs</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {row.accuracy !== null ? `${row.accuracy}%` : '—'}
                      </td>
                      <td>
                        {row.warning ? (
                          <span className={`status-pill status-pill--${row.warning.replace(/\s+/g, '-').toLowerCase()}`}>
                            {row.warning}
                          </span>
                        ) : (
                          <span className="status-pill status-pill--ok">On Track</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
