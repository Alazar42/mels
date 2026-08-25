import {
  SaveStorageItem,
  GetStorageItem,
  DeleteStorageItem,
  ClearAllStorage,
} from '../../wailsjs/go/main/App';

export const AsyncStorage = {
  async setItem(key: string, value: any): Promise<void> {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      localStorage.setItem(key, str);
      if (typeof SaveStorageItem === 'function') {
        await SaveStorageItem(key, str);
      }
    } catch (e) {
      console.warn(`AsyncStorage setItem error for key ${key}:`, e);
    }
  },

  async getItem<T = any>(key: string, defaultValue: T): Promise<T> {
    try {
      if (typeof GetStorageItem === 'function') {
        const val = await GetStorageItem(key);
        if (val) {
          try {
            return JSON.parse(val);
          } catch {
            return val as any;
          }
        }
      }
    } catch {
      // Fallback to localStorage
    }

    try {
      const local = localStorage.getItem(key);
      if (local !== null) {
        try {
          return JSON.parse(local);
        } catch {
          return local as any;
        }
      }
    } catch {
      // Return default
    }

    return defaultValue;
  },

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
      if (typeof DeleteStorageItem === 'function') {
        await DeleteStorageItem(key);
      }
    } catch (e) {
      console.warn(`AsyncStorage removeItem error for key ${key}:`, e);
    }
  },

  async clear(): Promise<void> {
    try {
      localStorage.clear();
      if (typeof ClearAllStorage === 'function') {
        await ClearAllStorage();
      }
    } catch (e) {
      console.warn('AsyncStorage clear error:', e);
    }
  },
};
