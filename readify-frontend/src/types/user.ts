export interface UserReviewSummary {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  coverColor?: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  bio: string;
  bookCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  reviews: UserReviewSummary[];
}