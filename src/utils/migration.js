import { collection, doc, getDocs, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function runMigration(userId) {
  if (!userId) return;

  const migrationKey = `road2iim_migration_done_${userId}`;
  if (localStorage.getItem(migrationKey)) {
    return; // Already migrated
  }

  console.log('Starting data migration for student:', userId);

  try {
    // 1. Migrate settings (dailyTargets and examDate) from legacy '/settings' collection
    // dailyTargets
    const legacyTargetsRef = doc(db, 'settings', 'dailyTargets');
    const legacyTargetsSnap = await getDoc(legacyTargetsRef);
    if (legacyTargetsSnap.exists()) {
      const targetRef = doc(db, 'dailyTargets', userId);
      const targetSnap = await getDoc(targetRef);
      if (!targetSnap.exists()) {
        await setDoc(targetRef, {
          ...legacyTargetsSnap.data(),
          studentId: userId,
          updatedAt: new Date().toISOString(),
        });
        console.log('Migrated dailyTargets to new path');
      }
    }

    // examDate
    const legacyExamRef = doc(db, 'settings', 'examDate');
    const legacyExamSnap = await getDoc(legacyExamRef);
    if (legacyExamSnap.exists()) {
      const examRef = doc(db, 'examDate', userId);
      const examSnap = await getDoc(examRef);
      if (!examSnap.exists()) {
        await setDoc(examRef, {
          ...legacyExamSnap.data(),
          studentId: userId,
        });
        console.log('Migrated examDate to new path');
      }
    }

    // 2. Migrate study history collections
    const collectionsToMigrate = [
      'entries',
      'goals',
      'comments',
      'aeonArticles',
      'mockTests',
      'tasks',
      'todos',
      'reminders'
    ];

    for (const colName of collectionsToMigrate) {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      
      const promises = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        // If studentId is missing, migrate it to the current user's UID
        if (!data.studentId) {
          promises.push(updateDoc(docSnap.ref, { studentId: userId }));
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        console.log(`Migrated ${promises.length} documents in '${colName}' collection`);
      }
    }

    localStorage.setItem(migrationKey, 'true');
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error during data migration:', err);
  }
}
