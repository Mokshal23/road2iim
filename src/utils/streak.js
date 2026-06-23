import { toDateStr, todayStr, daysBetween } from './dates';

// activeDates: array of 'YYYY-MM-DD' strings (duplicates fine).
// Returns { current, longest, countsByDate } where countsByDate maps
// date -> number of logged activities that day.
export function computeStreaks(activeDates) {
  const countsByDate = {};
  for (const d of activeDates) {
    countsByDate[d] = (countsByDate[d] || 0) + 1;
  }
  const uniqueDates = Object.keys(countsByDate).sort();
  if (uniqueDates.length === 0) {
    return { current: 0, longest: 0, countsByDate };
  }

  // Longest streak: scan sorted unique dates for consecutive runs.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    if (isNextDay(uniqueDates[i - 1], uniqueDates[i])) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }

  // Current streak: walk backwards from today (or yesterday, if today has
  // no entry yet — the day isn't over, so it shouldn't zero the streak).
  const today = todayStr();
  let cursor = countsByDate[today] ? today : shiftDate(today, -1);
  let current = 0;
  while (countsByDate[cursor]) {
    current += 1;
    cursor = shiftDate(cursor, -1);
  }

  return { current, longest, countsByDate };
}

function shiftDate(dateStr, deltaDays) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + deltaDays);
  return toDateStr(d);
}

function isNextDay(prev, next) {
  return shiftDate(prev, 1) === next;
}

// Builds a GitHub-style grid: array of weeks, each an array of 7 day cells
// (Mon–Sun) covering the last `weeks` weeks up to and including today.
export function buildHeatmapGrid(countsByDate, weeks = 18) {
  const today = todayStr();
  const todayDow = new Date(today + 'T00:00:00').getDay(); // 0 = Sun
  const daysSinceMonday = todayDow === 0 ? 6 : todayDow - 1;
  const gridEnd = shiftDate(today, 6 - daysSinceMonday); // upcoming Sunday
  const gridStart = shiftDate(gridEnd, -(weeks * 7 - 1));

  const allDays = daysBetween(gridStart, gridEnd);
  const grid = [];
  for (let w = 0; w < weeks; w++) {
    const week = allDays.slice(w * 7, w * 7 + 7).map((date) => ({
      date,
      count: countsByDate[date] || 0,
      isFuture: date > today,
    }));
    grid.push(week);
  }
  return grid;
}

export function levelFor(count) {
  if (count <= 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}
