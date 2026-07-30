export interface DiscoverRecommendation {
  bookId: number;
  rank: number;
  title: string;
  author: string;
  genre?: string;
  coverImage: string | null;
  rating?: number;
  noOfRatings?: number;
  /** Short, structured label for the signal behind this pick, e.g. "Reading history match". Not styled as a link/CTA - it's a badge, not the interesting part. */
  reasonLabel: string;
  /** Raw signal slug from the recommendation graph, e.g. "reading_history_match". Kept around for anything (analytics, styling per-type) that wants to key off it. */
  reasonType: string;
  /** The fuller, human sentence explaining the pick, e.g. "Because you've read similar books before". Surfaced on demand (hover/tap the info affordance) rather than shown by default. */
  reasonText: string;
  generatedAt: string;
}