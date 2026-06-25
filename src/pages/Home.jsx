import { useState, useEffect } from 'react';
import SectionTabs from '../components/SectionTabs';
import EntryForm from '../components/EntryForm';
import QuickLogForm from '../components/QuickLogForm';
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
import { useExamDate } from '../hooks/useExamDate';
import { useAeonArticles } from '../hooks/useAeonArticles';
import { useMockTests } from '../hooks/useMockTests';
import { useTasks } from '../hooks/useTasks';
import { useTodos, addTodo } from '../hooks/useTodos';
import { useReminders } from '../hooks/useReminders';
import { firebaseConfigured } from '../firebase';
import { todayStr, shiftWeek } from '../utils/dates';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store/useAppStore';

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
  const [dashboardSection, setDashboardSection] = useState('VARC');
  const [quickMode, setQuickMode] = useState(false);

  const { user } = useAuth();
  const studentId = useAppStore((state) => state.studentId);
  const setStudentId = useAppStore((state) => state.setStudentId);

  useEffect(() => {
    if (user?.uid) {
      setStudentId(user.uid);
    }
  }, [user, setStudentId]);

  const { entries, loading } = useEntries(studentId);
  const { goals } = useGoals(studentId);
  const { comments } = useComments(studentId);
  const { targets } = useDailyTargets(studentId);
  const { examDate, confirmed } = useExamDate(studentId);
  const { articles } = useAeonArticles(studentId);
  const { mocks } = useMockTests(studentId);
  const { tasks } = useTasks(studentId);
  const { todos, loading: todosLoading } = useTodos(studentId);
  const { reminders } = useReminders(studentId);

  useEffect(() => {
    if (loading || todosLoading || entries.length === 0) return;

    const today = todayStr();
    const lastWeek = shiftWeek(today, -1);
    const recentEntries = entries.filter((e) => e.date >= lastWeek && e.date <= today);

    // Count mistake tags
    const counts = {};
    for (const e of recentEntries) {
      for (const t of e.mistakeTags || []) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }

    // Find top mistake
    let topTag = null;
    let maxCount = 0;
    for (const tag of Object.keys(counts)) {
      if (counts[tag] > maxCount) {
        maxCount = counts[tag];
        topTag = tag;
      }
    }

    if (topTag && maxCount > 0) {
      const planText = `[AI Plan] Practise drills to fix: ${topTag}`;
      const keyName = `ai_plan_created_${today}`;
      const alreadyCreatedToday = localStorage.getItem(keyName);

      if (!alreadyCreatedToday) {
        const alreadyExists = todos.some((t) => t.text === planText);
        if (!alreadyExists) {
          addTodo({ text: planText, dueDate: today });
        }
        localStorage.setItem(keyName, 'true');
      }
    }
  }, [entries, todos, loading, todosLoading]);

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

      {loading ? (
        <p className="empty">Loading your data…</p>
      ) : tab === 'today' ? (
        <TodayView
          entries={entries} aeonArticles={articles} mocks={mocks} targets={targets}
          tasks={tasks} examDate={examDate} examConfirmed={confirmed} readOnlyGoals={false}
          todos={todos} reminders={reminders}
        />
      ) : tab === 'log' ? (
        <>
          <div className="log-tab-head">
            <SectionTabs value={logSection} onChange={setLogSection} />
            <button className="btn btn--ghost btn--sm" onClick={() => setQuickMode((v) => !v)}>
              {quickMode ? 'Switch to detailed' : 'Switch to quick log'}
            </button>
          </div>
          <TaskBoard tasks={tasks} canManage={false} sectionFilter={logSection} compact />
          {quickMode ? (
            <QuickLogForm key={logSection} sectionKey={logSection} entries={entries} />
          ) : (
            <EntryForm key={logSection} sectionKey={logSection} entries={entries} />
          )}
        </>
      ) : tab === 'dashboard' ? (
        <Dashboard
          entries={entries} mocks={mocks} tasks={tasks} articles={articles}
          goals={goals} comments={comments} readOnly={false} canWriteComments={false} viewerRole="student"
          sectionKey={dashboardSection} onSectionChange={setDashboardSection}
        />
      ) : tab === 'aeon' ? (
        <AeonLog articles={articles} readOnly={false} entries={entries} />
      ) : (
        <MockTests mocks={mocks} readOnly={false} />
      )}
    </div>
  );
}
