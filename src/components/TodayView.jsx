import ExamCountdown from './ExamCountdown';
import DailyGoalMeter from './DailyGoalMeter';
import StreakHeatmap from './StreakHeatmap';
import TaskBoard from './TaskBoard';
import SectionBalance from './SectionBalance';
import PersonalTodos from './PersonalTodos';
import Reminders from './Reminders';
import { todayStr, weekRange } from '../utils/dates';

export default function TodayView({
  entries, aeonArticles = [], mocks = [], targets, tasks = [], examDate, examConfirmed, readOnlyGoals = false,
  todos = [], reminders = [],
}) {
  const activeDates = [
    ...entries.map((e) => e.date),
    ...aeonArticles.map((a) => a.date),
    ...mocks.map((m) => m.date),
  ];

  const today = todayStr();
  const { start, end } = weekRange(today);
  const weekEntries = entries.filter((e) => e.date >= start && e.date <= end);
  const weekArticles = aeonArticles.filter((a) => a.date >= start && a.date <= end);

  return (
    <div className="today-grid">
      <div className="today-grid__left">
        <ExamCountdown examDate={examDate} confirmed={examConfirmed} targets={targets} entries={entries} readOnly={readOnlyGoals} />
        <DailyGoalMeter entries={entries} aeonArticles={aeonArticles} targets={targets} readOnly={readOnlyGoals} />
        <SectionBalance entries={weekEntries} aeonArticles={weekArticles} />
        <StreakHeatmap activeDates={activeDates} />
      </div>
      <div className="today-grid__right">
        <PersonalTodos todos={todos} />
        <Reminders reminders={reminders} />
        <TaskBoard tasks={tasks} canManage={false} />
      </div>
    </div>
  );
}


