import { supabase } from './supabase';
import { db } from './db';
import type { LocalProgress } from './types';
import { LEGACY_PROGRESS_USER_ID } from './types';

/**
 * Upload any local progress rows for `userId` that haven't been synced yet
 * (no `syncedAt`). Called after sign-in so offline edits made on this device
 * eventually reach the server.
 */
export async function syncProgressUp(userId: string): Promise<void> {
  const unsynced = await db.progress
    .where('userId')
    .equals(userId)
    .filter((p) => !p.syncedAt)
    .toArray();
  if (!unsynced.length) return;

  const now = new Date().toISOString();
  const rows = unsynced.map((p) => ({
    user_id: userId,
    item_type: p.itemType,
    item_id: p.itemId,
    level: p.level,
    xp: p.xp,
    next_review: p.nextReview,
    updated_at: now,
  }));

  const { error } = await supabase
    .from('progress')
    .upsert(rows, { onConflict: 'user_id,item_type,item_id' });

  if (error) throw error;

  await db.progress.bulkPut(unsynced.map((p) => ({ ...p, syncedAt: now })));
}

/**
 * Claim any rows left from before per-user scoping existed (Dexie v1) by
 * uploading them to Supabase under the current user, then dropping the
 * legacy marker rows. This preserves device-only progress for the user who
 * first logs in after the fix lands.
 */
export async function claimLegacyProgress(userId: string): Promise<void> {
  const legacy = await db.progress
    .where('userId')
    .equals(LEGACY_PROGRESS_USER_ID)
    .toArray();
  if (!legacy.length) return;

  const now = new Date().toISOString();
  const rows = legacy.map((p) => ({
    user_id: userId,
    item_type: p.itemType,
    item_id: p.itemId,
    level: p.level,
    xp: p.xp,
    next_review: p.nextReview,
    updated_at: now,
  }));

  const { error } = await supabase
    .from('progress')
    .upsert(rows, { onConflict: 'user_id,item_type,item_id' });

  if (error) throw error;

  await db.progress.where('userId').equals(LEGACY_PROGRESS_USER_ID).delete();
}

export async function syncProgressDown(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  if (!data?.length) return;

  const local = await db.progress.where('userId').equals(userId).toArray();
  const localMap = new Map(local.map((p) => [`${p.itemType}:${p.itemId}`, p]));

  const now = new Date().toISOString();
  const merged: LocalProgress[] = data.map((row) => {
    const key = `${row.item_type}:${row.item_id}`;
    const localP = localMap.get(key);

    if (!localP) {
      return {
        userId,
        itemType: row.item_type,
        itemId: row.item_id,
        level: row.level,
        xp: row.xp,
        nextReview: row.next_review,
        syncedAt: now,
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
      userId,
      itemType: row.item_type,
      itemId: row.item_id,
      level: Math.max(localP.level, row.level),
      xp: Math.max(localP.xp, row.xp),
      nextReview,
      syncedAt: now,
    };
  });

  await db.progress.bulkPut(merged);
}
