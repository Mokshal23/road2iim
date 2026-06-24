// Converts an array of flat objects to a CSV string and triggers a browser
// download. No backend involved — this never reads or writes Firestore.
export function downloadCSV(rows, filename) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCSV(row[h])).join(',')),
  ];
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function entriesToRows(entries) {
  return entries.map((e) => ({
    date: e.date, section: e.section, subsection: e.subsection, topic: e.topic,
    label: e.label, difficulty: e.difficulty || '', timeTaken: e.timeTaken, attempted: e.attempted, correct: e.correct,
    wrong: e.wrong, accuracy: e.accuracy, marks: e.marks, marksLost: e.marksLost || 0, marksPerMinute: e.marksPerMinute,
    goodTags: (e.goodTags || []).join('; '), mistakeTags: (e.mistakeTags || []).join('; '),
    source: e.source, notes: e.notes,
  }));
}

export function aeonToRows(articles) {
  return articles.map((a) => ({
    date: a.date, title: a.title, topic: a.topic, difficulty: a.difficulty,
    link: a.link || '', timeTaken: a.timeTaken || 0, wordCount: a.wordCount || 0, readingSpeed: a.readingSpeed || 0,
    summary: a.summary, vocab: (a.vocab || []).map((v) => `${v.word}=${v.meaning}`).join('; '),
  }));
}

export function mocksToRows(mocks) {
  return mocks.map((m) => ({
    date: m.date, source: m.source, label: m.label,
    overallScore: m.overallScore, overallPercentile: m.overallPercentile,
    varcAccuracy: m.sections?.VARC?.accuracy, varcMpm: m.sections?.VARC?.marksPerMinute,
    lrdiAccuracy: m.sections?.LRDI?.accuracy, lrdiMpm: m.sections?.LRDI?.marksPerMinute,
    qaAccuracy: m.sections?.QA?.accuracy, qaMpm: m.sections?.QA?.marksPerMinute,
    notes: m.notes,
  }));
}
