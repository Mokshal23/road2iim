import { useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { validateWrite, GoalWriteSchema } from '../utils/schemas';

const COLLECTION = 'goals';

export function useGoals(studentId) {
  const goals = useAppStore((state) => state.goals);
  const loading = useAppStore((state) => state.loading.goals);
  const bindCollection = useAppStore((state) => state.bindCollection);

  useEffect(() => {
    if (studentId) {
      bindCollection(COLLECTION, studentId, { orderByField: 'deadline', orderByDirection: 'asc' });
    }
  }, [studentId, bindCollection]);

  return { goals, loading };
}

export async function addGoal(goal) {
  const studentId = useAppStore.getState().studentId;
  if (!studentId) throw new Error('No active student ID in store.');

  const dataToSave = {
    ...goal,
    studentId,
  };

  validateWrite(GoalWriteSchema, dataToSave);

  await addDoc(collection(db, COLLECTION), {
    ...dataToSave,
    createdAt: new Date().toISOString(),
  });
}

export async function removeGoal(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
