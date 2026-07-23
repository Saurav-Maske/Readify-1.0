import type { UserProfile } from '../types/user';

const USER_PROFILES: Record<string, UserProfile> = {
  u1: {
    id: 'u1',
    name: 'Marcus Osei',
    username: 'marcusreads',
    bio: 'Literary fiction and dark academia. Currently on a Zevin kick.',
    bookCount: 467,
    followerCount: 1284,
    followingCount: 312,
    isFollowing: false,
    reviews: [
      {
        id: 'ur1',
        bookId: 'book-ttt',
        bookTitle: 'Tomorrow, and Tomorrow, and Tomorrow',
        bookAuthor: 'Gabrielle Zevin',
        coverColor: '#EF4444',
        rating: 5,
        content:
          "Absolutely stunning. Zevin crafts something rare — a novel about creativity that IS creative.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
    ],
  },
  u2: {
    id: 'u2',
    name: 'Dev Sharma',
    username: 'devreads',
    bio: 'Historical fiction enjoyer. I read on the train and cry in public, unbothered.',
    bookCount: 523,
    followerCount: 2110,
    followingCount: 198,
    isFollowing: false,
    reviews: [
      {
        id: 'ur2',
        bookId: 'book-demon-copperhead',
        bookTitle: 'Demon Copperhead',
        bookAuthor: 'Barbara Kingsolver',
        coverColor: '#F59E0B',
        rating: 5,
        content:
          "Kingsolver's command of voice is remarkable — it never once slips out of character.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
    ],
  },
  u4: {
    id: 'u4',
    name: 'Yuna Park',
    username: 'yunap',
    bio: 'Fantasy binge-reader. Send me slow-burn magic systems, always taking recs.',
    bookCount: 189,
    followerCount: 640,
    followingCount: 455,
    isFollowing: false,
    reviews: [],
  },
  me: {
    id: 'me',
    name: 'Alex',
    username: 'alex',
    bio: 'Building my shelf one recommendation at a time.',
    bookCount: 42,
    followerCount: 18,
    followingCount: 56,
    isFollowing: false,
    reviews: [],
  },
};

export function getUserById(id: string): UserProfile | null {
  return USER_PROFILES[id] ?? null;
}