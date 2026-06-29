import { useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { computeStats } from '../utils/calc';
import { useAppStore } from '../store/useAppStore';
import DOMPurify from 'dompurify';
import { validateWrite, MockTestWriteSchema } from '../utils/schemas';

const COLLECTION = 'mockTests';
const SECTION_KEYS = ['VARC', 'LRDI', 'QA'];

export function useMockTests(studentId) {
  const mocks = useAppStore((state) => state.mockTests);
  const loading = useAppStore((state) => state.loading.mockTests);
  const bindCollection = useAppStore((state) => state.bindCollection);

  useEffect(() => {
    if (studentId) {
      bindCollection(COLLECTION, studentId, { orderByField: 'date', orderByDirection: 'desc' });
    }
  }, [studentId, bindCollection]);

  return { mocks, loading };
}

export async function addMockTest({ date, source, label, overallScore, overallPercentile, notes, sections, goodTags = [], mistakeTags = [] }) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  const computedSections = {};
  for (const key of SECTION_KEYS) {
    const s = sections[key] || { attempted: 0, correct: 0, timeTaken: 0 };
    computedSections[key] = computeStats({ ...s, negativeMarking: true });
  }

  const dataToSave = {
    studentId,
    date: date || '',
    source: DOMPurify.sanitize(source || ''),
    label: DOMPurify.sanitize(label || ''),
    overallScore: Number(overallScore) || 0,
    overallPercentile: Number(overallPercentile) || 0,
    notes: DOMPurify.sanitize(notes || ''),
    sections: computedSections,
    flagged: false,
    goodTags: (goodTags || []).map((t) => DOMPurify.sanitize(t)),
    mistakeTags: (mistakeTags || []).map((t) => DOMPurify.sanitize(t)),
  };

  validateWrite(MockTestWriteSchema, dataToSave);

  await addDoc(collection(db, COLLECTION), {
    ...dataToSave,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteMockTest(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateMockTest(id, { date, source, label, overallScore, overallPercentile, notes, sections, goodTags = [], mistakeTags = [], flagged = false }) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  const computedSections = {};
  for (const key of SECTION_KEYS) {
    const s = sections[key] || { attempted: 0, correct: 0, timeTaken: 0 };
    computedSections[key] = computeStats({ ...s, negativeMarking: true });
  }

  const dataToSave = {
    studentId,
    date: date || '',
    source: DOMPurify.sanitize(source || ''),
    label: DOMPurify.sanitize(label || ''),
    overallScore: Number(overallScore) || 0,
    overallPercentile: Number(overallPercentile) || 0,
    notes: DOMPurify.sanitize(notes || ''),
    sections: computedSections,
    flagged: Boolean(flagged),
    goodTags: (goodTags || []).map((t) => DOMPurify.sanitize(t)),
    mistakeTags: (mistakeTags || []).map((t) => DOMPurify.sanitize(t)),
  };

  validateWrite(MockTestWriteSchema, dataToSave);

  await updateDoc(doc(db, COLLECTION, id), dataToSave);
}

export async function toggleMockFlag(mock) {
  await updateDoc(doc(db, COLLECTION, mock.id), { flagged: !mock.flagged });
}
