import { useMemo, useState } from 'react';
import { computeStreaks, buildHeatmapGrid, levelFor } from '../utils/streak';
import { formatPretty } from '../utils/dates';
import Modal from './Modal';

const LEVEL_COLORS = ['#24262d', '#3d3520', '#5e4a1f', '#a07a23', '#e8a33d'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function StreakHeatmap({ activeDates, entries = [], aeonArticles = [], mocks = [] }) {
  const [hovered, setHovered] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const { current, longest, countsByDate } = useMemo(() => computeStreaks(activeDates), [activeDates]);
  const grid = useMemo(() => buildHeatmapGrid(countsByDate, 18), [countsByDate]);

  return (
    <div className="card">
      <div className="card__head">
        <h3>Study streak</h3>
        <div className="streak-badges">
          <span className="streak-badge">🔥 {current} day{current === 1 ? '' : 's'} current</span>
          <span className="streak-badge streak-badge--ghost">🏆 {longest} day{longest === 1 ? '' : 's'} best</span>
        </div>
      </div>

      <div className="heatmap" onMouseLeave={() => setHovered(null)}>
        <div className="heatmap__months">
          {grid.map((week, wi) => {
            const firstDay = new Date(week[0].date + 'T00:00:00');
            const showLabel = firstDay.getDate() <= 7;
            return (
              <span key={wi} className="heatmap__month-label">
                {showLabel ? MONTH_LABELS[firstDay.getMonth()] : ''}
              </span>
            );
          })}
        </div>
        <div className="heatmap__weeks">
          {grid.map((week, wi) => (
            <div className="heatmap__week" key={wi}>
              {week.map((cell) => (
                <div
                  key={cell.date}
                  className="heatmap__cell"
                  style={{ background: cell.isFuture ? 'transparent' : LEVEL_COLORS[levelFor(cell.count)] }}
                  onMouseEnter={() => !cell.isFuture && setHovered(cell)}
                  onClick={() => !cell.isFuture && setSelectedDate(cell.date)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap__footer">
        <span>{hovered ? `${hovered.count} session${hovered.count === 1 ? '' : 's'} on ${formatPretty(hovered.date)}` : 'Click a square to view that day\'s activities'}</span>
        <span className="heatmap__legend">
          Less {LEVEL_COLORS.map((c, i) => <i key={i} style={{ background: c }} />)} More
        </span>
      </div>

      {selectedDate && (
        <DayDetailsModal 
          date={selectedDate} 
          entries={entries} 
          aeonArticles={aeonArticles} 
          mocks={mocks} 
          onClose={() => setSelectedDate(null)} 
        />
      )}
    </div>
  );
}

function DayDetailsModal({ date, entries, aeonArticles, mocks, onClose }) {
  const dayEntries = useMemo(() => entries.filter((e) => e.date === date), [entries, date]);
  const dayArticles = useMemo(() => aeonArticles.filter((a) => a.date === date), [aeonArticles, date]);
  const dayMocks = useMemo(() => mocks.filter((m) => m.date === date), [mocks, date]);

  const hasActivity = dayEntries.length > 0 || dayArticles.length > 0 || dayMocks.length > 0;

  return (
    <Modal title={`Activity Details — ${formatPretty(date)}`} onClose={onClose}>
      <div className="day-details-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '5px' }}>
        {!hasActivity ? (
          <p className="empty" style={{ margin: '20px 0', textAlign: 'center' }}>No study activity logged on this date.</p>
        ) : (
          <>
            {dayMocks.length > 0 && (
              <div className="detail-section">
                <h4 style={{ color: 'var(--amber)', margin: '0 0 12px 0', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '14px', fontWeight: 600 }}>
                  🏆 Mock Tests ({dayMocks.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dayMocks.map((m) => (
                    <div key={m.id} className="card" style={{ background: 'var(--surface-raised)', padding: '15px', margin: 0, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '13px' }}>{m.label || m.source}</strong>
                        <span style={{ color: 'var(--amber)', fontWeight: '700', fontSize: '13px' }}>{m.overallPercentile}%ile ({m.overallScore} marks)</span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px', background: 'var(--surface)', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                        {['VARC', 'LRDI', 'QA'].map(sec => {
                          const s = m.sections?.[sec] || {};
                          return (
                            <div key={sec}>
                              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{sec}:</span> {s.correct || 0}/{s.attempted || 0} ({s.accuracy || 0}%)
                            </div>
                          );
                        })}
                      </div>

                      {m.notes && <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}><strong>Notes:</strong> {m.notes}</p>}
                      
                      {m.goodTags?.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                          {m.goodTags.map(t => <span key={t} className="tag tag--good" style={{ padding: '4px 10px', fontSize: '10px', borderRadius: '999px' }}>{t}</span>)}
                        </div>
                      )}
                      {m.mistakeTags?.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {m.mistakeTags.map(t => <span key={t} className="tag" style={{ padding: '4px 10px', fontSize: '10px', borderRadius: '999px' }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dayEntries.length > 0 && (
              <div className="detail-section">
                <h4 style={{ color: 'var(--blue)', margin: '0 0 12px 0', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '14px', fontWeight: 600 }}>
                  📝 Practice Sessions ({dayEntries.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dayEntries.map((e) => (
                    <div key={e.id} className="card" style={{ background: 'var(--surface-raised)', padding: '15px', margin: 0, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{e.subsection}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px' }}>{e.topic}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: e.accuracy >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                          {e.correct}/{e.attempted} ({e.accuracy}%)
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '15px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <span>⏱️ {e.timeTaken} mins</span>
                        <span>📚 Source: {e.source}</span>
                        {e.label && <span>🏷️ {e.label}</span>}
                      </div>

                      {e.notes && <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}><strong>Notes:</strong> {e.notes}</p>}
                      
                      {e.goodTags?.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                          {e.goodTags.map(t => <span key={t} className="tag tag--good" style={{ padding: '4px 10px', fontSize: '10px', borderRadius: '999px' }}>{t}</span>)}
                        </div>
                      )}
                      {e.mistakeTags?.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {e.mistakeTags.map(t => <span key={t} className="tag" style={{ padding: '4px 10px', fontSize: '10px', borderRadius: '999px' }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dayArticles.length > 0 && (
              <div className="detail-section">
                <h4 style={{ color: 'var(--teal)', margin: '0 0 12px 0', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '14px', fontWeight: 600 }}>
                  📖 Aeon Articles ({dayArticles.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dayArticles.map((a) => (
                    <div key={a.id} className="card" style={{ background: 'var(--surface-raised)', padding: '15px', margin: 0, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '13px' }}>{a.title}</strong>
                        <span style={{ fontSize: '11px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>{a.topic}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '15px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {a.wordCount && a.timeTaken && (
                          <span>⚡ {Math.round(a.wordCount / a.timeTaken)} wpm ({a.wordCount} words / {a.timeTaken} mins)</span>
                        )}
                        <span>Difficulty: {a.difficulty}</span>
                      </div>

                      {a.summary && (
                        <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '6px', fontSize: '12px', fontStyle: 'italic', margin: '8px 0 0 0', borderLeft: '3px solid var(--teal)', lineHeight: '1.4' }}>
                          "{a.summary}"
                        </div>
                      )}

                      {a.vocab?.length > 0 && a.vocab[0].word && (
                        <div style={{ marginTop: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Vocab logged:</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {a.vocab.map(v => v.word && (
                              <span key={v.word} className="tag" style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'default' }} title={v.meaning}>
                                📖 <strong>{v.word}</strong>: {v.meaning}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
