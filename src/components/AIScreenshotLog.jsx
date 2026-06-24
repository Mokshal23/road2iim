import { useState, useEffect, useCallback } from 'react';
import { fileToBase64, parseScreenshotWithGemini } from '../utils/ai';

export default function AIScreenshotLog({ onAutofill }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const parsed = await parseScreenshotWithGemini(base64, apiKey);
      onAutofill(parsed);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to parse image');
    } finally {
      setLoading(false);
    }
  }, [apiKey, onAutofill]);

  // Auto-listen to paste events on window
  useEffect(() => {
    if (!apiKey) return;
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) handleImageFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [apiKey, handleImageFile]);


  function handleSaveKey(key) {
    const trimmed = key.trim();
    setApiKey(trimmed);
    localStorage.setItem('gemini_api_key', trimmed);
  }

  if (!apiKey) {
    return (
      <div className="card ai-log-setup" style={{ borderStyle: 'dashed', borderColor: 'var(--amber)', padding: '16px' }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '14px' }}>📷 AI Screenshot Autofill</h4>
        <p className="insight" style={{ marginBottom: '12px' }}>
          Instantly fill forms by pasting or uploading scorecards. Enter your API key below.
        </p>
        <div className="ai-key-input-row" style={{ display: 'flex', gap: '8px' }}>
          <input
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
              if (e.key === 'Enter') handleSaveKey(e.target.value);
            }}
            id="gemini-key-field"
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              const val = document.getElementById('gemini-key-field').value;
              handleSaveKey(val);
            }}
          >
            Save Key
          </button>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px', display: 'block' }}>
          Get a free API key from Google AI Studio. It is saved locally in your browser.
        </span>
      </div>
    );
  }

  return (
    <div
      className="card ai-log-zone"
      onClick={() => document.getElementById('ai-screenshot-picker').click()}
      style={{
        borderStyle: 'dashed',
        borderColor: 'var(--blue)',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'relative',
        padding: '24px 20px',
      }}
    >
      <input
        type="file"
        accept="image/*"
        id="ai-screenshot-picker"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
        }}
      />
      <div>
        {loading ? (
          <p style={{ margin: 0, color: 'var(--amber)', fontWeight: 600 }} className="pulse">
            ⚡ Gemini is analyzing scorecard...
          </p>
        ) : (
          <>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>📷 AI Log Zone (Key Active)</h4>
            <p className="insight" style={{ margin: 0 }}>
              Paste screenshot (`Ctrl+V`) or <strong>Tap here to select / take photo</strong>.
            </p>
          </>
        )}
      </div>
      {error && <p style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '8px', marginBottom: 0 }}>❌ {error}</p>}

      <button
        type="button"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '10px',
          padding: '6px',
        }}
        onClick={(e) => {
          e.stopPropagation();
          localStorage.removeItem('gemini_api_key');
          setApiKey('');
        }}
      >
        Change Key
      </button>
    </div>
  );
}
