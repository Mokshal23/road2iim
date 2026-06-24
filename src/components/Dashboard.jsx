import { useState } from 'react';
import WeeklyDigest from './WeeklyDigest';
import FlaggedForDiscussion from './FlaggedForDiscussion';
import WeeklyTrends from './WeeklyTrends';
import WeekOverWeek from './WeekOverWeek';
import MistakePatterns from './MistakePatterns';
import TopicBreakdown from './TopicBreakdown';
import DayDrilldown from './DayDrilldown';
import GoalsPanel from './GoalsPanel';
import CommentsPanel from './CommentsPanel';
import ExportData from './ExportData';
import ReadingSpeedTrend from './ReadingSpeedTrend';
import { SECTION_LIST } from '../constants';
import { todayStr, weekRange } from '../utils/dates';

export default function Dashboard({
  entries, mocks = [], tasks = [], articles = [], goals, comments,
  readOnly = false, canWriteComments = false, viewerRole = 'student',
  sectionKey, onSectionChange,
}) {
  const [anchorDate, setAnchorDate] = useState(todayStr());
  const { start, end } = weekRange(anchorDate);
  const weekEntries = entries.filter((e) => e.date >= start && e.date <= end && e.section === sectionKey);
  const sectionEntries = entries.filter((e) => e.section === sectionKey);

  return (
    <div className="dashboard">
      <div className="section-tabs">
        {SECTION_LIST.map((s) => (
          <button
            key={s.key}
            className={`section-tab ${sectionKey === s.key ? 'section-tab--active' : ''}`}
            onClick={() => onSectionChange(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <WeeklyDigest entries={sectionEntries} tasks={tasks} sectionKey={sectionKey} />

      <FlaggedForDiscussion entries={entries} mocks={mocks} sectionKey={sectionKey} />

      <CommentsPanel comments={comments} canWrite={canWriteComments} viewerRole={viewerRole} />

      <WeeklyTrends entries={sectionEntries} anchorDate={anchorDate} onAnchorChange={setAnchorDate} sectionKey={sectionKey} />

      <WeekOverWeek entries={sectionEntries} anchorDate={anchorDate} sectionKey={sectionKey} />

      <MistakePatterns weekEntries={weekEntries} allEntries={sectionEntries} sectionKey={sectionKey} />

      <TopicBreakdown entries={weekEntries} sectionKey={sectionKey} />

      {sectionKey === 'VARC' && <ReadingSpeedTrend articles={articles} />}

      <GoalsPanel goals={goals} entries={entries} readOnly={readOnly} sectionKey={sectionKey} />

      <DayDrilldown entries={sectionEntries} readOnly={readOnly} sectionKey={sectionKey} />

      <ExportData entries={entries} articles={articles} mocks={mocks} />
    </div>
  );
}
