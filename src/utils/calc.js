// Scoring assumes the standard CAT MCQ scheme: +3 for correct, -1 for
// wrong (when negative marking applies). TITA questions usually carry no
// negative marking, so each entry can toggle it off.

export function computeStats({ attempted, correct, timeTaken, negativeMarking }) {
  const att = Number(attempted) || 0;
  const cor = Math.min(Number(correct) || 0, att);
  const wrong = Math.max(att - cor, 0);
  const time = Number(timeTaken) || 0;

  const accuracy = att > 0 ? (cor / att) * 100 : 0;
  const marks = negativeMarking ? cor * 3 - wrong * 1 : cor * 3;
  const marksPerMinute = time > 0 ? marks / time : 0;
  const timePerQuestion = att > 0 ? time / att : 0;

  return {
    attempted: att,
    correct: cor,
    wrong,
    timeTaken: time,
    accuracy: round(accuracy),
    marks: round(marks),
    marksPerMinute: round(marksPerMinute),
    timePerQuestion: round(timePerQuestion),
  };
}

export function round(n, dp = 2) {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function aggregate(entries) {
  const att = sum(entries, 'attempted');
  const cor = sum(entries, 'correct');
  const wrong = sum(entries, 'wrong');
  const time = sum(entries, 'timeTaken');
  const marks = sum(entries, 'marks');
  return {
    attempted: att,
    correct: cor,
    wrong,
    timeTaken: round(time),
    marks: round(marks),
    accuracy: att > 0 ? round((cor / att) * 100) : 0,
    marksPerMinute: time > 0 ? round(marks / time) : 0,
  };
}

function sum(entries, key) {
  return entries.reduce((acc, e) => acc + (Number(e[key]) || 0), 0);
}
