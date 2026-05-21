import type { LocalProgress } from './types';

const DAY = 24 * 60 * 60 * 1000;

export const SRS_INTERVALS = [DAY, 3 * DAY, 10 * DAY, 30 * DAY];
export const SRS_RETRY = DAY / 4;
export const XPS = [10, 30, 100, 300];
export const XPS_INCENTIVE = 2;
export const BADGES = ['🥉', '🥈', '🥇', '🏆', '💎'];
export const MAX_LEVEL = SRS_INTERVALS.length - 1;

export function canPractice(progress: LocalProgress | undefined): boolean {
  if (!progress) return true;
  if (!progress.nextReview) return true;
  return Date.now() >= new Date(progress.nextReview).getTime();
}

export function improveProgress(
  current: LocalProgress | undefined,
  itemType: 'term' | 'question',
  itemId: string,
  wrong: boolean
): LocalProgress {
  const base = current ?? { itemType, itemId, level: -1, xp: 0, nextReview: null };

  if (wrong) {
    return {
      ...base,
      xp: base.xp + XPS_INCENTIVE,
      nextReview: new Date(Date.now() + SRS_RETRY).toISOString(),
    };
  }

  if (base.level < MAX_LEVEL) {
    const newLevel = base.level + 1;
    return {
      ...base,
      level: newLevel,
      xp: base.xp + XPS[newLevel],
      nextReview: new Date(Date.now() + SRS_INTERVALS[newLevel]).toISOString(),
    };
  }

  return base;
}

export function getBadge(level: number): string {
  if (level < 0) return '';
  return BADGES.slice(0, level + 1).join('');
}

export function getTotalXP(progresses: LocalProgress[]): number {
  return progresses.reduce((sum, p) => sum + p.xp, 0);
}

export function getLevelCounts(progresses: LocalProgress[]): number[] {
  return BADGES.map((_, i) => progresses.filter((p) => p.level >= i).length);
}

/** Shuffle array with deterministic seed (index-based). */
export function shuffleByIndex<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed * 9973;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
