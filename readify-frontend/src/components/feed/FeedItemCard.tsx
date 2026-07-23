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
    RepeatIcon,
    SparklesIcon,
    TrashIcon,
} from '../icons';
import { formatRelativeTime } from '../../lib/formatRelativeTime';
import { countComments } from '../../lib/commentUtils';
import type { FeedItem } from '../../types/feed';

interface FeedItemCardProps {
    item: FeedItem;
    currentUserName: string;
    onToggleLike: (id: string) => void;
    onToggleBookmark: (id: string) => void;
    onToggleRepost: (id: string) => void;
    onAddComment: (itemId: string, parentCommentId: string | null, content: string) => void;
    onDelete: (id: string) => void;
}

export function FeedItemCard({
    item,
    currentUserName,
    onToggleLike,
    onToggleBookmark,
    onToggleRepost,
    onAddComment,
    onDelete,
}: FeedItemCardProps) {
    const [showComments, setShowComments] = useState(false);
    const totalComments = countComments(item.comments);

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-gray-100 bg-card p-5 shadow-sm"
        >
            <div className="flex items-start gap-3">
                <Link to={`/users?id=${item.author.id}`}>
                    <Avatar name={item.author.name} src={item.author.avatarUrl} />
                </Link>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-x-2">
                            <Link to={`/users?id=${item.author.id}`} className="font-semibold text-text hover:underline">
                                {item.author.name}
                            </Link>
                            <Link to={`/users?id=${item.author.id}`} className="text-sm text-textSecondary hover:underline">
                                @{item.author.username}
                            </Link>
                            {item.type === 'review' && item.isAiPick && (
                                <span className="flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                    <SparklesIcon className="h-3 w-3" />
                                    AI Pick
                                </span>
                            )}
                            {item.visibility === 'private' && (
                                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-textSecondary">
                                    <LockIcon className="h-3 w-3" />
                                    Private
                                </span>
                            )}
                            {item.visibility === 'only_me' && (
                                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-textSecondary">
                                    <EyeOffIcon className="h-3 w-3" />
                                    Only me
                                </span>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-textSecondary">{formatRelativeTime(item.createdAt)}</span>

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
                        </div>
                    </div>

                    {item.book && (
                        <Link
                            to={`/books?id=${item.book.id}`}
                            className="mt-3 flex items-center gap-3 rounded-xl bg-background p-3 transition-colors duration-150 hover:bg-gray-100"
                        >
                            {item.book.coverUrl ? (
                                <img
                                    src={item.book.coverUrl}
                                    alt={item.book.title}
                                    className="h-16 w-11 shrink-0 rounded-md object-cover"
                                />
                            ) : (
                                <div
                                    className="flex h-16 w-11 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white"
                                    style={{ backgroundColor: item.book.coverColor ?? '#5B5CEB' }}
                                >
                                    {item.book.title.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text">{item.book.title}</p>
                                <p className="truncate text-xs text-textSecondary">{item.book.author}</p>
                                <div className="mt-1">
                                    <StarRating value={item.book.rating} />
                                </div>
                            </div>
                        </Link>
                    )}

                    <p className="mt-3 whitespace-pre-wrap text-sm text-text">{item.content}</p>

                    <div className="mt-4 flex items-center gap-6 text-textSecondary">
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
                            onClick={() => onToggleRepost(item.id)}
                            whileTap={{ scale: 1.25 }}
                            className={`flex items-center gap-1.5 text-sm transition-colors duration-150 ${item.repostedByMe ? 'text-emerald-600' : 'hover:text-emerald-600'
                                }`}
                        >
                            <RepeatIcon className="h-5 w-5" />
                            {item.repostCount}
                        </motion.button>

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