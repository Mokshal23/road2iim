import { useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import DOMPurify from 'dompurify';
import { validateWrite, AeonArticleWriteSchema } from '../utils/schemas';

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

  let wordCount = Number(article.wordCount) || 0;
  if (article.type === 'book') {
    const pages = (Number(article.endPage) || 0) - (Number(article.startPage) || 0);
    wordCount = pages > 0 ? pages * 250 : 0;
  }

  const dataToSave = {
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
    wordCount,
    readingSpeed: (Number(wordCount) > 0 && Number(article.timeTaken) > 0) ? Math.round(Number(wordCount) / Number(article.timeTaken)) : 0,
    content: DOMPurify.sanitize(article.content || ''),
    summaryGrade: article.summaryGrade || null,
    quiz: article.quiz || null,
    quizHighScore: article.quizHighScore || 0,
    vocabMastery: article.vocabMastery || {},
    type: article.type || 'aeon',
    startPage: article.startPage !== undefined && article.startPage !== '' && article.startPage !== null ? Number(article.startPage) : null,
    endPage: article.endPage !== undefined && article.endPage !== '' && article.endPage !== null ? Number(article.endPage) : null,
    createdAt: new Date().toISOString(),
  };

  validateWrite(AeonArticleWriteSchema, dataToSave);

  await addDoc(collection(db, COLLECTION), dataToSave);
}

export async function deleteAeonArticle(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateAeonArticle(id, article) {
  const studentId = useAppStore.getState().studentId;

  let wordCount = Number(article.wordCount) || 0;
  if (article.type === 'book') {
    const pages = (Number(article.endPage) || 0) - (Number(article.startPage) || 0);
    wordCount = pages > 0 ? pages * 250 : 0;
  }

  const dataToSave = {
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
    wordCount,
    readingSpeed: (Number(wordCount) > 0 && Number(article.timeTaken) > 0) ? Math.round(Number(wordCount) / Number(article.timeTaken)) : 0,
    content: DOMPurify.sanitize(article.content || ''),
    type: article.type || 'aeon',
    startPage: article.startPage !== undefined && article.startPage !== '' && article.startPage !== null ? Number(article.startPage) : null,
    endPage: article.endPage !== undefined && article.endPage !== '' && article.endPage !== null ? Number(article.endPage) : null,
  };

  // Pre-flight check with merged student ID
  validateWrite(AeonArticleWriteSchema, {
    ...dataToSave,
    summaryGrade: article.summaryGrade || null,
    quiz: article.quiz || null,
    quizHighScore: article.quizHighScore || 0,
    vocabMastery: article.vocabMastery || {},
  });

  await updateDoc(doc(db, COLLECTION, id), dataToSave);
}

export async function updateAeonArticleFields(id, patch) {
  await updateDoc(doc(db, COLLECTION, id), patch);
}

