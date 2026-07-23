import type { AiPickSuggestion, FeedComment, FeedItem, SuggestedReader, TrendingBook } from '../types/feed';

export const CURRENT_USER = {
  id: 'me',
  name: 'Alex',
};

const marcus = { id: 'u1', name: 'Marcus Osei', username: 'marcusreads' };
const dev = { id: 'u2', name: 'Dev Sharma', username: 'devreads' };
const yuna = { id: 'u4', name: 'Yuna Park', username: 'yunap' };

const reviewOneComments: FeedComment[] = [
  {
    id: 'c1',
    author: dev,
    content: "Completely agree — that ending genuinely wrecked me. Didn't see it coming at all.",
    createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    replies: [
      {
        id: 'c1-r1',
        author: marcus,
        content: 'Right?? I had to put the book down for a minute after that chapter.',
        createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
        replies: [],
      },
    ],
  },
  {
    id: 'c2',
    author: yuna,
    content: 'Adding this to my list right now, thanks for the writeup.',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    replies: [],
  },
];

export const MOCK_FEED_ITEMS: FeedItem[] = [
  {
    id: 'review-1',
    type: 'review',
    author: marcus,
    book: {
      id: 'book-ttt',
      title: 'Tomorrow, and Tomorrow, and Tomorrow',
      author: 'Gabrielle Zevin',
      coverColor: '#EF4444',
      rating: 5,
    },
    content:
      "A rare novel about creativity that is itself creative. The dual-timeline structure mirrors the emotional beats of the story perfectly, and the last act genuinely caught me off guard. Easily one of the best things I've read this year.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isAiPick: true,
    visibility: 'public',
    likeCount: 847,
    commentCount: 63,
    repostCount: 42,
    likedByMe: false,
    bookmarkedByMe: false,
    repostedByMe: false,
    comments: reviewOneComments,
  },
  {
    id: 'review-2',
    type: 'review',
    author: dev,
    book: {
      id: 'book-demon-copperhead',
      title: 'Demon Copperhead',
      author: 'Barbara Kingsolver',
      coverColor: '#F59E0B',
      rating: 5,
    },
    content:
      "Kingsolver's command of voice is remarkable — it never once slips out of character. A hard read in places, but the kind of book that changes how you see an entire region and the people in it. Required reading, honestly.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    visibility: 'public',
    likeCount: 2891,
    commentCount: 147,
    repostCount: 203,
    likedByMe: true,
    bookmarkedByMe: true,
    repostedByMe: false,
    comments: [],
  },
  {
    id: 'post-1',
    type: 'post',
    author: yuna,
    content:
      'Currently three books deep into a fantasy binge and I regret nothing. Send me your favorite slow-burn magic systems.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    visibility: 'public',
    likeCount: 58,
    commentCount: 14,
    repostCount: 3,
    likedByMe: false,
    bookmarkedByMe: false,
    repostedByMe: false,
    comments: [],
  },
];

export const MOCK_AI_PICK: AiPickSuggestion = {
  id: 'book-fourth-wing',
  title: 'Fourth Wing',
  author: 'Rebecca Yarros',
  coverColor: '#111827',
  reason: 'Based on your reading DNA and 6 similar readers',
};

export const MOCK_TRENDING_BOOKS: TrendingBook[] = [
  { id: 'book-ttt', rank: 1, title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin' },
  { id: 'book-atlas-six', rank: 2, title: 'The Atlas Six', author: 'Olivie Blake' },
  { id: 'book-lessons-in-chemistry', rank: 3, title: 'Lessons in Chemistry', author: 'Bonnie Garmus' },
  { id: 'book-fourth-wing', rank: 4, title: 'Fourth Wing', author: 'Rebecca Yarros' },
];

export const MOCK_SUGGESTED_READERS: SuggestedReader[] = [
  { id: 'u1', name: 'Marcus Osei', username: 'marcusreads', bookCount: 467, isFollowing: false },
  { id: 'u4', name: 'Yuna Park', username: 'yunap', bookCount: 189, isFollowing: false },
  { id: 'u2', name: 'Dev Sharma', username: 'devreads', bookCount: 523, isFollowing: false },
];