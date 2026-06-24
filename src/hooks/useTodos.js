import { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

const COLLECTION = 'todos';

export function useTodos() {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTodos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  return { todos };
}

export async function addTodo({ text, dueDate }) {
  await addDoc(collection(db, COLLECTION), {
    text,
    dueDate: dueDate || '',
    done: false,
    createdAt: serverTimestamp(),
  });
}

export async function toggleTodoDone(todo) {
  await updateDoc(doc(db, COLLECTION, todo.id), { done: !todo.done });
}

export async function removeTodo(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
