import { useState } from 'react';
import SectionTabs from '../components/SectionTabs';
import EntryForm from '../components/EntryForm';
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
  { key: 'log', label: 'Log session' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'aeon', label: 'Aeon log' },
  { key: 'mocks', label: 'Mock tests' },
];

export default function Home() {
  const [tab, setTab] = useState('today');
  const [logSection, setLogSection] = useState('VARC');

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
      <div className="tab-row">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'tab--active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="status status--error">{error}</div>}
      {loading ? (
        <p className="empty">Loading your data…</p>
      ) : tab === 'today' ? (
        <TodayView entries={entries} aeonArticles={articles} mocks={mocks} targets={targets} tasks={tasks} readOnlyGoals={false} />
      ) : tab === 'log' ? (
        <>
          <SectionTabs value={logSection} onChange={setLogSection} />
          <TaskBoard tasks={tasks} canManage={false} sectionFilter={logSection} compact />
          <EntryForm key={logSection} sectionKey={logSection} />
        </>
      ) : tab === 'dashboard' ? (
        <Dashboard entries={entries} goals={goals} comments={comments} readOnly={false} canWriteComments={false} />
      ) : tab === 'aeon' ? (
        <AeonLog articles={articles} readOnly={false} />
      ) : (
        <MockTests mocks={mocks} readOnly={false} />
      )}
    </div>
  );
}
