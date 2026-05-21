import { writable, derived } from 'svelte/store';
import type { LocalProgress } from '$lib/types';
import { getTotalXP, getLevelCounts } from '$lib/srs';
import { db } from '$lib/db';

export const progressMap = writable<Map<string, LocalProgress>>(new Map());

export function progressKey(itemType: 'term' | 'question', itemId: string): string {
  return `${itemType}:${itemId}`;
}

export function getProgress(
  map: Map<string, LocalProgress>,
  itemType: 'term' | 'question',
  itemId: string
): LocalProgress | undefined {
  return map.get(progressKey(itemType, itemId));
}

export async function loadMastery(): Promise<void> {
  const all = await db.progress.toArray();
  const map = new Map(all.map((p) => [progressKey(p.itemType, p.itemId), p]));
  progressMap.set(map);
}

export async function saveProgress(progress: LocalProgress): Promise<void> {
  await db.progress.put(progress);
  progressMap.update((m) => {
    const next = new Map(m);
    next.set(progressKey(progress.itemType, progress.itemId), progress);
    return next;
  });
}

export const stats = derived(progressMap, ($map) => {
  const all = [...$map.values()];
  return {
    totalXP: getTotalXP(all),
    levelCounts: getLevelCounts(all),
  };
});
