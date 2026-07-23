import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/ui/Avatar';
import { StarRating } from '../components/ui/StarRating';
import { getUserById } from '../lib/mockUserData';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import { ArrowLeftIcon } from '../components/icons';

export default function UserPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('id') ?? '';
  const profile = getUserById(userId);
  const [isFollowing, setIsFollowing] = useState(profile?.isFollowing ?? false);

  if (!profile) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Link to="/feed" className="flex items-center gap-2 text-sm font-medium text-textSecondary hover:text-text">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to feed
          </Link>
          <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-card p-10 text-center">
            <p className="text-sm font-medium text-text">We don't have this profile yet</p>
            <p className="mt-1 text-sm text-textSecondary">It may not exist, or hasn't synced from the backend.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/feed" className="flex items-center gap-2 text-sm font-medium text-textSecondary hover:text-text">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to feed
        </Link>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={profile.name} src={profile.avatarUrl} size="lg" />
              <div>
                <h1 className="text-xl font-bold text-text">{profile.name}</h1>
                <p className="text-sm text-textSecondary">@{profile.username}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFollowing((following) => !following)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                isFollowing
                  ? 'border-gray-200 bg-gray-100 text-textSecondary'
                  : 'border-primary text-primary hover:bg-secondary/10'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>

          <p className="mt-4 text-sm text-text">{profile.bio}</p>

          <div className="mt-4 flex gap-6 border-t border-gray-100 pt-4 text-sm">
            <div>
              <span className="font-semibold text-text">{profile.bookCount}</span>{' '}
              <span className="text-textSecondary">books</span>
            </div>
            <div>
              <span className="font-semibold text-text">{profile.followerCount}</span>{' '}
              <span className="text-textSecondary">followers</span>
            </div>
            <div>
              <span className="font-semibold text-text">{profile.followingCount}</span>{' '}
              <span className="text-textSecondary">following</span>
            </div>
          </div>
        </div>

        <h2 className="mt-6 text-lg font-bold text-text">Reviews</h2>
        <div className="mt-3 space-y-3">
          {profile.reviews.length === 0 && (
            <p className="text-sm text-textSecondary">No reviews from {profile.name} yet.</p>
          )}
          {profile.reviews.map((review) => (
            <Link
              key={review.id}
              to={`/books?id=${review.bookId}`}
              className="block rounded-2xl border border-gray-100 bg-card p-4 shadow-sm transition-colors duration-150 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white"
                  style={{ backgroundColor: review.coverColor ?? '#5B5CEB' }}
                >
                  {review.bookTitle.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-text">{review.bookTitle}</p>
                    <span className="text-xs text-textSecondary">{formatRelativeTime(review.createdAt)}</span>
                  </div>
                  <p className="truncate text-xs text-textSecondary">{review.bookAuthor}</p>
                  <div className="mt-1">
                    <StarRating value={review.rating} />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm text-text">{review.content}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}