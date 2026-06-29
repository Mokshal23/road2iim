import ExamCountdown from './ExamCountdown';
import DailyGoalMeter from './DailyGoalMeter';
import StreakHeatmap from './StreakHeatmap';
import TaskBoard from './TaskBoard';
import SectionBalance from './SectionBalance';
import PersonalTodos from './PersonalTodos';
import Reminders from './Reminders';
import AICoachSummary from './AICoachSummary';
import OnboardingGuide from './OnboardingGuide';
import { todayStr, weekRange } from '../utils/dates';
import { CardErrorBoundary } from './ErrorBoundary';

export default function TodayView({
  entries = [], aeonArticles = [], mocks = [], targets, tasks = [], examDate, examConfirmed, readOnlyGoals = false,
  todos = [], reminders = [],
}) {
  const safeEntries = entries || [];
  const safeArticles = aeonArticles || [];
  const safeMocks = mocks || [];

  const activeDates = [
    ...safeEntries.map((e) => e?.date).filter(Boolean),
    ...safeArticles.map((a) => a?.date).filter(Boolean),
    ...safeMocks.map((m) => m?.date).filter(Boolean),
  ];

  const today = todayStr();
  const { start, end } = weekRange(today);
  const weekEntries = safeEntries.filter((e) => e && e.date >= start && e.date <= end);
  const weekArticles = safeArticles.filter((a) => a && a.date >= start && a.date <= end);

  return (
    <div className="today-view">
      <CardErrorBoundary>
        <AICoachSummary entries={safeEntries} mocks={safeMocks} articles={safeArticles} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <OnboardingGuide />
      </CardErrorBoundary>

      <div className="today-grid">
        <div className="today-grid__left">
          <CardErrorBoundary>
            <ExamCountdown examDate={examDate} confirmed={examConfirmed} targets={targets} entries={safeEntries} readOnly={readOnlyGoals} />
          </CardErrorBoundary>
          <CardErrorBoundary>
            <DailyGoalMeter entries={safeEntries} aeonArticles={safeArticles} targets={targets} readOnly={readOnlyGoals} />
          </CardErrorBoundary>
          <CardErrorBoundary>
            <SectionBalance entries={weekEntries} aeonArticles={weekArticles} />
          </CardErrorBoundary>
          <CardErrorBoundary>
            <StreakHeatmap 
              activeDates={activeDates} 
              entries={safeEntries} 
              aeonArticles={safeArticles} 
              mocks={safeMocks} 
            />
          </CardErrorBoundary>
        </div>
        <div className="today-grid__right">
          <CardErrorBoundary>
            <PersonalTodos todos={todos} />
          </CardErrorBoundary>
          <CardErrorBoundary>
            <Reminders reminders={reminders} />
          </CardErrorBoundary>
          <CardErrorBoundary>
            <TaskBoard tasks={tasks} canManage={false} />
          </CardErrorBoundary>
        </div>
      </div>
    </div>
  );
}


