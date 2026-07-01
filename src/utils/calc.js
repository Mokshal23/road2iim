// Scoring assumes the standard CAT MCQ scheme: +3 for correct, -1 for
// wrong (when negative marking applies). TITA questions usually carry no
// negative marking, so each entry can toggle it off.

export function computeStats({ attempted, correct, timeTaken, negativeMarking }) {
  const att = attempted !== '' && attempted !== undefined && attempted !== null ? Number(attempted) : null;
  const cor = correct !== '' && correct !== undefined && correct !== null ? Number(correct) : null;
  const time = Number(timeTaken) || 0;

  if (att === null || att === 0) {
    return {
      attempted: 0,
      correct: 0,
      wrong: 0,
      timeTaken: time,
      accuracy: null,
      marks: null,
      marksLost: null,
      marksPerMinute: null,
      timePerQuestion: null,
      isConceptLog: true,
    };
  }

  const actualCor = Math.min(cor || 0, att);
  const wrong = Math.max(att - actualCor, 0);
  const accuracy = (actualCor / att) * 100;
  const marksLost = negativeMarking ? wrong * 1 : 0;
  const marks = negativeMarking ? actualCor * 3 - wrong * 1 : actualCor * 3;
  const marksPerMinute = time > 0 ? marks / time : 0;
  const timePerQuestion = time / att;

  return {
    attempted: att,
    correct: actualCor,
    wrong,
    timeTaken: time,
    accuracy: round(accuracy),
    marks: round(marks),
    marksLost: round(marksLost),
    marksPerMinute: round(marksPerMinute),
    timePerQuestion: round(timePerQuestion),
    isConceptLog: false,
  };
}

export function round(n, dp = 2) {
  if (n === null || n === undefined) return null;
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function aggregate(entries) {
  const validEntries = (entries || []).filter(e => (Number(e.attempted) || 0) > 0);
  const att = sum(validEntries, 'attempted');
  const cor = sum(validEntries, 'correct');
  const wrong = sum(validEntries, 'wrong');
  const marks = sum(validEntries, 'marks');
  const marksLost = sum(validEntries, 'marksLost');

  // Total study time includes ALL logs (concepts + practice)
  const totalTime = sum(entries, 'timeTaken');

  // Practice-only study time
  const practiceTime = sum(validEntries, 'timeTaken');

  return {
    attempted: att,
    correct: cor,
    wrong,
    timeTaken: round(totalTime),
    marks: round(marks),
    marksLost: round(marksLost),
    accuracy: att > 0 ? round((cor / att) * 100) : null,
    marksPerMinute: practiceTime > 0 ? round(marks / practiceTime) : null,
  };
}

function sum(entries, key) {
  return entries.reduce((acc, e) => acc + (Number(e[key]) || 0), 0);
}
