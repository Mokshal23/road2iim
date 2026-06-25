import { useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import DOMPurify from 'dompurify';

const COLLECTION = 'reminders';

export function useReminders(studentId) {
  const reminders = useAppStore((state) => state.reminders);
  const loading = useAppStore((state) => state.loading.reminders);
  const bindCollection = useAppStore((state) => state.bindCollection);

  useEffect(() => {
    if (studentId) {
      bindCollection(COLLECTION, studentId, { orderByField: 'date', orderByDirection: 'asc' });
    }
  }, [studentId, bindCollection]);

  return { reminders, loading };
}

export async function addReminder({ text, date }) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  await addDoc(collection(db, COLLECTION), {
    studentId,
    text: DOMPurify.sanitize(text || ''),
    date,
    dismissed: false,
    createdAt: new Date().toISOString(),
  });
}

export async function dismissReminder(id) {
  await updateDoc(doc(db, COLLECTION, id), { dismissed: true });
}

export async function removeReminder(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
