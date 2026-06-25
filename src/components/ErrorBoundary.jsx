import React from 'react';

export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Global Error Boundary caught an exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'radial-gradient(circle at 50% 0%, #161a24 0%, #0c0d11 100%)',
          color: '#e2e4e9',
          padding: '24px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div className="card" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '32px',
            textAlign: 'center',
            border: '1px solid #bd4856',
            boxShadow: '0 8px 32px rgba(189, 72, 86, 0.15)',
            background: '#17191f'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#e2e4e9' }}>
              Connection Sync Interrupted
            </h2>
            <p style={{ fontSize: '13.5px', color: '#8a8e98', lineHeight: 1.5, marginBottom: '24px' }}>
              We encountered a client-side execution anomaly. Your local database changes are secure in the IndexedDB cache and will sync once connection returns.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                className="btn btn--primary"
                onClick={() => window.location.reload()}
                style={{ padding: '12px', fontSize: '14px', width: '100%', cursor: 'pointer' }}
              >
                🔄 Reload Control Room
              </button>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                style={{ fontSize: '12px', color: '#8a8e98' }}
              >
                {this.state.showDetails ? 'Hide System Diagnostics' : 'Show System Diagnostics'}
              </button>
            </div>
            {this.state.showDetails && (
              <pre style={{
                marginTop: '16px',
                padding: '12px',
                background: '#0f1115',
                border: '1px solid #252831',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#bd4856',
                textAlign: 'left',
                overflowX: 'auto',
                maxHeight: '150px',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                {this.state.error?.stack || this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export class CardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Card Error Boundary caught an exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{
          padding: '20px',
          border: '1px dashed #bd4856',
          background: 'rgba(189, 72, 86, 0.05)',
          borderRadius: '12px',
          textAlign: 'center',
          minHeight: '180px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e4e9' }}>
            Analytics Panel Failed to Load
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#8a8e98', maxWidth: '280px', lineHeight: 1.4 }}>
            This card could not render due to a data format issue. Other dashboard metrics remain fully operational.
          </p>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ fontSize: '11px', color: '#e2e4e9', padding: '4px 10px', minHeight: 'auto' }}
          >
            🔄 Retry Rendering
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
