import { useState } from 'react';
import WeeklyDigest from './WeeklyDigest';
import FlaggedForDiscussion from './FlaggedForDiscussion';
import WeeklyTrends from './WeeklyTrends';
import WeekOverWeek from './WeekOverWeek';
import SectionBalance from './SectionBalance';
import MistakePatterns from './MistakePatterns';
import TopicBreakdown from './TopicBreakdown';
import DayDrilldown from './DayDrilldown';
import GoalsPanel from './GoalsPanel';
import CommentsPanel from './CommentsPanel';
import ExportData from './ExportData';
import { todayStr, weekRange } from '../utils/dates';

export default function Dashboard({
  entries, mocks = [], tasks = [], articles = [], goals, comments,
  readOnly = false, canWriteComments = false, viewerRole = 'student',
}) {
  const [anchorDate, setAnchorDate] = useState(todayStr());
  const { start, end } = weekRange(anchorDate);
  const weekEntries = entries.filter((e) => e.date >= start && e.date <= end);

  return (
    <div className="dashboard">
      <WeeklyDigest entries={entries} tasks={tasks} />

      <FlaggedForDiscussion entries={entries} mocks={mocks} />

      <CommentsPanel comments={comments} canWrite={canWriteComments} viewerRole={viewerRole} />

      <WeeklyTrends entries={entries} anchorDate={anchorDate} onAnchorChange={setAnchorDate} />

      <WeekOverWeek entries={entries} anchorDate={anchorDate} />

      <div className="dashboard__row">
        <SectionBalance entries={weekEntries} />
        <MistakePatterns weekEntries={weekEntries} allEntries={entries} />
      </div>

      <TopicBreakdown entries={weekEntries} />

      <GoalsPanel goals={goals} entries={entries} readOnly={readOnly} />

      <DayDrilldown entries={entries} readOnly={readOnly} />

      <ExportData entries={entries} articles={articles} mocks={mocks} />
    </div>
  );
}
