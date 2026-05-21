import { supabase } from './supabase';
import { db } from './db';
import type { LocalProgress } from './types';

export async function syncProgressUp(userId: string): Promise<void> {
  const local = await db.progress.toArray();
  if (!local.length) return;

  const rows = local.map((p) => ({
    user_id: userId,
    item_type: p.itemType,
    item_id: p.itemId,
    level: p.level,
    xp: p.xp,
    next_review: p.nextReview,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('progress')
    .upsert(rows, { onConflict: 'user_id,item_type,item_id' });

  if (error) throw error;

  await db.progress.bulkPut(
    local.map((p) => ({ ...p, syncedAt: new Date().toISOString() }))
  );
}

export async function syncProgressDown(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  if (!data?.length) return;

  const local = await db.progress.toArray();
  const localMap = new Map(local.map((p) => [`${p.itemType}:${p.itemId}`, p]));

  const merged: LocalProgress[] = data.map((row) => {
    const key = `${row.item_type}:${row.item_id}`;
    const localP = localMap.get(key);

    if (!localP) {
      return {
        itemType: row.item_type,
        itemId: row.item_id,
        level: row.level,
        xp: row.xp,
        nextReview: row.next_review,
        syncedAt: new Date().toISOString(),
      };
    }

    // Merge rule: level=max, xp=max, nextReview=min (earlier review wins)
    const nextReview =
      !localP.nextReview
        ? row.next_review
        : !row.next_review
          ? localP.nextReview
          : new Date(localP.nextReview) < new Date(row.next_review)
            ? localP.nextReview
            : row.next_review;

    return {
      itemType: row.item_type,
      itemId: row.item_id,
      level: Math.max(localP.level, row.level),
      xp: Math.max(localP.xp, row.xp),
      nextReview,
      syncedAt: new Date().toISOString(),
    };
  });

  await db.progress.bulkPut(merged);
}
