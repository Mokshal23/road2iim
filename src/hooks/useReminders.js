import { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

const COLLECTION = 'reminders';

export function useReminders() {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const q = query(collection(db, COLLECTION), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setReminders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  return { reminders };
}

export async function addReminder({ text, date }) {
  await addDoc(collection(db, COLLECTION), {
    text,
    date,
    dismissed: false,
    createdAt: serverTimestamp(),
  });
}

export async function dismissReminder(id) {
  await updateDoc(doc(db, COLLECTION, id), { dismissed: true });
}

export async function removeReminder(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
