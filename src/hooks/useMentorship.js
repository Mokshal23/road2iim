import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

export function useMentorship(mentorId) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured || !mentorId) {
      Promise.resolve().then(() => {
        setStudents([]);
        setLoading(false);
      });
      return;
    }

    Promise.resolve().then(() => {
      setLoading(true);
    });
    const q = query(collection(db, 'mentorships'), where('mentorId', '==', mentorId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStudents(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching mentorships:', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [mentorId]);

  const addStudent = async (studentEmail) => {
    if (!mentorId) throw new Error('Not logged in as a mentor.');

    const cleanEmail = studentEmail.toLowerCase().trim();

    // Query users collection to find the student
    const uQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const uSnap = await getDocs(uQuery);

    if (uSnap.empty) {
      throw new Error('This student email is not registered on Road2IIM yet. Please ask them to sign up first!');
    }

    const studentDoc = uSnap.docs[0].data();
    if (studentDoc.role !== 'student') {
      throw new Error('This email belongs to a Mentor account. You can only invite Student accounts.');
    }

    const connectionId = `${mentorId}_${studentDoc.uid}`;
    await setDoc(doc(db, 'mentorships', connectionId), {
      mentorId,
      studentId: studentDoc.uid,
      studentEmail: studentDoc.email,
      studentName: studentDoc.email.split('@')[0], // Default username placeholder
    });
  };

  return { students, loading, addStudent };
}
