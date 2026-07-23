import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { CommentThread } from './CommentThread';
import type { FeedComment } from '../../types/feed';

interface CommentSectionProps {
  comments: FeedComment[];
  currentUserName: string;
  onAddComment: (parentCommentId: string | null, content: string) => void;
}

export function CommentSection({ comments, currentUserName, onAddComment }: CommentSectionProps) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onAddComment(null, trimmed);
    setContent('');
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center gap-2.5">
        <Avatar name={currentUserName} size="sm" />
        <input
          type="text"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSubmit();
          }}
          placeholder="Write a comment..."
          className="w-full rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-text placeholder:text-textSecondary/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          Post
        </button>
      </div>

      {comments.length === 0 ? (
        <p className="mt-3 text-center text-xs text-textSecondary">No comments yet. Be the first to reply.</p>
      ) : (
        comments.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            onReply={(parentId, replyContent) => onAddComment(parentId, replyContent)}
          />
        ))
      )}
    </div>
  );
}