import { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

const COLLECTION = 'comments';

export function useComments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { comments, loading };
}

export async function addComment({ date, text, linkedEntryLabel }) {
  await addDoc(collection(db, COLLECTION), {
    date: date || null,
    text,
    linkedEntryLabel: linkedEntryLabel || '',
    author: 'mentor',
    createdAt: serverTimestamp(),
  });
}

export async function removeComment(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
