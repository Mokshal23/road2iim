import { useState, useMemo } from 'react';
import { usePortalIssues, useAllUsers, updateUserRole, updatePortalIssueStatus, deletePortalIssue } from '../hooks/usePortalIssues';
import { formatPretty } from '../utils/dates';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';

export default function AdminPortal() {
  const { user } = useAuth();
  const activeTab = useAppStore((state) => state.activeTab); // 'tickets' or 'users'
  const { issues, loading: issuesLoading } = usePortalIssues(user?.uid, 'admin');
  const { users, loading: usersLoading } = useAllUsers();

  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [ticketFilter, setTicketFilter] = useState('All'); // 'All' | 'Open' | 'Investigating' | 'Resolved'
  const [ticketCategory, setTicketCategory] = useState('All');
  const [userSearch, setUserSearch] = useState('');

  // 1. Ticket computations
  const ticketStats = useMemo(() => {
    const stats = { total: 0, open: 0, investigating: 0, resolved: 0 };
    issues.forEach(i => {
      stats.total++;
      if (i.status === 'Resolved') stats.resolved++;
      else if (i.status === 'Investigating') stats.investigating++;
      else stats.open++;
    });
    return stats;
  }, [issues]);

  const filteredTickets = useMemo(() => {
    return issues.filter(i => {
      const matchStatus = ticketFilter === 'All' || i.status === ticketFilter;
      const matchCat = ticketCategory === 'All' || i.category === ticketCategory;
      return matchStatus && matchCat;
    });
  }, [issues, ticketFilter, ticketCategory]);

  // 2. User directory computations
  const userStats = useMemo(() => {
    const stats = { total: 0, student: 0, mentor: 0, admin: 0 };
    users.forEach(u => {
      stats.total++;
      if (u.role === 'student') stats.student++;
      else if (u.role === 'mentor') stats.mentor++;
      else if (u.role === 'admin') stats.admin++;
    });
    return stats;
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const emailMatch = (u.email || '').toLowerCase().includes(userSearch.toLowerCase());
      const roleMatch = (u.role || '').toLowerCase().includes(userSearch.toLowerCase());
      const uidMatch = (u.uid || '').toLowerCase().includes(userSearch.toLowerCase());
      return emailMatch || roleMatch || uidMatch;
    });
  }, [users, userSearch]);

  const handleRoleChange = async (userId, newRole) => {
    if (userId === user?.uid) {
      alert('You cannot change your own admin role. This protects you from locking yourself out.');
      return;
    }
    if (window.confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) {
      try {
        await updateUserRole(userId, newRole);
        useAppStore.getState().showToast('User role updated successfully.', 'success');
      } catch (err) {
        alert('Failed to update role: ' + err.message);
      }
    }
  };

  return (
    <div className="page" style={{ padding: '20px' }}>
      
      {activeTab === 'tickets' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Metrics Header */}
          <div className="row-card__grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            <div className="card" style={{ padding: '15px', textAlign: 'center', margin: 0 }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Tickets</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '5px' }}>{ticketStats.total}</strong>
            </div>
            <div className="card" style={{ padding: '15px', textAlign: 'center', margin: 0, borderLeft: '3px solid var(--amber)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>🟠 Open</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '5px', color: 'var(--amber)' }}>{ticketStats.open}</strong>
            </div>
            <div className="card" style={{ padding: '15px', textAlign: 'center', margin: 0, borderLeft: '3px solid var(--blue)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>🟣 Investigating</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '5px', color: 'var(--blue)' }}>{ticketStats.investigating}</strong>
            </div>
            <div className="card" style={{ padding: '15px', textAlign: 'center', margin: 0, borderLeft: '3px solid var(--success)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>🟢 Resolved</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '5px', color: 'var(--success)' }}>{ticketStats.resolved}</strong>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', gap: '15px', flexWrap: 'wrap', margin: 0 }}>
            <h4 style={{ margin: 0 }}>Support Tickets List</h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select value={ticketFilter} onChange={(e) => setTicketFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Investigating">Investigating</option>
                <option value="Resolved">Resolved</option>
              </select>
              <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)}>
                <option value="All">All Categories</option>
                <option value="Glitch / Bug">Glitch / Bug</option>
                <option value="UI / Visual Bug">UI / Visual Bug</option>
                <option value="Performance / Lag">Performance / Lag</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Ticket Listing */}
          {issuesLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>📭 No tickets matching filters.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredTickets.map((t) => (
                <div 
                  key={t.id} 
                  className="card" 
                  style={{ 
                    padding: '20px', 
                    margin: 0, 
                    border: '1px solid var(--border)',
                    background: 'var(--surface-raised)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          background: t.category === 'Glitch / Bug' ? 'rgba(235, 87, 87, 0.15)' : 'var(--surface)',
                          color: t.category === 'Glitch / Bug' ? 'var(--danger)' : 'var(--text-secondary)'
                        }}
                      >
                        {t.category}
                      </span>
                      <strong style={{ fontSize: '14px', color: 'var(--text)' }}>{t.title}</strong>
                    </div>

                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: '700', 
                        padding: '3px 10px', 
                        borderRadius: '4px',
                        background: t.status === 'Resolved' 
                          ? 'rgba(39, 174, 96, 0.15)' 
                          : t.status === 'Investigating' 
                          ? 'rgba(47, 128, 237, 0.15)' 
                          : 'rgba(242, 153, 74, 0.15)',
                        color: t.status === 'Resolved' 
                          ? 'var(--success)' 
                          : t.status === 'Investigating' 
                          ? 'var(--blue)' 
                          : 'var(--amber)'
                      }}
                    >
                      {t.status}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', lineHeight: '1.5' }}>
                    {t.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-secondary)', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '5px' }}>
                    <div>
                      <span>Reported by: <strong>{t.userEmail}</strong></span>
                      <span style={{ margin: '0 8px' }}>•</span>
                      <span>Date: {formatPretty(t.createdAt.substring(0, 10))}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {t.systemInfo && (
                        <button 
                          className="btn btn--ghost btn--sm" 
                          style={{ padding: '4px 10px', minHeight: 'auto', fontSize: '11.5px' }}
                          onClick={() => setExpandedIssueId(expandedIssueId === t.id ? null : t.id)}
                        >
                          {expandedIssueId === t.id ? 'Hide Debug Logs' : 'View Debug Logs'}
                        </button>
                      )}

                      {t.status === 'Open' && (
                        <button 
                          className="btn btn--ghost btn--sm" 
                          style={{ padding: '4px 10px', minHeight: 'auto', fontSize: '11.5px', color: 'var(--blue)', borderColor: 'var(--blue)' }}
                          onClick={() => updatePortalIssueStatus(t.id, 'Investigating')}
                        >
                          Investigate
                        </button>
                      )}
                      {t.status !== 'Resolved' && (
                        <button 
                          className="btn btn--primary btn--sm" 
                          style={{ padding: '4px 12px', minHeight: 'auto', fontSize: '11.5px', background: 'var(--success)', color: 'white', borderColor: 'var(--success)' }}
                          onClick={() => updatePortalIssueStatus(t.id, 'Resolved')}
                        >
                          Resolve
                        </button>
                      )}
                      <button 
                        className="btn btn--ghost btn--sm" 
                        style={{ padding: '4px 10px', minHeight: 'auto', fontSize: '11.5px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        onClick={async () => {
                          if (window.confirm('Delete this support ticket permanently?')) {
                            await deletePortalIssue(t.id);
                            useAppStore.getState().showToast('Ticket deleted permanently.', 'info');
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {expandedIssueId === t.id && t.systemInfo && (
                    <pre 
                      style={{ 
                        background: 'var(--surface)', 
                        padding: '12px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontFamily: 'monospace', 
                        whiteSpace: 'pre-wrap', 
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.5',
                        margin: 0
                      }}
                    >
                      {t.systemInfo}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* User Metrics */}
          <div className="row-card__grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            <div className="card" style={{ padding: '15px', textAlign: 'center', margin: 0 }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Registered</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '5px' }}>{userStats.total}</strong>
            </div>
            <div className="card" style={{ padding: '15px', textAlign: 'center', margin: 0, borderLeft: '3px solid var(--blue)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Students</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '5px', color: 'var(--blue)' }}>{userStats.student}</strong>
            </div>
            <div className="card" style={{ padding: '15px', textAlign: 'center', margin: 0, borderLeft: '3px solid var(--teal)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Mentors</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '5px', color: 'var(--teal)' }}>{userStats.mentor}</strong>
            </div>
            <div className="card" style={{ padding: '15px', textAlign: 'center', margin: 0, borderLeft: '3px solid var(--amber)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Admins</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '5px', color: 'var(--amber)' }}>{userStats.admin}</strong>
            </div>
          </div>

          {/* User Search & Table */}
          <div className="card" style={{ padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h4 style={{ margin: 0 }}>Registered Users Directory</h4>
              <input 
                placeholder="Search by Email, Role, or UID..." 
                value={userSearch} 
                onChange={(e) => setUserSearch(e.target.value)} 
                style={{ maxWidth: '300px', margin: 0 }}
              />
            </div>

            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>⏳ Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No registered users found matching query.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} className="day-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Email</th>
                    <th style={{ padding: '10px' }}>User ID (UID)</th>
                    <th style={{ padding: '10px' }}>Profile Role</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Update Access Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{u.email}</td>
                      <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-secondary)' }}>{u.uid}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span 
                          style={{ 
                            fontSize: '11px', 
                            fontWeight: '600', 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            background: u.role === 'admin' 
                              ? 'rgba(242, 153, 74, 0.15)' 
                              : u.role === 'mentor' 
                              ? 'rgba(39, 156, 200, 0.15)' 
                              : 'rgba(47, 128, 237, 0.15)',
                            color: u.role === 'admin' 
                              ? 'var(--amber)' 
                              : u.role === 'mentor' 
                              ? 'var(--teal)' 
                              : 'var(--blue)'
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <select 
                          value={u.role} 
                          onChange={(e) => handleRoleChange(u.id, e.target.value)} 
                          style={{ margin: 0, padding: '4px 8px', fontSize: '12.5px', width: 'auto', display: 'inline-block' }}
                        >
                          <option value="student">Student</option>
                          <option value="mentor">Mentor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
