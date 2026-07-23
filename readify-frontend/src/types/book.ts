export interface BookReviewEntry {
  id: string;
  reviewerName: string;
  reviewerAvatarUrl?: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface SimilarBook {
  id: string;
  title: string;
  coverColor?: string;
  coverUrl?: string;
}

export interface BookDetail {
  id: string;
  title: string;
  author: string;
  genre: string;
  coverColor?: string;
  coverUrl?: string;
  averageRating: number;
  pageCount: number;
  publishedYear: number;
  recommendationReason: string;
  matchPercent: number;
  description: string;
  reviews: BookReviewEntry[];
  similarBooks: SimilarBook[];
}