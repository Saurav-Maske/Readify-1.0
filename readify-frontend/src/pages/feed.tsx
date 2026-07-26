import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FeedItemCard } from '../components/feed/FeedItemCard';
import { NewEntryModal } from '../components/feed/NewEntryModal';
import { PlusIcon } from '../components/icons';
import {
  CURRENT_USER,
  MOCK_FEED_ITEMS,
} from '../lib/mockFeedData';
import { addCommentToTree } from '../lib/commentUtils';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import type { CreateEntryPayload, FeedComment, FeedItem } from '../types/feed';

interface FriendQuotePreview {
  id: string;
  authorName: string;
  authorUsername: string;
  content: string;
  likedByMe: boolean;
  likeCount: number;
  sharedAt: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}

export default function Feed() {
  const [items, setItems] = useState<FeedItem[]>(MOCK_FEED_ITEMS);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryModalMode, setEntryModalMode] = useState<'post' | 'review'>('post');
  const [friendQuotes, setFriendQuotes] = useState<FriendQuotePreview[]>([
    {
      id: 'friend-quote-1',
      authorName: 'Maya',
      authorUsername: 'maya.reads',
      content: 'The best stories are the ones that make you want to stay up just a little longer.',
      likedByMe: false,
      likeCount: 14,
      sharedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: 'friend-quote-2',
      authorName: 'Jules',
      authorUsername: 'julesbookclub',
      content: 'Reading changes the shape of your thoughts, and that is rarely a bad thing.',
      likedByMe: true,
      likeCount: 21,
      sharedAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    },
  ]);

  const handleToggleLike = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              likedByMe: !item.likedByMe,
              likeCount: item.likedByMe ? item.likeCount - 1 : item.likeCount + 1,
            }
          : item
      )
    );
  };

  const handleToggleBookmark = (id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, bookmarkedByMe: !item.bookmarkedByMe } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    toast.success('Deleted');
  };

  const handleToggleFriendQuoteLike = (id: string) => {
    setFriendQuotes((current) =>
      current.map((quote) =>
        quote.id === id
          ? {
              ...quote,
              likedByMe: !quote.likedByMe,
              likeCount: quote.likedByMe ? quote.likeCount - 1 : quote.likeCount + 1,
            }
          : quote
      )
    );
  };

  const handleAddComment = (itemId: string, parentCommentId: string | null, content: string) => {
    const newComment: FeedComment = {
      id: `comment-${Date.now()}`,
      author: { id: CURRENT_USER.id, name: CURRENT_USER.name, username: CURRENT_USER.name.toLowerCase() },
      content,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, comments: addCommentToTree(item.comments, parentCommentId, newComment) }
          : item
      )
    );
  };

  const handleCreateEntry = async (payload: CreateEntryPayload) => {
    const author = { id: CURRENT_USER.id, name: CURRENT_USER.name, username: CURRENT_USER.name.toLowerCase() };
    const book = {
      id: `book-${Date.now()}`,
      title: payload.bookTitle,
      author: payload.bookAuthor,
      rating: payload.rating,
    };
    const base = {
      id: `${payload.isReview ? 'review' : 'post'}-${Date.now()}`,
      author,
      content: payload.content,
      createdAt: new Date().toISOString(),
      visibility: payload.visibility,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      likedByMe: false,
      bookmarkedByMe: false,
      repostedByMe: false,
      comments: [] as FeedComment[],
    };

    const newItem: FeedItem = payload.isReview
      ? { ...base, type: 'review', book }
      : { ...base, type: 'post' };

    setItems((current) => [newItem, ...current]);
    toast.success(payload.isReview ? 'Review published!' : 'Posted!');
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark">
            {getGreeting()}, {CURRENT_USER.name}
          </h1>
          <p className="mt-1 text-sm text-textSecondary dark:text-textSecondary-dark">Here's what your reading community is sharing</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setEntryModalMode('post');
              setIsEntryModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary/90"
          >
            <PlusIcon className="h-4 w-4" />
            New Post
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryModalMode('review');
              setIsEntryModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-colors duration-150 hover:bg-primary/5 dark:bg-gray-900"
          >
            <PlusIcon className="h-4 w-4" />
            New Review
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-card p-5 shadow-sm dark:border-gray-800 dark:bg-card-dark">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-text dark:text-text-dark">Quotes from friends</h2>
            <p className="text-sm text-textSecondary dark:text-textSecondary-dark">Shared in the last 24 hours</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {friendQuotes.map((quote) => (
            <div key={quote.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-900/70">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-text dark:text-text-dark">{quote.authorName}</p>
                  <p className="text-xs text-textSecondary dark:text-textSecondary-dark">@{quote.authorUsername}</p>
                </div>
                <span className="text-xs text-textSecondary dark:text-textSecondary-dark">{formatRelativeTime(quote.sharedAt)}</span>
              </div>
              <p className="mt-2 text-sm italic text-textSecondary dark:text-textSecondary-dark">“{quote.content}”</p>
              <button
                type="button"
                onClick={() => handleToggleFriendQuoteLike(quote.id)}
                className={`mt-3 text-sm font-semibold transition-colors ${quote.likedByMe ? 'text-primary' : 'text-textSecondary hover:text-primary dark:text-textSecondary-dark'}`}
              >
                ♥ {quote.likeCount}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <FeedItemCard
              key={item.id}
              item={item}
              currentUserName={CURRENT_USER.name}
              currentUserId={CURRENT_USER.id}
              onToggleLike={handleToggleLike}
              onToggleBookmark={handleToggleBookmark}
              onAddComment={handleAddComment}
              onDelete={handleDeleteItem}
            />
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-card dark:bg-card-dark p-10 text-center">
            <p className="text-sm font-medium text-text dark:text-text-dark">No posts yet</p>
            <p className="mt-1 text-sm text-textSecondary dark:text-textSecondary-dark">Be the first to share what you're reading.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isEntryModalOpen && (
          <NewEntryModal
            key={`entry-modal-${entryModalMode}`}
            onClose={() => setIsEntryModalOpen(false)}
            onSubmit={handleCreateEntry}
            initialMode={entryModalMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}