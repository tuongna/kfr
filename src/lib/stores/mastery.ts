import { writable, derived, get } from 'svelte/store';
import type { LocalProgress, ProgressInput } from '$lib/types';
import { getTotalXP, getLevelCounts } from '$lib/srs';
import { db } from '$lib/db';
import { supabase } from '$lib/supabase';
import { authUser } from '$lib/stores/auth';

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

export async function loadMastery(userId: string): Promise<void> {
  const all = await db.progressV2.where('userId').equals(userId).toArray();
  const map = new Map(all.map((p) => [progressKey(p.itemType, p.itemId), p]));
  progressMap.set(map);
}

export function clearMastery(): void {
  progressMap.set(new Map());
}

export async function saveProgress(progress: ProgressInput): Promise<void> {
  const user = get(authUser);
  if (!user) return;

  const now = new Date().toISOString();
  const row: LocalProgress = { ...progress, userId: user.id };

  await db.progressV2.put(row);
  progressMap.update((m) => {
    const next = new Map(m);
    next.set(progressKey(row.itemType, row.itemId), row);
    return next;
  });

  const { error } = await supabase.from('progress').upsert(
    {
      user_id: user.id,
      item_type: row.itemType,
      item_id: row.itemId,
      level: row.level,
      xp: row.xp,
      next_review: row.nextReview,
      updated_at: now,
    },
    { onConflict: 'user_id,item_type,item_id' }
  );

  if (error) {
    // Local copy is kept without `syncedAt` so the next `syncProgressUp`
    // catches it up.
    console.warn('Failed to sync progress to Supabase:', error);
    return;
  }

  await db.progressV2.put({ ...row, syncedAt: now });
}

export const stats = derived(progressMap, ($map) => {
  const all = [...$map.values()];
  return {
    totalXP: getTotalXP(all),
    levelCounts: getLevelCounts(all),
  };
});
