import { useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import DOMPurify from 'dompurify';

const COLLECTION = 'tasks';

export function useTasks(studentId) {
  const tasks = useAppStore((state) => state.tasks);
  const loading = useAppStore((state) => state.loading.tasks);
  const bindCollection = useAppStore((state) => state.bindCollection);

  useEffect(() => {
    if (studentId) {
      bindCollection(COLLECTION, studentId, { orderByField: 'createdAt', orderByDirection: 'desc' });
    }
  }, [studentId, bindCollection]);

  return { tasks, loading };
}

export async function addTask({ text, section, dueDate }) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  await addDoc(collection(db, COLLECTION), {
    studentId,
    text: DOMPurify.sanitize(text || ''),
    section,
    dueDate: dueDate || null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null,
  });
}

export async function toggleTaskDone(task) {
  const ref = doc(db, COLLECTION, task.id);
  const done = task.status !== 'done';
  await updateDoc(ref, {
    status: done ? 'done' : 'pending',
    completedAt: done ? new Date().toISOString() : null,
  });
}

export async function removeTask(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
