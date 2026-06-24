import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { MOCK_SOURCES, SECTIONS } from '../constants';
import { addMockTest, deleteMockTest, toggleMockFlag } from '../hooks/useMockTests';
import { formatPretty, formatShort, todayStr } from '../utils/dates';
import EditMockModal from './EditMockModal';

const SECTION_KEYS = ['VARC', 'LRDI', 'QA'];

function blankSections() {
  return Object.fromEntries(SECTION_KEYS.map((k) => [k, { attempted: '', correct: '', timeTaken: '' }]));
}

export default function MockTests({ mocks, readOnly = false }) {
  const [sourceFilter, setSourceFilter] = useState('All');
  const filtered = sourceFilter === 'All' ? mocks : mocks.filter((m) => m.source === sourceFilter);
  const chartData = useMemo(
    () => [...filtered].sort((a, b) => a.date.localeCompare(b.date)).map((m) => ({
      day: formatShort(m.date),
      percentile: m.overallPercentile,
      score: m.overallScore,
      label: m.label || m.source,
    })),
    [filtered]
  );

  return (
    <div>
      {!readOnly && <MockForm />}

      <div className="card">
        <div className="card__head">
          <h3>Percentile & score over time</h3>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="All">All sources</option>
            {MOCK_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {chartData.length === 0 ? (
          <p className="empty">No mocks logged yet.</p>
        ) : (
          <>
            <div className="chart-block">
              <p className="chart-block__title">Percentile</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={12} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="percentile" stroke="#E8A33D" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-block">
              <p className="chart-block__title">Overall score</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={12} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="#5B8DEF" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      <MockTable mocks={filtered} readOnly={readOnly} />
    </div>
  );
}

function MockForm() {
  const [date, setDate] = useState(todayStr());
  const [source, setSource] = useState(MOCK_SOURCES[0]);
  const [label, setLabel] = useState('');
  const [overallScore, setOverallScore] = useState('');
  const [overallPercentile, setOverallPercentile] = useState('');
  const [notes, setNotes] = useState('');
  const [sections, setSections] = useState(blankSections());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  function updateSection(key, patch) {
    setSections((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await addMockTest({ date, source, label, overallScore, overallPercentile, notes, sections });
      setStatus({ type: 'success', msg: 'Mock saved.' });
      setLabel(''); setOverallScore(''); setOverallPercentile(''); setNotes(''); setSections(blankSections());
    } catch (e2) {
      setStatus({ type: 'error', msg: e2.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Log a mock test</h3>
      <div className="row-card__grid">
        <label>Date<input type="date" max={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label>Source<select value={source} onChange={(e) => setSource(e.target.value)}>{MOCK_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label>Label <span className="optional">(optional)</span><input value={label} placeholder="SimCAT 7" onChange={(e) => setLabel(e.target.value)} /></label>
        <label>Overall percentile<input type="number" min="0" max="100" step="0.01" value={overallPercentile} onChange={(e) => setOverallPercentile(e.target.value)} required /></label>
        <label>Overall score<input type="number" step="0.01" value={overallScore} onChange={(e) => setOverallScore(e.target.value)} required /></label>
      </div>

      <div className="mock-sections">
        {SECTION_KEYS.map((key) => {
          const cfg = SECTIONS[key];
          const s = sections[key];
          return (
            <div key={key} className="mock-section" style={{ borderColor: cfg.color }}>
              <h4 style={{ color: cfg.color }}>{cfg.label}</h4>
              <label>Attempted<input type="number" min="0" value={s.attempted} onChange={(e) => updateSection(key, { attempted: e.target.value })} required /></label>
              <label>Correct<input type="number" min="0" value={s.correct} onChange={(e) => updateSection(key, { correct: e.target.value })} required /></label>
              <label>Time (min)<input type="number" min="0" step="0.5" value={s.timeTaken} onChange={(e) => updateSection(key, { timeTaken: e.target.value })} required /></label>
            </div>
          );
        })}
      </div>

      <label className="aeon-summary">
        Notes <span className="optional">(optional)</span>
        <textarea rows={2} value={notes} placeholder="What worked, what didn't, what to fix next mock" onChange={(e) => setNotes(e.target.value)} />
      </label>

      <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save mock'}</button>
      {status && <div className={`status status--${status.type}`}>{status.msg}</div>}
    </form>
  );
}

function MockTable({ mocks, readOnly }) {
  const [editing, setEditing] = useState(null);
  return (
    <div className="card">
      <h3>All mocks</h3>
      {mocks.length === 0 ? (
        <p className="empty">No mocks logged yet.</p>
      ) : (
        <div className="mock-table-wrap">
          <table className="day-table">
            <thead>
              <tr>
                <th></th><th>Date</th><th>Source</th><th>Label</th><th>Score</th><th>%ile</th>
                <th>VARC acc</th><th>LRDI acc</th><th>QA acc</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mocks.map((m) => (
                <tr key={m.id} className={m.flagged ? 'row--flagged' : ''}>
                  <td>
                    <button className={`star-btn ${m.flagged ? 'star-btn--active' : ''}`} onClick={() => toggleMockFlag(m)} aria-label="Flag for discussion">★</button>
                  </td>
                  <td>{formatPretty(m.date)}</td>
                  <td>{m.source}</td>
                  <td>{m.label || '—'}</td>
                  <td>{m.overallScore}</td>
                  <td>{m.overallPercentile}</td>
                  <td>{m.sections?.VARC?.accuracy ?? '—'}%</td>
                  <td>{m.sections?.LRDI?.accuracy ?? '—'}%</td>
                  <td>{m.sections?.QA?.accuracy ?? '—'}%</td>
                  <td>
                    {!readOnly && (
                      <>
                        <button className="icon-btn" onClick={() => setEditing(m)} aria-label="Edit">✎</button>
                        <button className="icon-btn" onClick={() => deleteMockTest(m.id)} aria-label="Delete">🗑</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <EditMockModal mock={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
