import DailyGoalMeter from './DailyGoalMeter';
import StreakHeatmap from './StreakHeatmap';
import TaskBoard from './TaskBoard';

export default function TodayView({ entries, aeonArticles, mocks, targets, tasks, readOnlyGoals = false }) {
  const activeDates = [
    ...entries.map((e) => e.date),
    ...aeonArticles.map((a) => a.date),
    ...mocks.map((m) => m.date),
  ];

  return (
    <div className="dashboard">
      <DailyGoalMeter entries={entries} aeonArticles={aeonArticles} targets={targets} readOnly={readOnlyGoals} />
      <TaskBoard tasks={tasks} canManage={false} />
      <StreakHeatmap activeDates={activeDates} />
    </div>
  );
}
