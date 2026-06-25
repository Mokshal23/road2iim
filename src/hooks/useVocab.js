import { useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import DOMPurify from 'dompurify';
import { validateWrite, VocabDirectWriteSchema } from '../utils/schemas';

const COLLECTION = 'vocab';

export function useVocab(studentId) {
  const vocabList = useAppStore((state) => state.vocab);
  const loading = useAppStore((state) => state.loading.vocab);
  const bindCollection = useAppStore((state) => state.bindCollection);

  useEffect(() => {
    if (studentId) {
      bindCollection(COLLECTION, studentId, { orderByField: 'createdAt', orderByDirection: 'desc' });
    }
  }, [studentId, bindCollection]);

  return { vocabList, loading };
}

export async function addVocabDirectly({ word, meaning }) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  const dataToSave = {
    studentId,
    word: DOMPurify.sanitize((word || '').trim()),
    meaning: DOMPurify.sanitize((meaning || '').trim()),
    mastered: false,
    createdAt: new Date().toISOString(),
  };

  validateWrite(VocabDirectWriteSchema, dataToSave);

  await addDoc(collection(db, COLLECTION), dataToSave);
}

export async function toggleVocabMasteryDirect(vocabId, currentMastery) {
  await updateDoc(doc(db, COLLECTION, vocabId), {
    mastered: !currentMastery,
  });
}

export async function setVocabMasteryDirect(vocabId, isMastered) {
  await updateDoc(doc(db, COLLECTION, vocabId), {
    mastered: isMastered,
  });
}

export async function deleteVocabDirect(vocabId) {
  await deleteDoc(doc(db, COLLECTION, vocabId));
}

