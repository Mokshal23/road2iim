import { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_DAILY_TARGETS } from '../constants';
import { useAppStore } from '../store/useAppStore';

export function useDailyTargets(studentId) {
  const storeTargets = useAppStore((state) => state.dailyTargets);
  const loading = useAppStore((state) => state.loading.dailyTargets);
  const bindDocument = useAppStore((state) => state.bindDocument);

  useEffect(() => {
    if (studentId) {
      bindDocument('dailyTargets', studentId);
    }
  }, [studentId, bindDocument]);

  const targets = storeTargets ? { ...DEFAULT_DAILY_TARGETS, ...storeTargets } : DEFAULT_DAILY_TARGETS;

  return { targets, loading };
}

export async function saveDailyTargets(targets) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  const ref = doc(db, 'dailyTargets', studentId);
  await setDoc(ref, {
    ...targets,
    studentId,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
