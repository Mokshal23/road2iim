import { useMemo, useState } from 'react';
import { computeStreaks, buildHeatmapGrid, levelFor } from '../utils/streak';
import { formatPretty } from '../utils/dates';

const LEVEL_COLORS = ['#24262d', '#3d3520', '#5e4a1f', '#a07a23', '#e8a33d'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function StreakHeatmap({ activeDates }) {
  const [hovered, setHovered] = useState(null);
  const { current, longest, countsByDate } = useMemo(() => computeStreaks(activeDates), [activeDates]);
  const grid = useMemo(() => buildHeatmapGrid(countsByDate, 18), [countsByDate]);

  return (
    <div className="card">
      <div className="card__head">
        <h3>Study streak</h3>
        <div className="streak-badges">
          <span className="streak-badge">🔥 {current} day{current === 1 ? '' : 's'} current</span>
          <span className="streak-badge streak-badge--ghost">🏆 {longest} day{longest === 1 ? '' : 's'} best</span>
        </div>
      </div>

      <div className="heatmap" onMouseLeave={() => setHovered(null)}>
        <div className="heatmap__months">
          {grid.map((week, wi) => {
            const firstDay = new Date(week[0].date + 'T00:00:00');
            const showLabel = firstDay.getDate() <= 7;
            return (
              <span key={wi} className="heatmap__month-label">
                {showLabel ? MONTH_LABELS[firstDay.getMonth()] : ''}
              </span>
            );
          })}
        </div>
        <div className="heatmap__weeks">
          {grid.map((week, wi) => (
            <div className="heatmap__week" key={wi}>
              {week.map((cell) => (
                <div
                  key={cell.date}
                  className="heatmap__cell"
                  style={{ background: cell.isFuture ? 'transparent' : LEVEL_COLORS[levelFor(cell.count)] }}
                  onMouseEnter={() => !cell.isFuture && setHovered(cell)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap__footer">
        <span>{hovered ? `${hovered.count} session${hovered.count === 1 ? '' : 's'} on ${formatPretty(hovered.date)}` : 'Hover a square to see that day'}</span>
        <span className="heatmap__legend">
          Less {LEVEL_COLORS.map((c, i) => <i key={i} style={{ background: c }} />)} More
        </span>
      </div>
    </div>
  );
}
