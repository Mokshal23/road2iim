import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

const DOC_PATH = ['settings', 'examDate'];
// CAT 2026 is widely expected on 29 Nov 2026 (IIM Indore's typical late-November
// slot) but this is NOT yet officially confirmed — the notification usually
// drops mid-to-late July. Editable in-app the moment it's confirmed or changes.
export const DEFAULT_EXAM_DATE = '2026-11-29';

export function useExamDate() {
  const [examDate, setExamDate] = useState(DEFAULT_EXAM_DATE);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const ref = doc(db, ...DOC_PATH);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setExamDate(snap.data().date || DEFAULT_EXAM_DATE);
        setConfirmed(Boolean(snap.data().confirmed));
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return { examDate, confirmed, loading };
}

export async function saveExamDate(date, confirmed) {
  const ref = doc(db, ...DOC_PATH);
  await setDoc(ref, { date, confirmed: Boolean(confirmed) }, { merge: true });
}
