import { useMemo, useState, useEffect, useCallback } from 'react';
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
          <button className={`seg__btn ${view === 'ai' ? 'seg__btn--active-neutral' : ''}`} onClick={() => setView('ai')}>🧠 AI Insights</button>
        </div>
      </div>
      {view === 'week' ? (
        <ThisWeekView entries={sectionWeek} sectionKey={sectionKey} />
      ) : view === 'trend' ? (
        <TrendView entries={sectionAll} sectionKey={sectionKey} />
      ) : (
        <AIMistakeInsights key={sectionKey} entries={sectionAll} sectionKey={sectionKey} />
      )}
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

async function callGeminiText(modelName, prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API call failed for ${modelName}`);
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchMistakeInsightsFromAI(apiKey, sectionKey, dataSummary) {
  const prompt = `You are an expert CAT (Common Admission Test) preparation mentor and cognitive performance analyst.
Analyze the following practice session logs for the "${sectionKey}" section.
The student has logged mistake tags and specific text notes about what went wrong in each session.
Your goal is to perform a deep qualitative analysis to identify 2-3 recurring cognitive bottlenecks, strategic flaws, or recurring errors.

Student's logged data (most recent first):
${JSON.stringify(dataSummary, null, 2)}

Instructions:
1. Identify 2 to 3 distinct recurring mistake patterns.
2. For each pattern, specify:
   - "title": A concise, clear title summarizing the bottleneck (e.g. "Over-commitment to Complex DILR Sets", "Reading Rush & Skipping Constraints", "Calculation Rush under Time Pressure").
   - "severity": "High" or "Medium" or "Low" based on frequency and impact.
   - "description": A brief explanation of how this pattern manifests in their practice, citing evidence or notes from their logs (e.g., "In topic X, you mentioned Y...").
   - "remedy": A highly specific, actionable study advice or test-taking guideline to fix/prevent this issue (e.g. "Adopt a strict 5-minute exit criteria").
3. Include a "summary" field: A concise, single-sentence summary of the student's primary bottleneck in this section.

Return ONLY a raw JSON object matching the structure below. Do not wrap it in markdown code blocks like \`\`\`json.
{
  "summary": "...",
  "patterns": [
    {
      "title": "...",
      "severity": "High" | "Medium" | "Low",
      "description": "...",
      "remedy": "..."
    }
  ]
}`;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const text = await callGeminiText(model, prompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.warn(`Gemini mistake patterns analysis failed with ${model}:`, err);
      lastError = err;
    }
  }

  throw new Error(lastError?.message || 'Failed to analyze mistake patterns.');
}

function AIMistakeInsights({ entries, sectionKey }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [insights, setInsights] = useState(() => {
    const cached = localStorage.getItem(`ai_mistakes_${sectionKey}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing cached insights', e);
      }
    }
    return null;
  });

  const [lastUpdated, setLastUpdated] = useState(() => {
    return localStorage.getItem(`ai_mistakes_updated_${sectionKey}`) || '';
  });

  function saveApiKey(key) {
    const trimmed = key.trim();
    setApiKey(trimmed);
    localStorage.setItem('gemini_api_key', trimmed);
  }

  // Filter entries that have mistake tags or notes
  const relevant = useMemo(() => {
    return entries.filter(
      (e) => (e.mistakeTags && e.mistakeTags.length > 0) || (e.notes && e.notes.trim())
    );
  }, [entries]);

  const handleRunAnalysis = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const dataSummary = relevant.slice(0, 25).map((e) => ({
        date: e.date,
        subsection: e.subsection,
        topic: e.topic,
        difficulty: e.difficulty,
        accuracy: `${e.accuracy}%`,
        mistakeTags: e.mistakeTags || [],
        notes: e.notes || '',
      }));

      const result = await fetchMistakeInsightsFromAI(apiKey, sectionKey, dataSummary);
      setInsights(result);
      const timestamp = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastUpdated(timestamp);

      localStorage.setItem(`ai_mistakes_${sectionKey}`, JSON.stringify(result));
      localStorage.setItem(`ai_mistakes_updated_${sectionKey}`, timestamp);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate AI insights.');
    } finally {
      setLoading(false);
    }
  }, [apiKey, relevant, sectionKey]);

  // Auto-run if key exists and no insights cached yet
  useEffect(() => {
    if (apiKey && !insights && !loading && relevant.length >= 3) {
      const timer = setTimeout(() => {
        handleRunAnalysis();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [apiKey, insights, loading, relevant.length, handleRunAnalysis]);

  if (!apiKey) {
    return (
      <div className="ai-card" style={{ padding: '16px', borderRadius: '8px', borderStyle: 'dashed' }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--blue)' }}>🧠 Activate AI Cognitive Insights</h4>
        <p className="insight" style={{ fontSize: '13px', marginBottom: '12px' }}>
          Analyze qualitative session notes and mistake tags to identify cognitive bottlenecks. Enter your Gemini API Key to start:
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="mistake-api-key"
            type="password"
            placeholder="Enter Gemini API Key..."
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '13px',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveApiKey(e.target.value);
            }}
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              const val = document.getElementById('mistake-api-key').value;
              saveApiKey(val);
            }}
          >
            Save Key
          </button>
        </div>
      </div>
    );
  }

  if (relevant.length < 3) {
    return (
      <div style={{ padding: '8px 0' }}>
        <p className="empty" style={{ fontStyle: 'italic' }}>
          Not enough data yet. Log at least 3 practice sets/sessions with mistake tags or text notes in this section to identify qualitative patterns.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {lastUpdated ? `Analyzed: ${lastUpdated}` : 'Never analyzed'}
        </span>
        <button
          className="btn btn--ghost btn--sm"
          style={{ minHeight: 'auto', padding: '4px 8px', fontSize: '11px' }}
          disabled={loading}
          onClick={handleRunAnalysis}
        >
          {loading ? 'Analyzing...' : '🔄 Re-analyze'}
        </button>
      </div>

      {loading ? (
        <div className="pulse" style={{ padding: '24px 0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--amber)' }}>
            ⚡ Gemini is analyzing your qualitative notes and mistake tags...
          </p>
        </div>
      ) : error ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--danger)' }}>❌ {error}</p>
      ) : insights ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="ai-card" style={{ padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--blue)' }}>
            <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', color: 'var(--text)' }}>
              <strong>Summary:</strong> {insights.summary}
            </p>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {insights.patterns?.map((pat, idx) => {
              const severityColor =
                pat.severity === 'High'
                  ? 'var(--danger)'
                  : pat.severity === 'Medium'
                  ? 'var(--amber)'
                  : 'var(--blue)';
              return (
                <div
                  key={idx}
                  className="ai-card"
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '6px',
                    }}
                  >
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>{pat.title}</strong>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: severityColor,
                        border: `1px solid ${severityColor}`,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {pat.severity}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {pat.description}
                  </p>
                  <div
                    style={{
                      padding: '8px 10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      borderLeft: '2px solid var(--success)',
                      fontSize: '11.5px',
                      color: 'var(--text)',
                      lineHeight: '1.4',
                    }}
                  >
                    <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '2px' }}>Action Remedy:</strong>
                    {pat.remedy}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <button className="btn btn--primary" onClick={handleRunAnalysis}>
            🔍 Run AI Analysis
          </button>
        </div>
      )}
    </div>
  );
}
