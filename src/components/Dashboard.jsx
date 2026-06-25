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
import SyllabusTracker from './SyllabusTracker';
import TopicMasteryQuadrants from './TopicMasteryQuadrants';
import SlotFatigueTracker from './SlotFatigueTracker';
import { SECTION_LIST } from '../constants';
import { todayStr, weekRange } from '../utils/dates';
import { CardErrorBoundary } from './ErrorBoundary';

export default function Dashboard({
  entries = [], mocks = [], tasks = [], articles = [], goals = [], comments = [],
  readOnly = false, canWriteComments = false, viewerRole = 'student',
  sectionKey, onSectionChange,
}) {
  const [anchorDate, setAnchorDate] = useState(todayStr());
  const { start, end } = weekRange(anchorDate);
  const safeEntries = entries || [];
  const weekEntries = safeEntries.filter((e) => e.date >= start && e.date <= end && e.section === sectionKey);
  const sectionEntries = safeEntries.filter((e) => e.section === sectionKey);

  return (
    <div className="dashboard">
      <div className="section-tabs">
        {(SECTION_LIST || []).map((s) => (
          <button
            key={s.key}
            className={`section-tab ${sectionKey === s.key ? 'section-tab--active' : ''}`}
            onClick={() => onSectionChange?.(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <CardErrorBoundary>
        <WeeklyDigest entries={sectionEntries} tasks={tasks} sectionKey={sectionKey} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <FlaggedForDiscussion entries={safeEntries} mocks={mocks} sectionKey={sectionKey} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <CommentsPanel comments={comments} canWrite={canWriteComments} viewerRole={viewerRole} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <WeeklyTrends entries={sectionEntries} anchorDate={anchorDate} onAnchorChange={setAnchorDate} sectionKey={sectionKey} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <WeekOverWeek entries={sectionEntries} anchorDate={anchorDate} sectionKey={sectionKey} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <MistakePatterns weekEntries={weekEntries} allEntries={sectionEntries} sectionKey={sectionKey} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <TopicBreakdown entries={weekEntries} sectionKey={sectionKey} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <SyllabusTracker entries={sectionEntries} sectionKey={sectionKey} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <TopicMasteryQuadrants entries={sectionEntries} sectionKey={sectionKey} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <SlotFatigueTracker entries={safeEntries} sectionKey={sectionKey} selectedDate={anchorDate} />
      </CardErrorBoundary>

      {sectionKey === 'VARC' && (
        <CardErrorBoundary>
          <ReadingSpeedTrend articles={articles} />
        </CardErrorBoundary>
      )}

      <CardErrorBoundary>
        <GoalsPanel goals={goals} entries={safeEntries} readOnly={readOnly} sectionKey={sectionKey} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <DayDrilldown entries={sectionEntries} readOnly={readOnly} sectionKey={sectionKey} />
      </CardErrorBoundary>

      <CardErrorBoundary>
        <ExportData entries={safeEntries} articles={articles} mocks={mocks} />
      </CardErrorBoundary>
    </div>
  );
}

