import { useMemo } from 'react';
import { aggregate } from '../utils/calc';

// Target Time per Question (minutes) by section
const TPQ_THRESHOLDS = {
  VARC: 1.8,
  LRDI: 2.5,
  QA: 2.0,
};

export default function TopicMasteryQuadrants({ entries = [], sectionKey }) {
  const thresholdTPQ = TPQ_THRESHOLDS[sectionKey] || 2.0;

  const quadrants = useMemo(() => {
    const topics = [...new Set(entries.map((e) => e.topic).filter(Boolean))];
    const groups = {
      mastered: [],
      speedTraps: [],
      careless: [],
      sunkCost: [],
    };

    for (const topic of topics) {
      const topicEntries = entries.filter((e) => e.topic === topic);
      const agg = aggregate(topicEntries);

      if (agg.attempted === 0) continue;

      const tpq = agg.attempted > 0 ? agg.timeTaken / agg.attempted : 0;
      const accuracy = agg.accuracy;

      const dataObj = { topic, accuracy, tpq: Math.round(tpq * 10) / 10 };

      if (accuracy >= 70) {
        if (tpq <= thresholdTPQ) {
          groups.mastered.push(dataObj);
        } else {
          groups.speedTraps.push(dataObj);
        }
      } else {
        if (tpq <= thresholdTPQ) {
          groups.careless.push(dataObj);
        } else {
          groups.sunkCost.push(dataObj);
        }
      }
    }

    return groups;
  }, [entries, thresholdTPQ]);

  return (
    <div className="card topic-mastery">
      <h3>🎯 Topic mastery quadrants</h3>
      <p className="insight">
        Topics mapped by accuracy (&ge; 70%) and time per question (&le; {thresholdTPQ} min).
      </p>

      <div className="mastery-grid">
        {/* Quadrant 1: Mastered */}
        <div className="mastery-quad quadrant--mastered">
          <h4>🟢 Mastered</h4>
          <span className="mastery-quad__desc">High Accuracy · Fast Speed</span>
          <ul className="mastery-quad__list">
            {quadrants.mastered.length === 0 ? (
              <li className="empty">None yet.</li>
            ) : (
              quadrants.mastered.map((q) => (
                <li key={q.topic}>
                  <strong>{q.topic}</strong>
                  <span>{q.accuracy}% acc · {q.tpq}m/q</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Quadrant 2: Speed Traps */}
        <div className="mastery-quad quadrant--speed-traps">
          <h4>🟡 Speed traps</h4>
          <span className="mastery-quad__desc">High Accuracy · Slow Speed</span>
          <ul className="mastery-quad__list">
            {quadrants.speedTraps.length === 0 ? (
              <li className="empty">None yet.</li>
            ) : (
              quadrants.speedTraps.map((q) => (
                <li key={q.topic}>
                  <strong>{q.topic}</strong>
                  <span>{q.accuracy}% acc · {q.tpq}m/q</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Quadrant 3: Careless Errors */}
        <div className="mastery-quad quadrant--careless">
          <h4>🔵 Careless errors</h4>
          <span className="mastery-quad__desc">Low Accuracy · Fast Speed</span>
          <ul className="mastery-quad__list">
            {quadrants.careless.length === 0 ? (
              <li className="empty">None yet.</li>
            ) : (
              quadrants.careless.map((q) => (
                <li key={q.topic}>
                  <strong>{q.topic}</strong>
                  <span>{q.accuracy}% acc · {q.tpq}m/q</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Quadrant 4: Sunk Cost */}
        <div className="mastery-quad quadrant--sunk-cost">
          <h4>🔴 Sunk cost</h4>
          <span className="mastery-quad__desc">Low Accuracy · Slow Speed</span>
          <ul className="mastery-quad__list">
            {quadrants.sunkCost.length === 0 ? (
              <li className="empty">None yet.</li>
            ) : (
              quadrants.sunkCost.map((q) => (
                <li key={q.topic}>
                  <strong>{q.topic}</strong>
                  <span>{q.accuracy}% acc · {q.tpq}m/q</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
