import { useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import DOMPurify from 'dompurify';

const COLLECTION = 'todos';

export function useTodos(studentId) {
  const todos = useAppStore((state) => state.todos);
  const loading = useAppStore((state) => state.loading.todos);
  const bindCollection = useAppStore((state) => state.bindCollection);

  useEffect(() => {
    if (studentId) {
      bindCollection(COLLECTION, studentId, { orderByField: 'dueDate', orderByDirection: 'asc' });
    }
  }, [studentId, bindCollection]);

  return { todos, loading };
}

export async function addTodo({ text, dueDate }) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  await addDoc(collection(db, COLLECTION), {
    studentId,
    text: DOMPurify.sanitize(text || ''),
    dueDate: dueDate || '',
    done: false,
    createdAt: new Date().toISOString(),
  });
}

export async function toggleTodoDone(todo) {
  await updateDoc(doc(db, COLLECTION, todo.id), { done: !todo.done });
}

export async function removeTodo(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
