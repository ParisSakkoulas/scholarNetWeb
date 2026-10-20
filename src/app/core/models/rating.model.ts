export type RatingTarget = 'publication';

export interface RatingSummary {
  /** 0 when nobody has rated yet. */
  average: number;
  count: number;
  /** The signed-in user's own rating, or null. */
  mine: number | null;
}
