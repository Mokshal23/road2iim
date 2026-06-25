import { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';

export const DEFAULT_EXAM_DATE = '2026-11-29';

export function useExamDate(studentId) {
  const examDate = useAppStore((state) => state.examDate);
  const confirmed = useAppStore((state) => state.examConfirmed);
  const loading = useAppStore((state) => state.loading.examDate);
  const bindDocument = useAppStore((state) => state.bindDocument);

  useEffect(() => {
    if (studentId) {
      bindDocument('examDate', studentId);
    }
  }, [studentId, bindDocument]);

  const displayDate = examDate || DEFAULT_EXAM_DATE;

  return { examDate: displayDate, confirmed, loading };
}

export async function saveExamDate(date, confirmed) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  const ref = doc(db, 'examDate', studentId);
  await setDoc(ref, {
    date,
    confirmed: Boolean(confirmed),
    studentId,
  }, { merge: true });
}
