import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { formatRelativeTime } from '../../lib/formatRelativeTime';
import type { FeedComment } from '../../types/feed';

interface CommentThreadProps {
  comment: FeedComment;
  onReply: (parentCommentId: string, content: string) => void;
  depth?: number;
}

export function CommentThread({ comment, onReply, depth = 0 }: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleSubmitReply = () => {
    const trimmed = replyContent.trim();
    if (!trimmed) return;
    onReply(comment.id, trimmed);
    setReplyContent('');
    setIsReplying(false);
  };

  return (
    <div className={depth > 0 ? 'ml-8 mt-3 border-l border-gray-100 pl-4' : 'mt-3'}>
      <div className="flex items-start gap-2.5">
        <Avatar name={comment.author.name} src={comment.author.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-background px-3 py-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-semibold text-text">{comment.author.name}</span>
              <span className="text-xs text-textSecondary">{formatRelativeTime(comment.createdAt)}</span>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-text">{comment.content}</p>
          </div>

          <button
            type="button"
            onClick={() => setIsReplying((open) => !open)}
            className="mt-1 px-3 text-xs font-semibold text-textSecondary transition-colors duration-150 hover:text-primary"
          >
            Reply
          </button>

          {isReplying && (
            <div className="mt-2 flex items-center gap-2 px-1">
              <input
                autoFocus
                type="text"
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSubmitReply();
                }}
                placeholder={`Reply to ${comment.author.name}...`}
                className="w-full rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-text placeholder:text-textSecondary/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={handleSubmitReply}
                disabled={!replyContent.trim()}
                className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                Reply
              </button>
            </div>
          )}

          {comment.replies.map((reply) => (
            <CommentThread key={reply.id} comment={reply} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}