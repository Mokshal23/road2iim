import { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

const COLLECTION = 'goals';

export function useGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const q = query(collection(db, COLLECTION), orderBy('deadline', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setGoals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { goals, loading };
}

export async function addGoal(goal) {
  await addDoc(collection(db, COLLECTION), { ...goal, createdAt: serverTimestamp() });
}

export async function removeGoal(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
