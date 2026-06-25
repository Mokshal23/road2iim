export default function SkeletonLoader({ type = 'card' }) {
  if (type === 'today') {
    return (
      <div className="skeleton-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', padding: '20px 0' }}>
        <div className="skeleton-pulse" style={{ height: '140px', width: '100%', borderRadius: '8px', background: 'var(--border)' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', width: '100%' }}>
          <div className="skeleton-pulse" style={{ height: '320px', borderRadius: '8px', background: 'var(--border)' }}></div>
          <div className="skeleton-pulse" style={{ height: '320px', borderRadius: '8px', background: 'var(--border)' }}></div>
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="skeleton-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', padding: '20px 0' }}>
        <div className="skeleton-pulse" style={{ height: '40px', width: '100%', borderRadius: '6px', background: 'var(--border)' }}></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-pulse" style={{ height: '35px', width: '100%', borderRadius: '4px', background: 'var(--border)' }}></div>
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', padding: '20px 0' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-pulse" style={{ height: '100px', width: '100%', borderRadius: '8px', background: 'var(--border)' }}></div>
      ))}
    </div>
  );
}
