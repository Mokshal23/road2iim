import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

export function useUserRole(user) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured || !user) {
      Promise.resolve().then(() => {
        setRole(null);
        setLoading(false);
      });
      return;
    }

    Promise.resolve().then(() => {
      setLoading(true);
    });
    const userDocRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setRole(docSnap.data().role || null);
        } else {
          setRole('unregistered');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching user role:', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  const registerRole = async (selectedRole) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      role: selectedRole,
    });
  };

  return { role, loading, registerRole };
}
