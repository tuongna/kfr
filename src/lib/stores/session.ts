import { writable } from 'svelte/store';

// Terms looked up (tap-to-gloss) in current session — keyed by termId
export const sessionLookups = writable<Map<string, number>>(new Map());

export function recordLookup(termId: string): void {
  sessionLookups.update((m) => {
    const next = new Map(m);
    next.set(termId, (next.get(termId) ?? 0) + 1);
    return next;
  });
}

export function clearSession(): void {
  sessionLookups.set(new Map());
}
