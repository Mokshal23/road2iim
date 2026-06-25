import { create } from 'zustand';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

export const useAppStore = create((set, get) => {
  const activeListeners = {};

  return {
    studentId: null,
    entries: [],
    todos: [],
    reminders: [],
    aeonArticles: [],
    mockTests: [],
    tasks: [],
    goals: [],
    comments: [],
    dailyTargets: null,
    examDate: null,
    examConfirmed: false,
    toast: null,
    showToast: (message, type = 'success') => {
      set({ toast: { message, type } });
      if (window.toastTimeout) clearTimeout(window.toastTimeout);
      window.toastTimeout = setTimeout(() => {
        set({ toast: null });
      }, 3500);
    },

    loading: {
      entries: false,
      todos: false,
      reminders: false,
      aeonArticles: false,
      mockTests: false,
      tasks: false,
      goals: false,
      comments: false,
      dailyTargets: false,
      examDate: false,
    },

    setStudentId: (studentId) => {
      const currentStudentId = get().studentId;
      if (currentStudentId === studentId) return;

      // Unsubscribe all active listeners
      Object.keys(activeListeners).forEach((key) => {
        if (activeListeners[key]) {
          activeListeners[key]();
          delete activeListeners[key];
        }
      });

      // Reset state
      set({
        studentId,
        entries: [],
        todos: [],
        reminders: [],
        aeonArticles: [],
        mockTests: [],
        tasks: [],
        goals: [],
        comments: [],
        dailyTargets: null,
        examDate: null,
        examConfirmed: false,
        loading: {
          entries: false,
          todos: false,
          reminders: false,
          aeonArticles: false,
          mockTests: false,
          tasks: false,
          goals: false,
          comments: false,
          dailyTargets: false,
          examDate: false,
        },
      });
    },

    bindCollection: (colName, studentId, options = {}) => {
      if (!firebaseConfigured || !studentId) return;

      const listenerKey = `${colName}-${studentId}`;
      if (activeListeners[listenerKey]) return; // Already listening

      // Set loading state for this collection
      set((state) => ({
        loading: { ...state.loading, [colName]: true },
      }));

      const q = query(collection(db, colName), where('studentId', '==', studentId));

      const unsub = onSnapshot(
        q,
        (snap) => {
          let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (options.orderByField) {
            const field = options.orderByField;
            const direction = options.orderByDirection || 'desc';
            docs.sort((a, b) => {
              const valA = a[field] ?? '';
              const valB = b[field] ?? '';
              if (valA < valB) return direction === 'asc' ? -1 : 1;
              if (valA > valB) return direction === 'asc' ? 1 : -1;
              return 0;
            });
          }
          set({ [colName]: docs });
          set((state) => ({
            loading: { ...state.loading, [colName]: false },
          }));
        },
        (err) => {
          console.error(`Error in store listener for ${colName}:`, err);
          set((state) => ({
            loading: { ...state.loading, [colName]: false },
          }));
        }
      );

      activeListeners[listenerKey] = unsub;
    },

    bindDocument: (colName, studentId) => {
      if (!firebaseConfigured || !studentId) return;

      const listenerKey = `doc-${colName}-${studentId}`;
      if (activeListeners[listenerKey]) return; // Already listening

      // Set loading state for this document
      set((state) => ({
        loading: { ...state.loading, [colName]: true },
      }));

      const ref = doc(db, colName, studentId);
      const unsub = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (colName === 'examDate') {
              set({
                examDate: data.date || null,
                examConfirmed: Boolean(data.confirmed),
              });
            } else {
              set({ [colName]: data });
            }
          } else {
            if (colName === 'examDate') {
              set({ examDate: null, examConfirmed: false });
            } else {
              set({ [colName]: null });
            }
          }
          set((state) => ({
            loading: { ...state.loading, [colName]: false },
          }));
        },
        (err) => {
          console.error(`Error in store doc listener for ${colName}:`, err);
          set((state) => ({
            loading: { ...state.loading, [colName]: false },
          }));
        }
      );

      activeListeners[listenerKey] = unsub;
    },
  };
});
