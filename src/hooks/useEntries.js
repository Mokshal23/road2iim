import { useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { computeStats } from '../utils/calc';
import { useAppStore } from '../store/useAppStore';
import DOMPurify from 'dompurify';

const COLLECTION = 'entries';

export function useEntries(studentId) {
  const entries = useAppStore((state) => state.entries);
  const loading = useAppStore((state) => state.loading.entries);
  const bindCollection = useAppStore((state) => state.bindCollection);

  useEffect(() => {
    if (studentId) {
      bindCollection(COLLECTION, studentId, { orderByField: 'date', orderByDirection: 'desc' });
    }
  }, [studentId, bindCollection]);

  return { entries, loading };
}

export async function saveSessionRows(rows) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  const sessionId = crypto.randomUUID();
  const writes = rows.map((row, idx) => {
    const stats = computeStats(row);
    return addDoc(collection(db, COLLECTION), {
      studentId, // Scoped to student
      date: row.date,
      section: row.section,
      subsection: row.subsection,
      topic: row.topic || 'General',
      label: row.label || '',
      source: row.source,
      mistakeTags: row.mistakeTags || [],
      goodTags: row.goodTags || [],
      notes: DOMPurify.sanitize(row.notes || ''),
      negativeMarking: Boolean(row.negativeMarking),
      vocab: row.vocab || [],
      difficulty: row.difficulty || 'Medium',
      sessionId,
      sessionSeq: idx,
      ...stats,
      createdAt: new Date().toISOString(), // Use standard ISO string for offline-safety
    });
  });
  await Promise.all(writes);
}

export async function deleteEntry(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateEntry(id, patch) {
  const stats = computeStats({
    attempted: patch.attempted,
    correct: patch.correct,
    timeTaken: patch.timeTaken,
    negativeMarking: patch.negativeMarking,
  });
  const extra = {};
  if (patch.notes !== undefined) extra.notes = DOMPurify.sanitize(patch.notes || '');
  if (patch.vocab !== undefined) extra.vocab = patch.vocab;
  if (patch.difficulty !== undefined) extra.difficulty = patch.difficulty;
  await updateDoc(doc(db, COLLECTION, id), { ...patch, ...stats, ...extra });
}

export async function toggleEntryFlag(entry) {
  await updateDoc(doc(db, COLLECTION, entry.id), { flagged: !entry.flagged });
}
