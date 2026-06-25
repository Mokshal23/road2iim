export const safeStorage = {
  getItem: (key, defaultValue = null) => {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      
      // Try parsing as JSON first
      try {
        return JSON.parse(value);
      } catch {
        // Return raw string if not JSON
        return value;
      }
    } catch (err) {
      console.warn(`Local storage read error for key "${key}", auto-recovering:`, err);
      // Self-healing: clear corrupt storage key
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Failed to clear corrupted key from storage:', e);
      }
      return defaultValue;
    }
  },

  setItem: (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
    } catch (err) {
      console.error(`Local storage write error for key "${key}":`, err);
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`Local storage delete error for key "${key}":`, err);
    }
  },

  getSessionItem: (key, defaultValue = null) => {
    try {
      const value = sessionStorage.getItem(key);
      if (value === null) return defaultValue;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (err) {
      console.warn(`Session storage read error for key "${key}", auto-recovering:`, err);
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        console.error('Failed to clear corrupted session key:', e);
      }
      return defaultValue;
    }
  },

  setSessionItem: (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      sessionStorage.setItem(key, stringValue);
    } catch (err) {
      console.error(`Session storage write error for key "${key}":`, err);
    }
  },

  removeSessionItem: (key) => {
    try {
      sessionStorage.removeItem(key);
    } catch (err) {
      console.error(`Session storage delete error for key "${key}":`, err);
    }
  }
};
