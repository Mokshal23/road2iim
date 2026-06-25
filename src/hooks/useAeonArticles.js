import { useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import DOMPurify from 'dompurify';

const COLLECTION = 'aeonArticles';

export function useAeonArticles(studentId) {
  const articles = useAppStore((state) => state.aeonArticles);
  const loading = useAppStore((state) => state.loading.aeonArticles);
  const bindCollection = useAppStore((state) => state.bindCollection);

  useEffect(() => {
    if (studentId) {
      bindCollection(COLLECTION, studentId, { orderByField: 'date', orderByDirection: 'desc' });
    }
  }, [studentId, bindCollection]);

  return { articles, loading };
}

export async function addAeonArticle(article) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  await addDoc(collection(db, COLLECTION), {
    studentId,
    date: article.date,
    title: DOMPurify.sanitize(article.title || ''),
    topic: DOMPurify.sanitize(article.topic || 'General'),
    summary: DOMPurify.sanitize(article.summary || ''),
    difficulty: article.difficulty,
    vocab: (article.vocab || []).filter((v) => v.word.trim()).map(v => ({
      word: DOMPurify.sanitize(v.word),
      meaning: DOMPurify.sanitize(v.meaning),
      mastered: Boolean(v.mastered),
    })),
    link: DOMPurify.sanitize(article.link || ''),
    timeTaken: Number(article.timeTaken) || 0,
    wordCount: Number(article.wordCount) || 0,
    readingSpeed: (Number(article.wordCount) > 0 && Number(article.timeTaken) > 0) ? Math.round(Number(article.wordCount) / Number(article.timeTaken)) : 0,
    content: DOMPurify.sanitize(article.content || ''),
    summaryGrade: article.summaryGrade || null,
    quiz: article.quiz || null,
    quizHighScore: article.quizHighScore || 0,
    vocabMastery: article.vocabMastery || {},
    createdAt: new Date().toISOString(),
  });
}

export async function deleteAeonArticle(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateAeonArticle(id, article) {
  await updateDoc(doc(db, COLLECTION, id), {
    date: article.date,
    title: DOMPurify.sanitize(article.title || ''),
    topic: DOMPurify.sanitize(article.topic || 'General'),
    summary: DOMPurify.sanitize(article.summary || ''),
    difficulty: article.difficulty,
    vocab: (article.vocab || []).filter((v) => v.word.trim()).map(v => ({
      word: DOMPurify.sanitize(v.word),
      meaning: DOMPurify.sanitize(v.meaning),
      mastered: Boolean(v.mastered),
    })),
    link: DOMPurify.sanitize(article.link || ''),
    timeTaken: Number(article.timeTaken) || 0,
    wordCount: Number(article.wordCount) || 0,
    readingSpeed: (Number(article.wordCount) > 0 && Number(article.timeTaken) > 0) ? Math.round(Number(article.wordCount) / Number(article.timeTaken)) : 0,
    content: DOMPurify.sanitize(article.content || ''),
  });
}

export async function updateAeonArticleFields(id, patch) {
  await updateDoc(doc(db, COLLECTION, id), patch);
}
