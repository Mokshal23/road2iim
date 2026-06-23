import { useState } from 'react';
import Dashboard from '../components/Dashboard';
import TodayView from '../components/TodayView';
import TaskBoard from '../components/TaskBoard';
import AeonLog from '../components/AeonLog';
import MockTests from '../components/MockTests';
import ConfigWarning from '../components/ConfigWarning';
import { useEntries } from '../hooks/useEntries';
import { useGoals } from '../hooks/useGoals';
import { useComments } from '../hooks/useComments';
import { useDailyTargets } from '../hooks/useDailyTargets';
import { useAeonArticles } from '../hooks/useAeonArticles';
import { useMockTests } from '../hooks/useMockTests';
import { useTasks } from '../hooks/useTasks';
import { firebaseConfigured } from '../firebase';

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'aeon', label: 'Aeon log' },
  { key: 'mocks', label: 'Mock tests' },
  { key: 'tasks', label: 'Tasks' },
];

export default function Mentor() {
  const [tab, setTab] = useState('today');

  const { entries, loading, error } = useEntries();
  const { goals } = useGoals();
  const { comments } = useComments();
  const { targets } = useDailyTargets();
  const { articles } = useAeonArticles();
  const { mocks } = useMockTests();
  const { tasks } = useTasks();

  if (!firebaseConfigured) return <ConfigWarning />;

  return (
    <div className="page">
      <div className="mentor-banner">Mentor view — read-only, except notes and tasks below.</div>

      <div className="tab-row">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'tab--active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="status status--error">{error}</div>}
      {loading ? (
        <p className="empty">Loading…</p>
      ) : tab === 'today' ? (
        <TodayView entries={entries} aeonArticles={articles} mocks={mocks} targets={targets} tasks={tasks} readOnlyGoals={true} />
      ) : tab === 'dashboard' ? (
        <Dashboard entries={entries} goals={goals} comments={comments} readOnly={true} canWriteComments={true} />
      ) : tab === 'aeon' ? (
        <AeonLog articles={articles} readOnly={true} />
      ) : tab === 'mocks' ? (
        <MockTests mocks={mocks} readOnly={true} />
      ) : (
        <TaskBoard tasks={tasks} canManage={true} />
      )}
    </div>
  );
}
