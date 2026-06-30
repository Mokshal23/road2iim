import { useState, useMemo } from 'react';
import Modal from './Modal';
import { usePortalIssues, addPortalIssue, updatePortalIssueStatus, deletePortalIssue } from '../hooks/usePortalIssues';
import { formatPretty } from '../utils/dates';
import { useAppStore } from '../store/useAppStore';

function getDebugInfo() {
  return [
    `URL: ${window.location.pathname}`,
    `User Agent: ${navigator.userAgent}`,
    `Viewport: ${window.innerWidth}x${window.innerHeight}`,
    `Screen: ${window.screen.width}x${window.screen.height}`,
    `Language: ${navigator.language}`,
    `Time: ${new Date().toString()}`
  ].join('\n');
}

export default function HelpdeskModal({ userId, userEmail, role, onClose }) {
  const { issues, loading } = usePortalIssues(userId, role);
  const [view, setView] = useState('list'); // 'list' | 'report'
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Glitch / Bug');
  const [description, setDescription] = useState('');
  const [includeDebug, setIncludeDebug] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  
  const [expandedInfoId, setExpandedInfoId] = useState(null);

  const debugInfoText = useMemo(() => getDebugInfo(), []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setStatusMsg({ type: 'error', msg: 'Please fill in both the title and description.' });
      return;
    }
    setSaving(true);
    setStatusMsg(null);
    try {
      await addPortalIssue(userId, userEmail, {
        title,
        category,
        description,
        systemInfo: includeDebug ? debugInfoText : '',
      });
      useAppStore.getState().showToast('Issue ticket submitted successfully!', 'success');
      setTitle('');
      setDescription('');
      setView('list');
    } catch (err) {
      setStatusMsg({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  }

  const modalTitle = role === 'mentor' ? '⚙️ Portal Helpdesk (Admin Mode)' : '🐞 Portal Helpdesk';

  return (
    <Modal title={modalTitle} onClose={onClose}>
      <div className="helpdesk-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '5px' }}>
        
        {view === 'list' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                {role === 'mentor' 
                  ? 'Review and manage technical issues reported by students.' 
                  : 'Report portal bugs, UI glitches, or technical issues directly to the portal team.'}
              </p>
              {role !== 'mentor' && (
                <button className="btn btn--primary btn--sm" onClick={() => setView('report')}>
                  Report Portal Issue
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>⏳ Loading tickets...</div>
            ) : issues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                📭 No support tickets found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px' }}>
                {issues.map((issue) => (
                  <div 
                    key={issue.id} 
                    className="card" 
                    style={{ 
                      background: 'var(--surface-raised)', 
                      padding: '15px', 
                      margin: 0, 
                      border: '1px solid var(--border)',
                      position: 'relative'
                    }}
                  >
                    {/* Header line of ticket */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span 
                          style={{ 
                            fontSize: '11px', 
                            fontWeight: '600', 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            background: issue.category === 'Glitch / Bug' ? 'rgba(235, 87, 87, 0.15)' : 'var(--surface)',
                            color: issue.category === 'Glitch / Bug' ? 'var(--danger)' : 'var(--text-secondary)'
                          }}
                        >
                          {issue.category}
                        </span>
                        <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{issue.title}</strong>
                      </div>

                      {/* Status badge */}
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: '700', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          background: issue.status === 'Resolved' 
                            ? 'rgba(39, 174, 96, 0.15)' 
                            : issue.status === 'Investigating' 
                            ? 'rgba(47, 128, 237, 0.15)' 
                            : 'rgba(242, 153, 74, 0.15)',
                          color: issue.status === 'Resolved' 
                            ? 'var(--success)' 
                            : issue.status === 'Investigating' 
                            ? 'var(--blue)' 
                            : 'var(--amber)'
                        }}
                      >
                        {issue.status}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {issue.description}
                    </p>

                    {/* Metadata footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)', flexWrap: 'wrap', gap: '10px' }}>
                      <span>Reported: {formatPretty(issue.createdAt.substring(0, 10))}</span>
                      {role === 'mentor' && <span>By: {issue.userEmail}</span>}
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {issue.systemInfo && (
                          <button 
                            className="btn btn--ghost btn--sm" 
                            style={{ padding: '2px 6px', minHeight: 'auto', fontSize: '11px' }}
                            onClick={() => setExpandedInfoId(expandedInfoId === issue.id ? null : issue.id)}
                          >
                            {expandedInfoId === issue.id ? 'Hide Debug' : 'View Debug'}
                          </button>
                        )}

                        {role === 'mentor' ? (
                          <>
                            {issue.status === 'Open' && (
                              <button 
                                className="btn btn--ghost btn--sm" 
                                style={{ padding: '2px 6px', minHeight: 'auto', fontSize: '11px', color: 'var(--blue)' }}
                                onClick={() => updatePortalIssueStatus(issue.id, 'Investigating')}
                              >
                                Investigate
                              </button>
                            )}
                            {issue.status !== 'Resolved' && (
                              <button 
                                className="btn btn--primary btn--sm" 
                                style={{ padding: '2px 8px', minHeight: 'auto', fontSize: '11px', background: 'var(--success)', color: 'white', borderColor: 'var(--success)' }}
                                onClick={() => updatePortalIssueStatus(issue.id, 'Resolved')}
                              >
                                Resolve
                              </button>
                            )}
                          </>
                        ) : (
                          <button 
                            className="icon-btn" 
                            style={{ color: 'var(--danger)', fontSize: '12px' }}
                            title="Delete Ticket"
                            onClick={async () => {
                              if (window.confirm('Delete this support ticket?')) {
                                await deletePortalIssue(issue.id);
                                useAppStore.getState().showToast('Ticket deleted.', 'info');
                              }
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Debug System Info Details */}
                    {expandedInfoId === issue.id && issue.systemInfo && (
                      <pre 
                        style={{ 
                          background: 'var(--surface)', 
                          padding: '10px', 
                          borderRadius: '6px', 
                          fontSize: '10px', 
                          fontFamily: 'monospace', 
                          marginTop: '10px', 
                          whiteSpace: 'pre-wrap', 
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.4'
                        }}
                      >
                        {issue.systemInfo}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'report' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Submit Portal Bug / Issue</h4>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setView('list')}>
                Back to List
              </button>
            </div>

            <div className="row-card__grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
              <label>
                Issue summary / Title
                <input 
                  placeholder="e.g. Aeon Log decimal time error" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                />
              </label>

              <label>
                Category
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Glitch / Bug">Glitch / Bug</option>
                  <option value="UI / Visual Bug">UI / Visual Bug</option>
                  <option value="Performance / Lag">Performance / Lag</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>

            <label>
              Describe the problem
              <textarea 
                placeholder="Step-by-step description of what happened and what you expected instead..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows="4" 
                required 
              />
            </label>

            <div style={{ marginTop: '5px' }}>
              <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={includeDebug} 
                  onChange={(e) => setIncludeDebug(e.target.checked)} 
                  style={{ width: 'auto', margin: 0 }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Attach browser & portal debug diagnostics (highly recommended for faster fixes)
                </span>
              </label>
            </div>

            {includeDebug && (
              <pre 
                style={{ 
                  background: 'var(--surface)', 
                  padding: '10px', 
                  borderRadius: '6px', 
                  fontSize: '10px', 
                  fontFamily: 'monospace', 
                  whiteSpace: 'pre-wrap', 
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  opacity: 0.8
                }}
              >
                {debugInfoText}
              </pre>
            )}

            {statusMsg && (
              <div className={`status status--${statusMsg.type}`} style={{ padding: '8px 12px', borderRadius: '4px' }}>
                {statusMsg.msg}
              </div>
            )}

            <div className="entry-form__actions" style={{ marginTop: '10px' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setView('list')}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Submitting…' : 'Submit Issue'}
              </button>
            </div>
          </form>
        )}

      </div>
    </Modal>
  );
}
