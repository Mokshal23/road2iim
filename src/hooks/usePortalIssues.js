import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'portalIssues';

export function usePortalIssues(userId, role) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let q;
    if (role === 'mentor' || role === 'admin') {
      // Mentors see all reported portal issues
      q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    } else {
      // Students only see their own reported issues
      q = query(collection(db, COLLECTION), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setIssues(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching portal issues:', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId, role]);

  return { issues, loading };
}

export async function addPortalIssue(userId, userEmail, issue) {
  if (!userId) throw new Error('User must be logged in to report issues.');

  const dataToSave = {
    userId,
    userEmail: userEmail || 'anonymous',
    title: issue.title.trim(),
    category: issue.category,
    description: issue.description.trim(),
    systemInfo: issue.systemInfo || '',
    status: 'Open', // 'Open' | 'Investigating' | 'Resolved'
    createdAt: new Date().toISOString(),
  };

  await addDoc(collection(db, COLLECTION), dataToSave);
}

export async function updatePortalIssueStatus(id, status) {
  await updateDoc(doc(db, COLLECTION, id), { status });
}

export async function deletePortalIssue(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
