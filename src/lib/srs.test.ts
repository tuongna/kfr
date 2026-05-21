import { describe, it, expect } from 'vitest';
import {
  improveProgress,
  canPractice,
  getBadge,
  getTotalXP,
  getLevelCounts,
  shuffleByIndex,
  XPS,
  XPS_INCENTIVE,
  SRS_INTERVALS,
  MAX_LEVEL,
} from './srs';

describe('improveProgress', () => {
  it('starts new item at level 0 on first correct answer', () => {
    const p = improveProgress(undefined, 'term', 'x', false);
    expect(p.level).toBe(0);
    expect(p.xp).toBe(XPS[0]);
    expect(p.nextReview).not.toBeNull();
  });

  it('increments level on correct answer', () => {
    const base = { itemType: 'term' as const, itemId: 'x', level: 0, xp: 10, nextReview: null };
    const p = improveProgress(base, 'term', 'x', false);
    expect(p.level).toBe(1);
    expect(p.xp).toBe(10 + XPS[1]);
  });

  it('caps level at MAX_LEVEL', () => {
    const base = {
      itemType: 'term' as const,
      itemId: 'x',
      level: MAX_LEVEL,
      xp: 440,
      nextReview: null,
    };
    const p = improveProgress(base, 'term', 'x', false);
    expect(p.level).toBe(MAX_LEVEL);
  });

  it('does not change level on wrong answer, adds incentive XP', () => {
    const base = { itemType: 'term' as const, itemId: 'x', level: 1, xp: 40, nextReview: null };
    const p = improveProgress(base, 'term', 'x', true);
    expect(p.level).toBe(1);
    expect(p.xp).toBe(40 + XPS_INCENTIVE);
    expect(p.nextReview).not.toBeNull();
  });

  it('sets nextReview in the future on correct answer', () => {
    const p = improveProgress(undefined, 'term', 'x', false);
    expect(new Date(p.nextReview!).getTime()).toBeGreaterThan(Date.now());
  });

  it('sets retry nextReview interval on wrong answer', () => {
    const p = improveProgress(undefined, 'term', 'x', true);
    const reviewMs = new Date(p.nextReview!).getTime();
    const drift = 2000;
    expect(reviewMs).toBeGreaterThan(Date.now() + SRS_INTERVALS[0] / 4 - drift);
  });
});

describe('canPractice', () => {
  it('returns true for undefined progress (new item)', () => {
    expect(canPractice(undefined)).toBe(true);
  });

  it('returns true when nextReview is null', () => {
    expect(canPractice({ itemType: 'term', itemId: 'x', level: 0, xp: 10, nextReview: null })).toBe(
      true
    );
  });

  it('returns false when nextReview is in the future', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    expect(canPractice({ itemType: 'term', itemId: 'x', level: 0, xp: 10, nextReview: future })).toBe(
      false
    );
  });

  it('returns true when nextReview has passed', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(canPractice({ itemType: 'term', itemId: 'x', level: 0, xp: 10, nextReview: past })).toBe(
      true
    );
  });
});

describe('getBadge', () => {
  it('returns empty string for level -1', () => {
    expect(getBadge(-1)).toBe('');
  });

  it('returns single badge for level 0', () => {
    expect(getBadge(0)).toBe('🥉');
  });

  it('returns cumulative badges', () => {
    expect(getBadge(2)).toBe('🥉🥈🥇');
  });
});

describe('getTotalXP', () => {
  it('sums xp from all progresses', () => {
    const ps = [
      { itemType: 'term' as const, itemId: 'a', level: 0, xp: 10, nextReview: null },
      { itemType: 'term' as const, itemId: 'b', level: 1, xp: 40, nextReview: null },
    ];
    expect(getTotalXP(ps)).toBe(50);
  });

  it('returns 0 for empty list', () => {
    expect(getTotalXP([])).toBe(0);
  });
});

describe('getLevelCounts', () => {
  it('counts items per minimum level', () => {
    const ps = [
      { itemType: 'term' as const, itemId: 'a', level: 2, xp: 0, nextReview: null },
      { itemType: 'term' as const, itemId: 'b', level: 0, xp: 0, nextReview: null },
    ];
    const counts = getLevelCounts(ps);
    expect(counts[0]).toBe(2); // both >= 0
    expect(counts[1]).toBe(1); // only 'a' >= 1
    expect(counts[2]).toBe(1); // only 'a' >= 2
    expect(counts[3]).toBe(0);
  });
});

describe('shuffleByIndex', () => {
  it('returns same length array', () => {
    const arr = [1, 2, 3, 4];
    expect(shuffleByIndex(arr, 0)).toHaveLength(4);
  });

  it('contains all original elements', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const result = shuffleByIndex(arr, 5);
    expect(result.sort()).toEqual(arr.sort());
  });

  it('is deterministic for same seed', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffleByIndex(arr, 7)).toEqual(shuffleByIndex(arr, 7));
  });

  it('produces different order for different seeds (usually)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const r1 = shuffleByIndex(arr, 1);
    const r2 = shuffleByIndex(arr, 2);
    expect(r1).not.toEqual(r2);
  });
});
