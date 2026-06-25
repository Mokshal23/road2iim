import { useState, useEffect, useCallback } from 'react';
import { todayStr, shiftWeek } from '../utils/dates';
import { callWithFallbackText } from '../utils/ai';
import { useAppStore } from '../store/useAppStore';

// Standard fetch to Gemini API for text generation (with 2.5 -> 1.5 fallback)
async function generateCoachBriefing(apiKey, activitySummary) {
  const prompt = `You are an expert CAT (Common Admission Test) preparation mentor and personal performance coach.
Analyze the following recent practice logs (last 7 days of session entries, mock tests, and reading articles) for the student.
Provide a highly specific, personalized, and actionable executive summary.
You MUST limit your response to EXACTLY 3 sentences matching this structure:
1. Sentence 1 (Positive Trend): Highlight a specific positive metric or behavior (e.g. good accuracy in VARC RCs, high QA speed, or consistent targets).
2. Sentence 2 (Critical Issue): Call out a critical bottleneck, mistake pattern, or neglected area (e.g. fatigue drop-offs, silly calculation slips, or lack of QA practice).
3. Sentence 3 (Action Plan): Give one concrete, clear next step for their practice session today.

Keep the tone calm, professional, objective, and encouraging. Do not use generic filler words.

Student's 7-Day Performance Data:
${JSON.stringify(activitySummary, null, 2)}
`;

  return await callWithFallbackText(prompt);
}

export default function AICoachSummary({ entries = [], mocks = [], articles = [] }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [summary, setSummary] = useState(localStorage.getItem('ai_coach_summary') || '');
  const [lastUpdated, setLastUpdated] = useState(localStorage.getItem('ai_coach_updated') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function saveApiKey(key) {
    const trimmed = key.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    localStorage.setItem('gemini_api_key', trimmed);
    useAppStore.getState().showToast('API Key saved successfully!', 'success');
  }

  const handleRefresh = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const activitySummary = getSevenDaySummary(entries, mocks, articles);
      const text = await generateCoachBriefing(apiKey, activitySummary);
      setSummary(text);
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastUpdated(timestamp);
      localStorage.setItem('ai_coach_summary', text);
      localStorage.setItem('ai_coach_updated', timestamp);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch AI insights');
    } finally {
      setLoading(false);
    }
  }, [apiKey, entries, mocks, articles]);

  // Auto-fetch if key exists and no summary is cached yet
  useEffect(() => {
    if (apiKey && !summary && !loading) {
      const timer = setTimeout(() => {
        handleRefresh();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [apiKey, summary, loading, handleRefresh]);

  if (!apiKey) {
    return (
      <div className="card ai-card" style={{ marginBottom: '20px', borderStyle: 'dashed' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--blue)' }}>🧠 AI Coach & Executive Summary</h3>
        <p className="insight" style={{ marginBottom: '12px', fontSize: '13px' }}>
          Activate your personal CAT coach to get 3-sentence actionable daily advice based on your recent practice logs.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="coach-api-key"
            type="password"
            placeholder="Enter Gemini API Key..."
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '13px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveApiKey(e.target.value);
            }}
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              const val = document.getElementById('coach-api-key').value;
              saveApiKey(val);
            }}
          >
            Save Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card ai-card" style={{ marginBottom: '20px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--blue)' }}>🧠 AI Coach & Executive Summary</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {lastUpdated && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Updated: {lastUpdated}</span>}
          <button
            className="btn btn--ghost btn--sm"
            style={{ minHeight: 'auto', padding: '4px 8px', fontSize: '11px' }}
            disabled={loading}
            onClick={handleRefresh}
          >
            {loading ? 'Analyzing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pulse" style={{ padding: '10px 0' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--amber)' }}>⚡ Gemini is analyzing your 7-day logs...</p>
        </div>
      ) : error ? (
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--danger)' }}>❌ {error}</p>
      ) : summary ? (
        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--text)' }}>
          {summary}
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          Click Refresh to compile your 7-day activity insights.
        </p>
      )}

      <button
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '9px',
          cursor: 'pointer'
        }}
        onClick={() => {
          localStorage.removeItem('gemini_api_key');
          setApiKey('');
          setSummary('');
          useAppStore.getState().showToast('API Key removed.', 'info');
        }}
      >
        Remove Key
      </button>
    </div>
  );
}

// Compile stats from the last 7 days
function getSevenDaySummary(entries, mocks, articles) {
  const today = todayStr();
  const limitDate = shiftWeek(today, -1); // 7 days ago

  const recentEntries = entries.filter(e => e.date >= limitDate);
  const recentMocks = mocks.filter(m => m.date >= limitDate);
  const recentArticles = articles.filter(a => a.date >= limitDate);

  // Overall calculations
  const totalEntries = recentEntries.length;
  const totalTime = recentEntries.reduce((sum, e) => sum + (Number(e.timeTaken) || 0), 0);
  const totalAttempted = recentEntries.reduce((sum, e) => sum + (Number(e.attempted) || 0), 0);
  const totalCorrect = recentEntries.reduce((sum, e) => sum + (Number(e.correct) || 0), 0);
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // Section details
  const sections = { VARC: { time: 0, att: 0, corr: 0 }, LRDI: { time: 0, att: 0, corr: 0 }, QA: { time: 0, att: 0, corr: 0 } };
  const mistakeCounts = {};
  const positiveCounts = {};

  recentEntries.forEach(e => {
    const sec = e.section;
    if (sections[sec]) {
      sections[sec].time += (Number(e.timeTaken) || 0);
      sections[sec].att += (Number(e.attempted) || 0);
      sections[sec].corr += (Number(e.correct) || 0);
    }
    // Mistakes
    (e.mistakeTags || []).forEach(tag => {
      mistakeCounts[tag] = (mistakeCounts[tag] || 0) + 1;
    });
    // Positives
    (e.goodTags || []).forEach(tag => {
      positiveCounts[tag] = (positiveCounts[tag] || 0) + 1;
    });
  });

  // Sort mistakes/positives
  const topMistakes = Object.entries(mistakeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(x => x[0]);
  const topPositives = Object.entries(positiveCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(x => x[0]);

  return {
    period: "Last 7 days",
    overall: {
      sessionsLogged: totalEntries,
      totalMinutes: totalTime,
      totalAttempted,
      accuracy: `${overallAccuracy}%`
    },
    sections: Object.keys(sections).reduce((acc, key) => {
      const s = sections[key];
      acc[key] = {
        minutesSpent: s.time,
        questionsAttempted: s.att,
        accuracy: s.att > 0 ? `${Math.round((s.corr / s.att) * 100)}%` : '0%'
      };
      return acc;
    }, {}),
    frequentMistakes: topMistakes,
    frequentStrengths: topPositives,
    mockTests: recentMocks.map(m => ({
      source: m.source,
      label: m.label,
      score: m.overallScore,
      percentile: m.overallPercentile
    })),
    aeonArticles: {
      countRead: recentArticles.length,
      averageWpm: recentArticles.length > 0
        ? Math.round(recentArticles.reduce((sum, a) => sum + (Number(a.wpm) || 0), 0) / recentArticles.length)
        : 0
    }
  };
}
