export function getLogicalDate(d = new Date()) {
  const dt = new Date(d);
  const hrs = dt.getHours();
  // If between 12:00 AM (midnight) and 5:59 AM, shift back by 1 day
  if (hrs < 6) {
    dt.setDate(dt.getDate() - 1);
  }
  return dt;
}

export function todayStr() {
  return toDateStr(getLogicalDate(new Date()));
}

export function toDateStr(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatPretty(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Monday-start week containing the given date.
export function weekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0 = Sun
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateStr(monday), end: toDateStr(sunday) };
}

export function shiftWeek(dateStr, deltaWeeks) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + deltaWeeks * 7);
  return toDateStr(d);
}

export function isWithin(dateStr, start, end) {
  return dateStr >= start && dateStr <= end;
}

export function daysBetween(startStr, endStr) {
  const out = [];
  let d = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  while (d <= end) {
    out.push(toDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function groupByDate(entries) {
  const map = {};
  for (const e of entries) {
    if (!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  }
  return map;
}
