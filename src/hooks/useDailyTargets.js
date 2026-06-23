import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';
import { DEFAULT_DAILY_TARGETS } from '../constants';

const DOC_PATH = ['settings', 'dailyTargets'];

export function useDailyTargets() {
  const [targets, setTargets] = useState(DEFAULT_DAILY_TARGETS);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const ref = doc(db, ...DOC_PATH);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setTargets({ ...DEFAULT_DAILY_TARGETS, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, []);

  return { targets, loading };
}

export async function saveDailyTargets(targets) {
  const ref = doc(db, ...DOC_PATH);
  await setDoc(ref, { ...targets, updatedAt: serverTimestamp() }, { merge: true });
}
