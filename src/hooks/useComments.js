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

// Top-level note. parentId is explicitly null so old documents (which
// never had this field) and new ones are treated identically downstream.
export async function addComment({ date, text, linkedEntryLabel, author = 'mentor' }) {
  await addDoc(collection(db, COLLECTION), {
    date: date || null,
    text,
    linkedEntryLabel: linkedEntryLabel || '',
    author,
    parentId: null,
    createdAt: serverTimestamp(),
  });
}

// A reply nested under an existing top-level note. Either side can reply.
export async function addReply({ parentId, text, author }) {
  await addDoc(collection(db, COLLECTION), {
    date: null,
    text,
    linkedEntryLabel: '',
    author,
    parentId,
    createdAt: serverTimestamp(),
  });
}

export async function removeComment(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
