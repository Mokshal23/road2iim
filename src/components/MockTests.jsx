import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { MOCK_SOURCES, SECTIONS, POSITIVE_TAGS, MISTAKE_TAGS } from '../constants';
import { addMockTest, deleteMockTest, toggleMockFlag } from '../hooks/useMockTests';
import { formatPretty, formatShort, todayStr } from '../utils/dates';
import EditMockModal from './EditMockModal';
import AIScreenshotLog from './AIScreenshotLog';
import { useAppStore } from '../store/useAppStore';
import TagPicker from './TagPicker';

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

      <MockInsights mocks={mocks} />

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
  const [goodTags, setGoodTags] = useState([]);
  const [mistakeTags, setMistakeTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  function updateSection(key, patch) {
    setSections((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  }

  function handleAutofill(parsed) {
    if (parsed.type === 'mock') {
      if (parsed.source) {
        const match = MOCK_SOURCES.find((s) => s.toLowerCase() === parsed.source.toLowerCase());
        const resolvedSource = match || parsed.source;
        if (source === MOCK_SOURCES[0]) {
          setSource(resolvedSource);
        }
      }
      if (parsed.label && !label) setLabel(parsed.label);
      if (parsed.overallScore !== undefined && parsed.overallScore !== null) {
        setOverallScore((prev) => prev ? prev : String(parsed.overallScore));
      }
      if (parsed.overallPercentile !== undefined && parsed.overallPercentile !== null) {
        setOverallPercentile((prev) => prev ? prev : String(parsed.overallPercentile));
      }

      const newSections = { ...sections };
      if (parsed.sections) {
        SECTION_KEYS.forEach((key) => {
          if (parsed.sections[key]) {
            newSections[key] = {
              attempted: parsed.sections[key].attempted !== undefined && parsed.sections[key].attempted !== null
                ? (newSections[key].attempted ? newSections[key].attempted : String(parsed.sections[key].attempted))
                : newSections[key].attempted,
              correct: parsed.sections[key].correct !== undefined && parsed.sections[key].correct !== null
                ? (newSections[key].correct ? newSections[key].correct : String(parsed.sections[key].correct))
                : newSections[key].correct,
              timeTaken: parsed.sections[key].timeTaken !== undefined && parsed.sections[key].timeTaken !== null
                ? (newSections[key].timeTaken ? newSections[key].timeTaken : String(parsed.sections[key].timeTaken))
                : newSections[key].timeTaken,
            };
          }
        });
      }
      setSections(newSections);
      setStatus({ type: 'success', msg: 'Autofilled mock test details into active form! Please review.' });
    } else if (parsed.type === 'sectional') {
      const key = parsed.section;
      if (key && SECTION_KEYS.includes(key)) {
        const newSections = { ...sections };
        newSections[key] = {
          attempted: parsed.attempted !== undefined && parsed.attempted !== null
            ? (newSections[key].attempted ? newSections[key].attempted : String(parsed.attempted))
            : newSections[key].attempted,
          correct: parsed.correct !== undefined && parsed.correct !== null
            ? (newSections[key].correct ? newSections[key].correct : String(parsed.correct))
            : newSections[key].correct,
          timeTaken: parsed.timeTaken !== undefined && parsed.timeTaken !== null
            ? (newSections[key].timeTaken ? newSections[key].timeTaken : String(parsed.timeTaken))
            : newSections[key].timeTaken,
        };
        setSections(newSections);
        if (parsed.source && source === MOCK_SOURCES[0]) {
          const match = MOCK_SOURCES.find((s) => s.toLowerCase() === parsed.source.toLowerCase());
          setSource(match || parsed.source);
        }
        setStatus({ type: 'success', msg: `Autofilled ${key} sectional details into active form! Please review.` });
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await addMockTest({ date, source, label, overallScore, overallPercentile, notes, sections, goodTags, mistakeTags });
      useAppStore.getState().showToast('Mock test scorecard saved successfully!', 'success');
      setLabel(''); setOverallScore(''); setOverallPercentile(''); setNotes(''); setSections(blankSections());
      setGoodTags([]); setMistakeTags([]);
    } catch (e2) {
      setStatus({ type: 'error', msg: e2.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mock-form-container" style={{ marginBottom: '20px' }}>
      <AIScreenshotLog onAutofill={handleAutofill} />
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

      <div className="row-card__tags" style={{ marginTop: '15px' }}>
        <span className="row-card__tags-label">What went well <span className="optional">(optional, max 3)</span>:</span>
        <TagPicker value={goodTags} onChange={setGoodTags} options={POSITIVE_TAGS} good />
      </div>

      <div className="row-card__tags" style={{ marginTop: '10px' }}>
        <span className="row-card__tags-label">What went wrong <span className="optional">(optional, max 3)</span>:</span>
        <TagPicker value={mistakeTags} onChange={setMistakeTags} options={MISTAKE_TAGS} />
      </div>

      <label className="aeon-summary" style={{ marginTop: '15px' }}>
        Notes <span className="optional">(optional)</span>
        <textarea rows={2} value={notes} placeholder="What worked, what didn't, what to fix next mock" onChange={(e) => setNotes(e.target.value)} />
      </label>

      <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save mock'}</button>
      {status && <div className={`status status--${status.type}`}>{status.msg}</div>}
    </form>
    </div>
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
                        <button 
                          className="icon-btn" 
                          onClick={async () => { 
                            if (window.confirm('Delete this mock test scorecard?')) {
                              await deleteMockTest(m.id); 
                              useAppStore.getState().showToast('Mock scorecard deleted.', 'info');
                            }
                          }} 
                          aria-label="Delete"
                        >
                          🗑
                        </button>
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

function MockInsights({ mocks }) {
  const [threshold, setThreshold] = useState(85);

  const goodMocks = useMemo(() => mocks.filter((m) => m.overallPercentile >= threshold), [mocks, threshold]);
  const badMocks = useMemo(() => mocks.filter((m) => m.overallPercentile < threshold), [mocks, threshold]);

  const avgGoodPercentile = useMemo(() => {
    if (goodMocks.length === 0) return 0;
    const sum = goodMocks.reduce((acc, m) => acc + (m.overallPercentile || 0), 0);
    return Math.round((sum / goodMocks.length) * 10) / 10;
  }, [goodMocks]);

  const avgBadPercentile = useMemo(() => {
    if (badMocks.length === 0) return 0;
    const sum = badMocks.reduce((acc, m) => acc + (m.overallPercentile || 0), 0);
    return Math.round((sum / badMocks.length) * 10) / 10;
  }, [badMocks]);

  // Compute top positive tags for good mocks
  const goodTagsStats = useMemo(() => {
    if (goodMocks.length === 0) return [];
    const counts = {};
    goodMocks.forEach((m) => {
      (m.goodTags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: Math.round((count / goodMocks.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [goodMocks]);

  // Compute top mistake tags for bad mocks
  const badTagsStats = useMemo(() => {
    if (badMocks.length === 0) return [];
    const counts = {};
    badMocks.forEach((m) => {
      (m.mistakeTags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: Math.round((count / badMocks.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [badMocks]);

  // Compute tag-to-percentile correlation
  const tagCorrelationStats = useMemo(() => {
    if (mocks.length === 0) return { goodCorrelations: [], badCorrelations: [] };

    const goodTagSums = {};
    const goodTagCounts = {};
    const badTagSums = {};
    const badTagCounts = {};

    mocks.forEach((m) => {
      const percentile = m.overallPercentile || 0;
      (m.goodTags || []).forEach((t) => {
        goodTagSums[t] = (goodTagSums[t] || 0) + percentile;
        goodTagCounts[t] = (goodTagCounts[t] || 0) + 1;
      });
      (m.mistakeTags || []).forEach((t) => {
        badTagSums[t] = (badTagSums[t] || 0) + percentile;
        badTagCounts[t] = (badTagCounts[t] || 0) + 1;
      });
    });

    const goodCorrelations = Object.keys(goodTagCounts).map((tag) => ({
      tag,
      avgPercentile: Math.round((goodTagSums[tag] / goodTagCounts[tag]) * 10) / 10,
      count: goodTagCounts[tag],
    })).sort((a, b) => b.avgPercentile - a.avgPercentile).slice(0, 4);

    const badCorrelations = Object.keys(badTagCounts).map((tag) => ({
      tag,
      avgPercentile: Math.round((badTagSums[tag] / badTagCounts[tag]) * 10) / 10,
      count: badTagCounts[tag],
    })).sort((a, b) => a.avgPercentile - b.avgPercentile).slice(0, 4); // lowest average percentile first

    return { goodCorrelations, badCorrelations };
  }, [mocks]);

  // Automated correlations
  const automatedInsights = useMemo(() => {
    if (mocks.length < 3) return null;

    const mockStats = mocks.map(m => {
      const varc = m.sections?.VARC || { attempted: 0, correct: 0, marks: 0 };
      const lrdi = m.sections?.LRDI || { attempted: 0, correct: 0, marks: 0 };
      const qa = m.sections?.QA || { attempted: 0, correct: 0, marks: 0 };

      const totalAttempts = (Number(varc.attempted) || 0) + (Number(lrdi.attempted) || 0) + (Number(qa.attempted) || 0);
      const totalCorrect = (Number(varc.correct) || 0) + (Number(lrdi.correct) || 0) + (Number(qa.correct) || 0);
      const overallAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
      return {
        id: m.id,
        percentile: m.overallPercentile || 0,
        score: m.overallScore || 0,
        attempts: totalAttempts,
        accuracy: overallAccuracy,
        varcMarks: varc.marks || 0,
        lrdiMarks: lrdi.marks || 0,
        qaMarks: qa.marks || 0,
      };
    });

    // 1. Over-attempting analysis
    const sortedAttempts = [...mockStats].map(s => s.attempts).sort((a, b) => a - b);
    const medianAttempts = sortedAttempts[Math.floor(sortedAttempts.length / 2)];

    const highAttemptsGroup = mockStats.filter(s => s.attempts > medianAttempts);
    const lowAttemptsGroup = mockStats.filter(s => s.attempts <= medianAttempts);

    let overAttemptingInsight = null;
    if (highAttemptsGroup.length > 0 && lowAttemptsGroup.length > 0) {
      const avgAccHigh = Math.round(highAttemptsGroup.reduce((acc, s) => acc + s.accuracy, 0) / highAttemptsGroup.length);
      const avgAccLow = Math.round(lowAttemptsGroup.reduce((acc, s) => acc + s.accuracy, 0) / lowAttemptsGroup.length);
      const avgPctHigh = Math.round(highAttemptsGroup.reduce((acc, s) => acc + s.percentile, 0) / highAttemptsGroup.length);
      const avgPctLow = Math.round(lowAttemptsGroup.reduce((acc, s) => acc + s.percentile, 0) / lowAttemptsGroup.length);

      if (avgAccHigh < avgAccLow - 3 && avgPctHigh < avgPctLow) {
        overAttemptingInsight = {
          type: 'warning',
          title: '⚠️ Over-attempting Risk',
          text: `When attempting more than ${medianAttempts} questions, your accuracy drops from ${avgAccLow}% to ${avgAccHigh}%, and your average percentile is lower (${avgPctHigh}% vs ${avgPctLow}%). Focus on accuracy over speed!`,
        };
      } else if (avgPctHigh > avgPctLow) {
        overAttemptingInsight = {
          type: 'tip',
          title: '📈 Attempt Volume Impact',
          text: `When you attempt more than ${medianAttempts} questions, your average overall percentile rises to ${avgPctHigh}% (vs ${avgPctLow}% when attempting fewer questions). Keep pushing your speed!`,
        };
      }
    }

    // 2. Accuracy Penalty analysis
    const highAccGroup = mockStats.filter(s => s.accuracy >= 75);
    const lowAccGroup = mockStats.filter(s => s.accuracy < 75);
    let accuracyInsight = null;
    if (highAccGroup.length > 0 && lowAccGroup.length > 0) {
      const avgPctHigh = Math.round(highAccGroup.reduce((acc, s) => acc + s.percentile, 0) / highAccGroup.length);
      const avgPctLow = Math.round(lowAccGroup.reduce((acc, s) => acc + s.percentile, 0) / lowAccGroup.length);

      if (avgPctHigh > avgPctLow) {
        accuracyInsight = {
          type: 'danger',
          title: '📉 Accuracy Penalty',
          text: `When overall accuracy drops below 75%, your average overall percentile falls to ${avgPctLow}% (compared to ${avgPctHigh}% when you stay above 75% accuracy).`,
        };
      }
    }

    // 3. Make-or-Break Section
    const sectionsData = ['VARC', 'LRDI', 'QA'].map(sec => {
      const key = sec === 'VARC' ? 'varcMarks' : sec === 'LRDI' ? 'lrdiMarks' : 'qaMarks';
      const sortedSecMarks = [...mockStats].map(s => s[key]).sort((a, b) => a - b);
      const medianSec = sortedSecMarks[Math.floor(sortedSecMarks.length / 2)];

      const topHalf = mockStats.filter(s => s[key] >= medianSec);
      const bottomHalf = mockStats.filter(s => s[key] < medianSec);

      if (topHalf.length > 0 && bottomHalf.length > 0) {
        const avgPctTop = topHalf.reduce((acc, s) => acc + s.percentile, 0) / topHalf.length;
        const avgPctBottom = bottomHalf.reduce((acc, s) => acc + s.percentile, 0) / bottomHalf.length;
        return {
          section: sec,
          gap: avgPctTop - avgPctBottom,
          avgPctTop: Math.round(avgPctTop),
          avgPctBottom: Math.round(avgPctBottom),
        };
      }
      return { section: sec, gap: 0, avgPctTop: 0, avgPctBottom: 0 };
    });

    sectionsData.sort((a, b) => b.gap - a.gap);
    const bestSec = sectionsData[0];
    let sectionalInsight = null;
    if (bestSec && bestSec.gap > 5) {
      const sectionLabel = bestSec.section === 'LRDI' ? 'DILR/LRDI' : bestSec.section;
      sectionalInsight = {
        type: 'info',
        title: `🎯 ${sectionLabel} is your Make-or-Break Section`,
        text: `Underperforming in ${sectionLabel} drops your average overall percentile from ${bestSec.avgPctTop}% to ${bestSec.avgPctBottom}%. Focus on strengthening this section to stabilize your scores.`,
      };
    }

    return { overAttemptingInsight, accuracyInsight, sectionalInsight };
  }, [mocks]);

  if (mocks.length === 0) {
    return (
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Mock Test Insights</h3>
        <p className="empty">Insights will generate automatically once you log mock tests with behavior tags.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card__head" style={{ marginBottom: '15px' }}>
        <h3>Mock Test Insights</h3>
        <div className="threshold-selector" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Target threshold:</span>
          <input 
            type="range" 
            min="50" 
            max="99" 
            value={threshold} 
            onChange={(e) => setThreshold(Number(e.target.value))} 
            className="slider"
            style={{ width: '100px', cursor: 'pointer' }}
          />
          <strong className="threshold-val" style={{ color: 'var(--amber)', fontSize: '14px' }}>{threshold}%ile</strong>
        </div>
      </div>

      {automatedInsights && (
        <div className="automated-insights-banners" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {automatedInsights.overAttemptingInsight && (
            <div className={`insight-banner banner--${automatedInsights.overAttemptingInsight.type}`} style={{ padding: '12px 15px', borderRadius: '8px', borderLeft: '4px solid', background: 'var(--surface-raised)' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600 }}>{automatedInsights.overAttemptingInsight.title}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{automatedInsights.overAttemptingInsight.text}</p>
            </div>
          )}
          {automatedInsights.accuracyInsight && (
            <div className="insight-banner banner--danger" style={{ padding: '12px 15px', borderRadius: '8px', borderLeft: '4px solid #E0566B', background: 'var(--surface-raised)' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: '#E0566B' }}>{automatedInsights.accuracyInsight.title}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{automatedInsights.accuracyInsight.text}</p>
            </div>
          )}
          {automatedInsights.sectionalInsight && (
            <div className="insight-banner banner--info" style={{ padding: '12px 15px', borderRadius: '8px', borderLeft: '4px solid #5B8DEF', background: 'var(--surface-raised)' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: '#5B8DEF' }}>{automatedInsights.sectionalInsight.title}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{automatedInsights.sectionalInsight.text}</p>
            </div>
          )}
        </div>
      )}

      <div className="insights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="insight-column">
          <h4 className="insight-column__header good-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px', fontSize: '13px', color: 'var(--text)' }}>
            Success Factors (High Performance)
            <span className="sub" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>When scoring &ge; {threshold}%ile (Avg {avgGoodPercentile}%ile, {goodMocks.length} mock{goodMocks.length === 1 ? '' : 's'})</span>
          </h4>
          {goodMocks.length === 0 ? (
            <p className="empty-sub" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No mocks met or exceeded {threshold}%ile target yet.</p>
          ) : goodTagsStats.length === 0 ? (
            <p className="empty-sub" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No positive tags logged for these mocks. Tag your mocks to view insights.</p>
          ) : (
            <div className="tags-progress-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {goodTagsStats.map((item) => (
                <div key={item.tag} className="tag-progress-item">
                  <div className="tag-info" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span className="tag-name" style={{ fontWeight: 500 }}>{item.tag}</span>
                    <span className="tag-count" style={{ color: 'var(--text-secondary)' }}>{item.count}x ({item.percentage}%)</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '6px', background: 'var(--surface-raised)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div className="progress-bar-fill fill--good" style={{ height: '100%', width: `${item.percentage}%`, background: 'var(--success)', borderRadius: '3px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="insight-column">
          <h4 className="insight-column__header bad-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px', fontSize: '13px', color: 'var(--text)' }}>
            Obstacles (Needs Improvement)
            <span className="sub" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>When scoring &lt; {threshold}%ile (Avg {avgBadPercentile}%ile, {badMocks.length} mock{badMocks.length === 1 ? '' : 's'})</span>
          </h4>
          {badMocks.length === 0 ? (
            <p className="empty-sub" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>All your mocks met or exceeded the target! Awesome!</p>
          ) : badTagsStats.length === 0 ? (
            <p className="empty-sub" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No mistake tags logged for these mocks. Tag your mistakes to view insights.</p>
          ) : (
            <div className="tags-progress-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {badTagsStats.map((item) => (
                <div key={item.tag} className="tag-progress-item">
                  <div className="tag-info" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span className="tag-name" style={{ fontWeight: 500 }}>{item.tag}</span>
                    <span className="tag-count" style={{ color: 'var(--text-secondary)' }}>{item.count}x ({item.percentage}%)</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '6px', background: 'var(--surface-raised)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div className="progress-bar-fill fill--bad" style={{ height: '100%', width: `${item.percentage}%`, background: 'var(--red)', borderRadius: '3px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {mocks.length >= 2 && (tagCorrelationStats.goodCorrelations.length > 0 || tagCorrelationStats.badCorrelations.length > 0) && (
        <div className="correlation-section" style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600 }}>Performance Correlation (The "Why")</h4>
          <p className="sub" style={{ margin: '0 0 15px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>Your average overall percentile when specific factors are present.</p>
          <div className="correlation-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="correlation-col">
              <h5 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 500, color: 'var(--success)' }}>Top Boosters</h5>
              {tagCorrelationStats.goodCorrelations.length === 0 ? (
                <p className="empty-sub" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No boosters analyzed yet.</p>
              ) : (
                <ul className="correlation-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tagCorrelationStats.goodCorrelations.map(c => (
                    <li key={c.tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 10px', background: 'var(--surface-raised)', borderRadius: '6px' }}>
                      <span className="correlation-tag" style={{ fontWeight: 500 }}>{c.tag}</span>
                      <span className="correlation-val val--good" style={{ color: 'var(--success)', fontWeight: 600 }}>{c.avgPercentile}%ile <span className="count" style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>({c.count}x)</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="correlation-col">
              <h5 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 500, color: 'var(--red)' }}>Top Blockers</h5>
              {tagCorrelationStats.badCorrelations.length === 0 ? (
                <p className="empty-sub" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No blockers analyzed yet.</p>
              ) : (
                <ul className="correlation-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tagCorrelationStats.badCorrelations.map(c => (
                    <li key={c.tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 10px', background: 'var(--surface-raised)', borderRadius: '6px' }}>
                      <span className="correlation-tag" style={{ fontWeight: 500 }}>{c.tag}</span>
                      <span className="correlation-val val--bad" style={{ color: 'var(--red)', fontWeight: 600 }}>{c.avgPercentile}%ile <span className="count" style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>({c.count}x)</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
