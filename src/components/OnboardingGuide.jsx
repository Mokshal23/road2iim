import { useState, useEffect } from 'react';

export default function OnboardingGuide() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('onboarding_guide_dismissed') === 'true';
  });
  const [activeTab, setActiveTab] = useState('start');
  const [hasApiKey, setHasApiKey] = useState(() => {
    return Boolean(localStorage.getItem('gemini_api_key'));
  });

  // Listen for storage changes in case the key is saved while the guide is open
  useEffect(() => {
    const handleStorage = () => {
      setHasApiKey(Boolean(localStorage.getItem('gemini_api_key')));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('onboarding_guide_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="card onboarding-guide" style={{ border: '2px solid var(--blue)', padding: '24px', marginBottom: '24px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span>🎓</span> Road2IIM Setup & Walkthrough Center
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Welcome! Below is a quick guide on how to configure and get the most out of your tracker.
          </p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={handleDismiss} style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Dismiss Guide ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-row" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '0px' }}>
        <button className={`tab ${activeTab === 'start' ? 'tab--active' : ''}`} onClick={() => setActiveTab('start')} style={{ fontSize: '12.5px', padding: '8px 12px' }}>
          🚀 1. Setup AI Features
        </button>
        <button className={`tab ${activeTab === 'metrics' ? 'tab--active' : ''}`} onClick={() => setActiveTab('metrics')} style={{ fontSize: '12.5px', padding: '8px 12px' }}>
          📈 2. Metrics & Rules
        </button>
        <button className={`tab ${activeTab === 'features' ? 'tab--active' : ''}`} onClick={() => setActiveTab('features')} style={{ fontSize: '12.5px', padding: '8px 12px' }}>
          🛠️ 3. How to Tracker
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'start' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', background: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>1</span>
            <div>
              <strong>Get your Gemini API Key:</strong> Go to <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline', fontWeight: 500 }}>Google AI Studio (Click here)</a>. Sign in and click <strong>Create API Key</strong>. It is 100% free and takes less than a minute.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', background: hasApiKey ? 'var(--green-light)' : 'var(--surface)', color: hasApiKey ? 'var(--green)' : 'inherit', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
              {hasApiKey ? '✓' : '2'}
            </span>
            <div>
              <strong>Save your API Key:</strong> Locate the **AI Coach & Executive Summary** card directly below this walkthrough. Paste your key and click **Save Key**.
              {hasApiKey ? (
                <span className="status status--success" style={{ display: 'inline-block', padding: '2px 8px', fontSize: '11px', marginLeft: '10px', borderRadius: '4px' }}>Key Saved Successfully!</span>
              ) : (
                <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>This key stays securely in your browser's local memory.</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', background: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>3</span>
            <div>
              <strong>Try AI Vocabulary:</strong> When logging practice sets or Aeon articles, type a word and press the **`✨` button** next to it to automatically download a concise dictionary definition and synonyms.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', background: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>4</span>
            <div>
              <strong>Drag & Drop Scorecard Screenshots:</strong> In the **Mock Tests** tab, drag and drop a screenshot of your practice scorecard (from IMS, Cracku, or iQuanta). The AI will scan it and auto-fill your sectional scores and speed metrics!
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: 1.5 }}>
          <div>
            <strong style={{ color: 'var(--blue)' }}>🎯 Accuracy (%)</strong>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
              Calculated as `(Correct Questions / Attempted Questions) * 100`. Aim to maintain accuracy above 80% to ensure steady scoring.
            </p>
          </div>
          <div>
            <strong style={{ color: 'var(--blue)' }}>⚡ Speed (MPM - Marks Per Minute)</strong>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
              A key indicator of how efficiently you pick up marks. Calculated as `Total Marks Scored / Time Taken in Minutes`. A rate above **1.0 Marks/Min** is a standard target.
            </p>
          </div>
          <div>
            <strong style={{ color: 'var(--blue)' }}>⚖️ CAT Scoring Rules</strong>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
              By default, the app applies the standard CAT scoring rule of **+3 marks** for a correct answer and **-1 mark** for an incorrect answer.
            </p>
          </div>
          <div>
            <strong style={{ color: 'var(--blue)' }}>💡 TITA (Type-In-The-Answer) Questions</strong>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
              For TITA questions which do not penalize wrong answers, simply uncheck the **"Negative marking applies"** box when logging a practice set, and the app will skip the negative penalty.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: 1.5 }}>
          <div>
            <strong>📅 Daily Targets Dashboard:</strong> Track your daily pace (like logging 3 QA sets, 2 Reading passages) and build your study streak.
          </div>
          <div>
            <strong>🧠 Cumulative Fatigue Tracker:</strong> Located in the **Dashboard** tab, this logs sets chronologically in a day to analyze if your 5th or 6th practice sets suffer from fatigue (drops in accuracy or increased time).
          </div>
          <div>
            <strong>📊 Simulated Mock Test Analyzer:</strong> Log sectional scores and percentile data from test platforms (SimCAT, Cracku, etc.) to review and plot progress curves.
          </div>
          <div>
            <strong>📔 Vocab Bank:</strong> Logging difficult words during your Aeon reading tasks builds a searchable Vocab Bank automatically.
          </div>
          <div>
            <strong>🤝 Mentor Synchronization:</strong> Mentors can observe progress, assign tasks directly, and leave feedback comments that pop up on the student's dashboard.
          </div>
        </div>
      )}
    </div>
  );
}
