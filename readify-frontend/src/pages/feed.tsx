import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/feed/Sidebar';
import { FeedItemCard } from '../components/feed/FeedItemCard';
import { AiPickCard } from '../components/feed/AiPickCard';
import { TrendingCard } from '../components/feed/TrendingCard';
import { ReadersToFollowCard } from '../components/feed/ReadersToFollowCard';
import { NewEntryModal } from '../components/feed/NewEntryModal';
import { PlusIcon } from '../components/icons';
import {
  CURRENT_USER,
  MOCK_AI_PICK,
  MOCK_FEED_ITEMS,
  MOCK_SUGGESTED_READERS,
  MOCK_TRENDING_BOOKS,
} from '../lib/mockFeedData';
import { addCommentToTree } from '../lib/commentUtils';
import type { CreateEntryPayload, FeedComment, FeedItem } from '../types/feed';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Feed() {
  const [items, setItems] = useState<FeedItem[]>(MOCK_FEED_ITEMS);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

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

  const handleToggleRepost = (id: string) => {
    const target = items.find((item) => item.id === id);
    if (target) {
      toast.success(target.repostedByMe ? 'Repost removed' : 'Reposted to your followers');
    }

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              repostedByMe: !item.repostedByMe,
              repostCount: item.repostedByMe ? item.repostCount - 1 : item.repostCount + 1,
            }
          : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    toast.success('Deleted');
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
    book,
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

  const newItem: FeedItem = payload.isReview ? { ...base, type: 'review' } : { ...base, type: 'post' };

  setItems((current) => [newItem, ...current]);
  toast.success(payload.isReview ? 'Review published!' : 'Posted!');
};
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">
              {getGreeting()}, {CURRENT_USER.name}
            </h1>
            <p className="mt-1 text-sm text-textSecondary">Here's what your reading community is sharing</p>
          </div>

          <button
            type="button"
            onClick={() => setIsEntryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary/90"
          >
            <PlusIcon className="h-4 w-4" />
            New Post
          </button>
        </div>

        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <FeedItemCard
                key={item.id}
                item={item}
                currentUserName={CURRENT_USER.name}
                onToggleLike={handleToggleLike}
                onToggleBookmark={handleToggleBookmark}
                onToggleRepost={handleToggleRepost}
                onAddComment={handleAddComment}
                onDelete={handleDeleteItem}
              />
            ))}
          </AnimatePresence>

          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-card p-10 text-center">
              <p className="text-sm font-medium text-text">No posts yet</p>
              <p className="mt-1 text-sm text-textSecondary">Be the first to share what you're reading.</p>
            </div>
          )}
        </div>
      </main>

      <aside className="sticky top-0 hidden h-screen w-80 shrink-0 space-y-4 overflow-y-auto border-l border-gray-100 px-4 py-8 xl:block">
        <AiPickCard pick={MOCK_AI_PICK} />
        <TrendingCard books={MOCK_TRENDING_BOOKS} />
        <ReadersToFollowCard readers={MOCK_SUGGESTED_READERS} />
      </aside>

      <AnimatePresence>
        {isEntryModalOpen && (
          <NewEntryModal key="entry-modal" onClose={() => setIsEntryModalOpen(false)} onSubmit={handleCreateEntry} />
        )}
      </AnimatePresence>
    </div>
  );
}