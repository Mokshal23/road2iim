import { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

const COLLECTION = 'aeonArticles';

export function useAeonArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setArticles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { articles, loading, error };
}

export async function addAeonArticle(article) {
  await addDoc(collection(db, COLLECTION), {
    date: article.date,
    title: article.title,
    topic: article.topic || 'General',
    summary: article.summary || '',
    difficulty: article.difficulty,
    vocab: (article.vocab || []).filter((v) => v.word.trim()),
    createdAt: serverTimestamp(),
  });
}

export async function deleteAeonArticle(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

// Edits an article in place. Only the fields passed are changed.
export async function updateAeonArticle(id, article) {
  await updateDoc(doc(db, COLLECTION, id), {
    date: article.date,
    title: article.title,
    topic: article.topic || 'General',
    summary: article.summary || '',
    difficulty: article.difficulty,
    vocab: (article.vocab || []).filter((v) => v.word.trim()),
  });
}
