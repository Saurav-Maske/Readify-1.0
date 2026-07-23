import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { StarRating } from '../ui/StarRating';
import { InfoTooltip } from '../ui/InfoTooltip';
import { lookupAuthorByTitle } from '../../lib/bookLookup';
import type { CreateEntryPayload, PostVisibility } from '../../types/feed';

interface NewEntryModalProps {
  onClose: () => void;
  onSubmit: (payload: CreateEntryPayload) => Promise<void>;
}

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'only_me', label: 'Only me' },
];

export function NewEntryModal({ onClose, onSubmit }: NewEntryModalProps) {
  const [isReview, setIsReview] = useState(true);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [authorWasAutoFilled, setAuthorWasAutoFilled] = useState(false);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTitleChange = (value: string) => {
    setBookTitle(value);

    const match = lookupAuthorByTitle(value);
    if (match) {
      setBookAuthor(match.author);
      setAuthorWasAutoFilled(true);
    } else if (authorWasAutoFilled) {
      setBookAuthor('');
      setAuthorWasAutoFilled(false);
    }
  };

  const handleAuthorChange = (value: string) => {
    setBookAuthor(value);
    setAuthorWasAutoFilled(false);
  };

  const handleToggleMode = () => {
    setIsReview((current) => {
      const next = !current;
      if (next) setVisibility('public');
      return next;
    });
  };

  const isValid = Boolean(bookTitle.trim() && bookAuthor.trim() && rating > 0 && content.trim());

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        isReview,
        bookTitle: bookTitle.trim(),
        bookAuthor: bookAuthor.trim(),
        rating,
        content: content.trim(),
        visibility: isReview ? 'public' : visibility,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="New post" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isReview}
            onClick={handleToggleMode}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm transition-colors duration-200 ${
              isReview ? 'bg-primary text-white' : 'bg-gray-200 text-textSecondary'
            }`}
          >
            {isReview ? 'Review' : 'Post'}
          </button>

          {isReview && (
            <div className="flex items-center gap-1.5 text-xs text-textSecondary">
              <span>Review will be posted publicly</span>
              <InfoTooltip message="Review will be posted publicly" />
            </div>
          )}
        </div>

        <Input
          label="Book title"
          placeholder="e.g. Fourth Wing"
          value={bookTitle}
          onChange={(event) => handleTitleChange(event.target.value)}
        />
        <Input
          label="Author"
          placeholder="Auto-filled from title, or type your own"
          value={bookAuthor}
          onChange={(event) => handleAuthorChange(event.target.value)}
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-text">Your rating</p>
          <StarRating value={rating} onChange={setRating} size="md" />
        </div>

        <Textarea
          label={isReview ? 'Your review' : "What's on your mind?"}
          placeholder={isReview ? 'What did you think?' : "What's on your mind?"}
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        {!isReview && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-background px-4 py-3">
            <span className="text-xs font-medium text-textSecondary">Visibility</span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as PostVisibility)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-text"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose} className="w-auto">
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} isLoading={isSubmitting} disabled={!isValid} className="w-auto">
          {isReview ? 'Publish review' : 'Post'}
        </Button>
      </div>
    </Modal>
  );
}