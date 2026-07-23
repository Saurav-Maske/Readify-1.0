export interface FeedAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface ReviewedBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  coverColor?: string;
  rating: number;
}

export interface FeedComment {
  id: string;
  author: FeedAuthor;
  content: string;
  createdAt: string;
  replies: FeedComment[];
}

export type PostVisibility = 'public' | 'private' | 'only_me';

export interface FeedReview {
  id: string;
  type: 'review';
  author: FeedAuthor;
  book: ReviewedBook;
  content: string;
  createdAt: string;
  isAiPick?: boolean;
  visibility: PostVisibility;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  repostedByMe: boolean;
  comments: FeedComment[];
}

export interface FeedTextPost {
  id: string;
  type: 'post';
  author: FeedAuthor;
  book?: ReviewedBook;
  content: string;
  createdAt: string;
  visibility: PostVisibility;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  repostedByMe: boolean;
  comments: FeedComment[];
}

export type FeedItem = FeedReview | FeedTextPost;

export interface AiPickSuggestion {
  id: string;
  title: string;
  author: string;
  coverColor?: string;
  reason: string;
}

export interface TrendingBook {
  id: string;
  rank: number;
  title: string;
  author: string;
}

export interface SuggestedReader {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  bookCount: number;
  isFollowing: boolean;
}

export interface CreateEntryPayload {
  isReview: boolean;
  bookTitle: string;
  bookAuthor: string;
  rating: number;
  content: string;
  visibility: PostVisibility;
}