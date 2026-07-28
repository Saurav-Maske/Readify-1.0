import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UsersIcon } from '../icons';
import { Avatar } from '../ui/Avatar';
import type { SuggestedReader } from '../../types/feed';

interface ReadersToFollowCardProps {
  readers: SuggestedReader[];
  /** Called after the optimistic UI update. Throw/reject to roll the toggle back. */
  onToggleFollow?: (reader: SuggestedReader) => Promise<void> | void;
}

export function ReadersToFollowCard({ readers: initialReaders, onToggleFollow }: ReadersToFollowCardProps) {
  const [readers, setReaders] = useState(initialReaders);

  const toggleFollow = async (id: string) => {
    const target = readers.find((reader) => reader.id === id);
    if (!target) return;

    setReaders((current) =>
      current.map((reader) => (reader.id === id ? { ...reader, isFollowing: !reader.isFollowing } : reader))
    );

    try {
      await onToggleFollow?.(target);
    } catch {
      setReaders((current) =>
        current.map((reader) => (reader.id === id ? { ...reader, isFollowing: target.isFollowing } : reader))
      );
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-card dark:bg-card-dark p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text dark:text-text-dark">
        <UsersIcon className="h-4 w-4 text-primary" />
        Readers to Follow
      </div>

      <ul className="space-y-3">
        {readers.map((reader) => (
          <li key={reader.id} className="flex items-center gap-3">
            <Link to={`/profile/${reader.username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={reader.name} src={reader.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text dark:text-text-dark hover:underline">{reader.name}</p>
                <p className="truncate text-xs text-textSecondary dark:text-textSecondary-dark">{reader.reviewCount} reviews</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => toggleFollow(reader.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-150 ${
                reader.isFollowing
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-textSecondary dark:text-textSecondary-dark'
                  : 'border-primary text-primary hover:bg-secondary/10'
              }`}
            >
              {reader.isFollowing ? 'Following' : 'Follow'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}