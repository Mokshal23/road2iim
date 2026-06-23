import { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

const COLLECTION = 'tasks';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { tasks, loading };
}

export async function addTask({ text, section, dueDate }) {
  await addDoc(collection(db, COLLECTION), {
    text,
    section,
    dueDate: dueDate || null,
    status: 'pending',
    createdAt: serverTimestamp(),
    completedAt: null,
  });
}

export async function toggleTaskDone(task) {
  const ref = doc(db, COLLECTION, task.id);
  const done = task.status !== 'done';
  await updateDoc(ref, { status: done ? 'done' : 'pending', completedAt: done ? serverTimestamp() : null });
}

export async function removeTask(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
