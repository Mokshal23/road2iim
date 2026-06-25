import { useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import DOMPurify from 'dompurify';

const COLLECTION = 'comments';

export function useComments(studentId) {
  const comments = useAppStore((state) => state.comments);
  const loading = useAppStore((state) => state.loading.comments);
  const bindCollection = useAppStore((state) => state.bindCollection);

  useEffect(() => {
    if (studentId) {
      bindCollection(COLLECTION, studentId, { orderByField: 'createdAt', orderByDirection: 'desc' });
    }
  }, [studentId, bindCollection]);

  return { comments, loading };
}

export async function addComment({ date, text, linkedEntryLabel, author = 'mentor' }) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  await addDoc(collection(db, COLLECTION), {
    studentId,
    date: date || null,
    text: DOMPurify.sanitize(text || ''),
    linkedEntryLabel: DOMPurify.sanitize(linkedEntryLabel || ''),
    author,
    parentId: null,
    createdAt: new Date().toISOString(),
  });
}

export async function addReply({ parentId, text, author }) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  await addDoc(collection(db, COLLECTION), {
    studentId,
    date: null,
    text: DOMPurify.sanitize(text || ''),
    linkedEntryLabel: '',
    author,
    parentId,
    createdAt: new Date().toISOString(),
  });
}

export async function removeComment(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
