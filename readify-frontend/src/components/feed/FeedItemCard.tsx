import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { StarRating } from '../ui/StarRating';
import { DropdownMenu } from '../ui/DropdownMenu';
import { CommentSection } from './CommentSection';
import {
    BookmarkIcon,
    CommentIcon,
    EyeOffIcon,
    HeartIcon,
    LockIcon,
    MoreHorizontalIcon,
    SparklesIcon,
    TrashIcon,
} from '../icons';
import { formatRelativeTime } from '../../lib/formatRelativeTime';
import { countComments } from '../../lib/commentUtils';
import type { FeedItem } from '../../types/feed';

interface FeedItemCardProps {
    item: FeedItem;
    currentUserName: string;
    currentUserId?: string;
    onToggleLike: (id: string) => void;
    onToggleBookmark: (id: string) => void;
    onAddComment: (itemId: string, parentCommentId: string | null, content: string) => void;
    onDelete: (id: string) => void;
    canDelete?: boolean;
}

export function FeedItemCard({
    item,
    currentUserName,
    currentUserId,
    onToggleLike,
    onToggleBookmark,
    onAddComment,
    onDelete,
    canDelete = true,
}: FeedItemCardProps) {
    const [showComments, setShowComments] = useState(false);
    const totalComments = countComments(item.comments);
    const isOwnPost = currentUserId ? currentUserId === item.author.id : false;

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-card dark:bg-card-dark p-5 shadow-sm"
        >
            <div className="flex items-start gap-3">
                <Link to={`/users?id=${item.author.id}`}>
                    <Avatar name={item.author.name} src={item.author.avatarUrl} />
                </Link>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-x-2">
                            <Link to={`/users?id=${item.author.id}`} className="font-semibold text-text dark:text-text-dark hover:underline">
                                {item.author.name}
                            </Link>
                            <Link to={`/users?id=${item.author.id}`} className="text-sm text-textSecondary dark:text-textSecondary-dark hover:underline">
                                @{item.author.username}
                            </Link>
                            {item.type === 'review' && item.isAiPick && (
                                <span className="flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                    <SparklesIcon className="h-3 w-3" />
                                    AI Pick
                                </span>
                            )}
                            {item.visibility === 'private' && (
                                <span className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-textSecondary dark:text-textSecondary-dark">
                                    <LockIcon className="h-3 w-3" />
                                    Private
                                </span>
                            )}
                            {item.visibility === 'only_me' && (
                                <span className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-textSecondary dark:text-textSecondary-dark">
                                    <EyeOffIcon className="h-3 w-3" />
                                    Only me
                                </span>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-textSecondary dark:text-textSecondary-dark">{formatRelativeTime(item.createdAt)}</span>

                            {canDelete && isOwnPost && (
                                <DropdownMenu trigger={<MoreHorizontalIcon className="h-4 w-4" />}>
                                    {(close) => (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onDelete(item.id);
                                                close();
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                            Delete {item.type === 'review' ? 'review' : 'post'}
                                        </button>
                                    )}
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                    {item.book && (
                        <div className="mt-4 rounded-2xl border border-gray-100 bg-background/80 p-4 dark:border-gray-800 dark:bg-background-dark/70">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <Link to={`/books?id=${item.book.id}`} className="shrink-0">
                                        {item.book.coverUrl ? (
                                            <img
                                                src={item.book.coverUrl}
                                                alt={item.book.title}
                                                className="h-16 w-11 rounded-md object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="flex h-16 w-11 items-center justify-center rounded-md text-[10px] font-semibold text-white"
                                                style={{ backgroundColor: item.book.coverColor ?? '#5B5CEB' }}
                                            >
                                                {item.book.title.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </Link>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-text dark:text-text-dark">{item.book.title}</p>
                                        <p className="mt-0.5 truncate text-xs text-textSecondary dark:text-textSecondary-dark">{item.book.author}</p>
                                        <div className="mt-2">
                                            <StarRating value={item.book.rating} />
                                        </div>
                                    </div>
                                </div>

                                {item.type === 'review' && (
                                    <Link
                                        to={`/books?id=${item.book.id}`}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-semibold text-textSecondary transition-colors duration-150 hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-textSecondary-dark dark:hover:border-primary/70 dark:hover:bg-gray-800"
                                        aria-label="Review details"
                                    >
                                        i
                                    </Link>
                                )}
                            </div>

                            {item.type === 'review' && (
                                <div className="mt-3 rounded-xl bg-white/70 p-3 dark:bg-gray-900/50">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary dark:text-textSecondary-dark">Your rating</p>
                                            <p className="mt-1 text-sm font-medium text-text dark:text-text-dark">Tap the stars to rate this book</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className={`h-5 w-5 rounded-full transition-colors duration-150 ${star <= item.book.rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-500'}`}
                                                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                                >
                                                    <svg viewBox="0 0 24 24" className="h-full w-full fill-current" aria-hidden="true">
                                                        <path d="M12 2.75l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47-5.8-3.05-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.75z" />
                                                    </svg>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <p className="mt-3 whitespace-pre-wrap text-sm text-text dark:text-text-dark">{item.content}</p>

                    <div className="mt-4 flex items-center gap-6 text-textSecondary dark:text-textSecondary-dark">
                        <motion.button
                            type="button"
                            onClick={() => onToggleLike(item.id)}
                            whileTap={{ scale: 1.25 }}
                            className={`flex items-center gap-1.5 text-sm transition-colors duration-150 ${item.likedByMe ? 'text-primary' : 'hover:text-primary'
                                }`}
                        >
                            <HeartIcon filled={item.likedByMe} className="h-5 w-5" />
                            {item.likeCount}
                        </motion.button>

                        <button
                            type="button"
                            onClick={() => setShowComments((open) => !open)}
                            className={`flex items-center gap-1.5 text-sm transition-colors duration-150 ${showComments ? 'text-primary' : 'hover:text-primary'
                                }`}
                        >
                            <CommentIcon className="h-5 w-5" />
                            {totalComments}
                        </button>

                        <motion.button
                            type="button"
                            onClick={() => onToggleBookmark(item.id)}
                            whileTap={{ scale: 1.25 }}
                            aria-label="Bookmark"
                            className={`ml-auto transition-colors duration-150 ${item.bookmarkedByMe ? 'text-primary' : 'hover:text-primary'
                                }`}
                        >
                            <BookmarkIcon filled={item.bookmarkedByMe} className="h-5 w-5" />
                        </motion.button>
                    </div>

                    {showComments && (
                        <CommentSection
                            comments={item.comments}
                            currentUserName={currentUserName}
                            onAddComment={(parentCommentId, content) => onAddComment(item.id, parentCommentId, content)}
                        />
                    )}
                </div>
            </div>
        </motion.article>
    );
}