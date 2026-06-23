import { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,
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
  const writes = rows.map((row) => {
    const stats = computeStats(row);
    return addDoc(collection(db, COLLECTION), {
      date: row.date,
      section: row.section,
      subsection: row.subsection,
      topic: row.topic || 'General',
      label: row.label || '',
      source: row.source,
      mistakeTags: row.mistakeTags || [],
      notes: row.notes || '',
      negativeMarking: Boolean(row.negativeMarking),
      ...stats,
      createdAt: serverTimestamp(),
    });
  });
  await Promise.all(writes);
}

export async function deleteEntry(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
