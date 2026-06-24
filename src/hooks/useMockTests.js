import { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';
import { computeStats } from '../utils/calc';

const COLLECTION = 'mockTests';
const SECTION_KEYS = ['VARC', 'LRDI', 'QA'];

export function useMockTests() {
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMocks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  return { mocks, loading, error };
}

// sections: { VARC: {attempted, correct, timeTaken}, LRDI: {...}, QA: {...} }
export async function addMockTest({ date, source, label, overallScore, overallPercentile, notes, sections }) {
  const computedSections = {};
  for (const key of SECTION_KEYS) {
    const s = sections[key] || { attempted: 0, correct: 0, timeTaken: 0 };
    computedSections[key] = computeStats({ ...s, negativeMarking: true });
  }
  await addDoc(collection(db, COLLECTION), {
    date,
    source,
    label: label || '',
    overallScore: Number(overallScore) || 0,
    overallPercentile: Number(overallPercentile) || 0,
    notes: notes || '',
    sections: computedSections,
    createdAt: serverTimestamp(),
  });
}

export async function deleteMockTest(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

// Edits a mock in place, recomputing sectional stats from the edited inputs.
export async function updateMockTest(id, { date, source, label, overallScore, overallPercentile, notes, sections }) {
  const computedSections = {};
  for (const key of SECTION_KEYS) {
    const s = sections[key] || { attempted: 0, correct: 0, timeTaken: 0 };
    computedSections[key] = computeStats({ ...s, negativeMarking: true });
  }
  await updateDoc(doc(db, COLLECTION, id), {
    date, source, label: label || '',
    overallScore: Number(overallScore) || 0,
    overallPercentile: Number(overallPercentile) || 0,
    notes: notes || '',
    sections: computedSections,
  });
}

// Mentor-side "flag for discussion" toggle. Older mocks without the field
// are treated as not flagged until toggled for the first time.
export async function toggleMockFlag(mock) {
  await updateDoc(doc(db, COLLECTION, mock.id), { flagged: !mock.flagged });
}
