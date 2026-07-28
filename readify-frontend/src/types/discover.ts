export interface DiscoverRecommendation {
  bookId: number;
  rank: number;
  title: string;
  author: string;
  genre?: string;
  coverImage: string | null;
  rating?: number;
  noOfRatings?: number;
  reason: string;
  generatedAt: string;
}