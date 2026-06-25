import { useAppStore } from '../store/useAppStore';

export default function Toast() {
  const toast = useAppStore((state) => state.toast);

  if (!toast) return null;

  return (
    <div 
      className={`toast-notification toast-notification--${toast.type}`} 
      onClick={() => useAppStore.setState({ toast: null })}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: toast.type === 'error' ? 'var(--red)' : 'var(--green-light)',
        color: toast.type === 'error' ? '#ffffff' : 'var(--green)',
        border: toast.type === 'error' ? 'none' : '1px solid var(--green)',
        padding: '12px 18px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        zIndex: 9999,
        fontSize: '13px',
        fontWeight: 500,
        animation: 'slideUpFade 0.25s ease-out'
      }}
    >
      <span>{toast.message}</span>
      <button 
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          color: 'inherit', 
          padding: 0, 
          fontSize: '11px',
          fontWeight: 'bold',
          opacity: 0.7
        }}
      >
        ✕
      </button>
    </div>
  );
}
