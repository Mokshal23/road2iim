import { useState, useEffect } from 'react';
import Dashboard from '../components/Dashboard';
import TodayView from '../components/TodayView';
import TaskBoard from '../components/TaskBoard';
import AeonLog from '../components/AeonLog';
import MockTests from '../components/MockTests';
import VocabBankSection from '../components/VocabBankSection';
import ConfigWarning from '../components/ConfigWarning';
import SkeletonLoader from '../components/SkeletonLoader';
import { useEntries } from '../hooks/useEntries';
import { useGoals } from '../hooks/useGoals';
import { useComments } from '../hooks/useComments';
import { useDailyTargets } from '../hooks/useDailyTargets';
import { useExamDate } from '../hooks/useExamDate';
import { useAeonArticles } from '../hooks/useAeonArticles';
import { useMockTests } from '../hooks/useMockTests';
import { useTasks } from '../hooks/useTasks';
import { useTodos } from '../hooks/useTodos';
import { useReminders } from '../hooks/useReminders';
import { useVocab } from '../hooks/useVocab';
import { useMentorship } from '../hooks/useMentorship';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store/useAppStore';
import { firebaseConfigured } from '../firebase';
import { runMigration } from '../utils/migration';

export default function Mentor() {
  const activeTab = useAppStore((state) => state.activeTab);
  const [dashboardSection, setDashboardSection] = useState('VARC');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const { user } = useAuth();
  const { students, addStudent } = useMentorship(user?.uid);
  
  const setStudentId = useAppStore((state) => state.setStudentId);
  const studentId = useAppStore((state) => state.studentId);

  // Set default student if list loaded and none selected yet
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      Promise.resolve().then(() => {
        setSelectedStudentId(students[0].studentId);
      });
    }
  }, [students, selectedStudentId]);

  // Bind Zustand active student
  useEffect(() => {
    if (selectedStudentId) {
      setStudentId(selectedStudentId);
    }
  }, [selectedStudentId, setStudentId]);

  useEffect(() => {
    if (studentId) {
      runMigration(studentId);
    }
  }, [studentId]);

  const { entries, loading } = useEntries(studentId);
  const { goals } = useGoals(studentId);
  const { comments } = useComments(studentId);
  const { targets } = useDailyTargets(studentId);
  const { examDate, confirmed } = useExamDate(studentId);
  const { articles } = useAeonArticles(studentId);
  const { mocks } = useMockTests(studentId);
  const { tasks } = useTasks(studentId);
  const { todos } = useTodos(studentId);
  const { reminders } = useReminders(studentId);
  const { vocabList } = useVocab(studentId);

  if (!firebaseConfigured) return <ConfigWarning />;

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSaving(true);
    setInviteError('');
    try {
      await addStudent(inviteEmail);
      setShowLinkModal(false);
      setInviteEmail('');
    } catch (err) {
      console.error(err);
      setInviteError(err.message || 'Failed to link student account.');
    } finally {
      setInviteSaving(false);
    }
  };

  const hasStudent = Boolean(selectedStudentId);

  return (
    <div className="page">
      <div className="mentor-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontWeight: 600 }}>🎓 Mentor Portal</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {students.length > 0 ? (
            <label style={{ fontSize: '13px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Reviewing:
              <select
                value={selectedStudentId || ''}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{ padding: '6px 12px', background: 'var(--surface-raised)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
              >
                {students.map((s) => (
                  <option key={s.studentId} value={s.studentId}>{s.studentName} ({s.studentEmail})</option>
                ))}
              </select>
            </label>
          ) : (
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>No students linked yet</span>
          )}
          <button className="btn btn--primary btn--sm" onClick={() => setShowLinkModal(true)} style={{ padding: '6px 12px', fontSize: '12.5px' }}>
            + Link Student
          </button>
        </div>
      </div>

      {!hasStudent ? (
        <div className="card" style={{ maxWidth: '500px', margin: '40px auto', padding: '30px', textAlign: 'center', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>No active student linked</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '20px', lineHeight: 1.4 }}>
            To start monitoring progress, assigning tasks, and leaving feedback comments, you must link your student's account. Ask your student to sign up first, then click below to link them by email.
          </p>
          <button className="btn btn--primary" onClick={() => setShowLinkModal(true)}>
            Link Student Account
          </button>
        </div>
      ) : loading ? (
        <SkeletonLoader type={activeTab === 'today' ? 'today' : 'card'} />
      ) : activeTab === 'today' ? (
        <TodayView
          entries={entries} aeonArticles={articles} mocks={mocks} targets={targets}
          tasks={tasks} examDate={examDate} examConfirmed={confirmed} readOnlyGoals={true}
          todos={todos} reminders={reminders}
        />
      ) : activeTab === 'dashboard' ? (
        <Dashboard
          entries={entries} mocks={mocks} tasks={tasks} articles={articles}
          goals={goals} comments={comments} readOnly={true} canWriteComments={true} viewerRole="mentor"
          sectionKey={dashboardSection} onSectionChange={setDashboardSection}
        />
      ) : activeTab === 'aeon' ? (
        <AeonLog articles={articles} readOnly={true} entries={entries} />
      ) : activeTab === 'mocks' ? (
        <MockTests mocks={mocks} readOnly={true} />
      ) : activeTab === 'tasks' ? (
        <TaskBoard tasks={tasks} canManage={true} />
      ) : (
        <VocabBankSection articles={articles} entries={entries} vocabList={vocabList} studentId={studentId} readOnly={true} />
      )}

      {showLinkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '24px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600 }}>Link Student Account</h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
              Enter the email address your student used to register on Road2IIM.
            </p>
            <form onSubmit={handleLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="email"
                placeholder="student@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                style={{ padding: '10px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13.5px' }}
              />
              {inviteError && <p style={{ fontSize: '12px', color: 'var(--danger)', margin: 0 }}>{inviteError}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setShowLinkModal(false); setInviteEmail(''); setInviteError(''); }}>Cancel</button>
                <button type="submit" className="btn btn--primary btn--sm" disabled={inviteSaving}>
                  {inviteSaving ? 'Linking...' : 'Link Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
