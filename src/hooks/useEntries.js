import { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';
import { computeStats } from '../utils/calc';

const COLLECTION = 'entries';

export function useEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEntries(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { entries, loading, error };
}

// rows: array of raw row inputs sharing a date. Computes derived stats and
// writes each as its own document so the dashboard can slice by anything.
export async function saveSessionRows(rows) {
  const sessionId = crypto.randomUUID();
  const writes = rows.map((row, idx) => {
    const stats = computeStats(row);
    return addDoc(collection(db, COLLECTION), {
      date: row.date,
      section: row.section,
      subsection: row.subsection,
      topic: row.topic || 'General',
      label: row.label || '',
      source: row.source,
      mistakeTags: row.mistakeTags || [],
      goodTags: row.goodTags || [],
      notes: row.notes || '',
      negativeMarking: Boolean(row.negativeMarking),
      vocab: row.vocab || [],
      difficulty: row.difficulty || 'Medium',
      sessionId,
      sessionSeq: idx,
      ...stats,
      createdAt: serverTimestamp(),
    });
  });
  await Promise.all(writes);
}

export async function deleteEntry(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

// Edits an existing entry in place — recomputes derived stats from the
// edited fields, but only touches the fields passed in. Existing entries
// you don't edit are never modified.
export async function updateEntry(id, patch) {
  const stats = computeStats({
    attempted: patch.attempted, correct: patch.correct,
    timeTaken: patch.timeTaken, negativeMarking: patch.negativeMarking,
  });
  const extra = {};
  if (patch.vocab !== undefined) extra.vocab = patch.vocab;
  if (patch.difficulty !== undefined) extra.difficulty = patch.difficulty;
  await updateDoc(doc(db, COLLECTION, id), { ...patch, ...stats, ...extra });
}

// Mentor-side "flag for discussion" toggle. Older entries simply don't have
// this field yet (treated as false) until the first time someone toggles it.
export async function toggleEntryFlag(entry) {
  await updateDoc(doc(db, COLLECTION, entry.id), { flagged: !entry.flagged });
}
