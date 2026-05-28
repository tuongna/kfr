import { readable } from 'svelte/store';

export const online = readable(
  typeof navigator !== 'undefined' ? navigator.onLine : true,
  (set) => {
    if (typeof window === 'undefined') return;
    const on = () => set(true);
    const off = () => set(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }
);
