import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { StarRating } from '../ui/StarRating';
import type { CreateEntryPayload, PostVisibility } from '../../types/feed';

interface NewEntryModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateEntryPayload) => Promise<void> | void;
}

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'only_me', label: 'Only me' },
];

function VisibilityOption({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: PostVisibility;
  selected: boolean;
  onSelect: (value: PostVisibility) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`w-full flex items-center justify-start gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-150 ${selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-gray-200 bg-white text-textSecondary hover:border-primary/40 hover:text-primary'
        }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary' : 'border-gray-300 bg-transparent'}`}>
        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  );
}

export function NewEntryModal({ isOpen = true, onClose, onSubmit }: NewEntryModalProps) {
  const [isReview, setIsReview] = useState(true);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isValid = Boolean(content.trim() && (!isReview || rating > 0));

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        isReview,
        bookTitle: '',
        bookAuthor: '',
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
      <div className="grid gap-4 md:grid-cols-[0.85fr_1.4fr] items-stretch min-h-[420px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-background p-4 dark:border-gray-800 dark:bg-background-dark">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text dark:text-text-dark">Post type</p>
                <p className="mt-1 text-xs text-textSecondary dark:text-textSecondary-dark">Switch between a review and a normal post.</p>
              </div>
              <div className="flex rounded-full border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => setIsReview(false)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${!isReview ? 'bg-primary text-white' : 'text-textSecondary dark:text-textSecondary-dark'
                    }`}
                >
                  Post
                </button>
                <button
                  type="button"
                  onClick={() => setIsReview(true)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${isReview ? 'bg-primary text-white' : 'text-textSecondary dark:text-textSecondary-dark'
                    }`}
                >
                  Review
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-background p-4 dark:border-gray-800 dark:bg-background-dark">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text dark:text-text-dark">Visibility</p>
                <p className="mt-1 text-xs text-textSecondary dark:text-textSecondary-dark">
                  {isReview ? 'Reviews are always public.' : 'Choose who can see this post.'}
                </p>
              </div>
            </div>

            {isReview ? (
              <div className="mt-3 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Public
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {VISIBILITY_OPTIONS.map((option) => (
                  <VisibilityOption
                    key={option.value}
                    label={option.label}
                    value={option.value}
                    selected={visibility === option.value}
                    onSelect={setVisibility}
                  />
                ))}
              </div>
            )}
          </div>

          {isReview && (
            <div className="min-h-[120px] rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <p className="text-sm font-semibold text-text dark:text-text-dark">Star rating</p>
              <p className="mt-1 text-xs text-textSecondary dark:text-textSecondary-dark">Tap the stars to rate this book.</p>
              <div className="mt-3">
                <StarRating value={rating} onChange={setRating} size="md" />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-background p-4 flex flex-col dark:border-gray-800 dark:bg-background-dark">
          <div className="flex-1 flex flex-col h-full">
            <div className="rounded-2xl border border-gray-100 bg-background p-4 flex flex-col h-full dark:border-gray-800 dark:bg-background-dark">
              <Textarea
                label={isReview ? 'Your review' : "What's on your mind?"}
                placeholder={isReview ? 'What did you think?' : "What's on your mind?"}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="h-full"
              />
            </div>
            <div className="mt-3" />
          </div>
        </div>
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