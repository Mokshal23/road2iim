import { useState } from 'react';
import WeeklyTrends from './WeeklyTrends';
import WeekOverWeek from './WeekOverWeek';
import SectionBalance from './SectionBalance';
import MistakePatterns from './MistakePatterns';
import TopicBreakdown from './TopicBreakdown';
import DayDrilldown from './DayDrilldown';
import GoalsPanel from './GoalsPanel';
import CommentsPanel from './CommentsPanel';
import { todayStr, weekRange } from '../utils/dates';

export default function Dashboard({ entries, goals, comments, readOnly = false, canWriteComments = false }) {
  const [anchorDate, setAnchorDate] = useState(todayStr());
  const { start, end } = weekRange(anchorDate);
  const weekEntries = entries.filter((e) => e.date >= start && e.date <= end);

  return (
    <div className="dashboard">
      <CommentsPanel comments={comments} canWrite={canWriteComments} />

      <WeeklyTrends entries={entries} anchorDate={anchorDate} onAnchorChange={setAnchorDate} />

      <WeekOverWeek entries={entries} anchorDate={anchorDate} />

      <div className="dashboard__row">
        <SectionBalance entries={weekEntries} />
        <MistakePatterns entries={weekEntries} />
      </div>

      <TopicBreakdown entries={weekEntries} />

      <GoalsPanel goals={goals} entries={entries} readOnly={readOnly} />

      <DayDrilldown entries={entries} readOnly={readOnly} />
    </div>
  );
}
