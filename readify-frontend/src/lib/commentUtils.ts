import type { FeedComment } from '../types/feed';

export function countComments(comments: FeedComment[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}

export function addCommentToTree(
  comments: FeedComment[],
  parentCommentId: string | null,
  newComment: FeedComment
): FeedComment[] {
  if (parentCommentId === null) {
    return [...comments, newComment];
  }

  return comments.map((comment) => {
    if (comment.id === parentCommentId) {
      return { ...comment, replies: [...comment.replies, newComment] };
    }
    if (comment.replies.length > 0) {
      return { ...comment, replies: addCommentToTree(comment.replies, parentCommentId, newComment) };
    }
    return comment;
  });
}

export function removeCommentFromTree(comments: FeedComment[], commentId: string): FeedComment[] {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({ ...comment, replies: removeCommentFromTree(comment.replies, commentId) }));
}