import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { FeedItemCard } from '../components/feed/FeedItemCard';
import { NewEntryModal } from '../components/feed/NewEntryModal';
import { PlusIcon } from '../components/icons';
import { Avatar } from '../components/ui/Avatar';
import type { CreateEntryPayload, FeedComment, FeedItem } from '../types/feed';
import apiClient from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? 'http://localhost:4000';

function resolveProfilePicture(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

interface BackendUser {
  userId: number;
  name: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
}

interface ProfileResponse {
  user: BackendUser;
  isOwnProfile: boolean;
  relationship: 'self' | 'friend' | 'stranger';
  followersCount: number;
  followingCount: number;
}

interface BackendPost {
  postId: number;
  caption: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'JUST_ME';
  createdAt: string;
  likeCount: number;
  book: { bookId: number; title: string; author: string } | null;
}

interface BackendQuote {
  quoteId: number;
  quote: string;
  createdAt?: string;
}

interface ProfileQuote {
  id: string;
  quote: string;
  likedByMe: boolean;
  likeCount: number;
}

function toFeedItem(post: BackendPost, profile: BackendUser): FeedItem {
  return {
    id: String(post.postId),
    type: 'post',
    author: {
      id: String(profile.userId),
      name: profile.name,
      username: profile.username,
      avatarUrl: profile.profilePicture ?? undefined,
    },
    book: post.book
      ? { id: String(post.book.bookId), title: post.book.title, author: post.book.author, rating: 0 }
      : undefined,
    content: post.caption,
    createdAt: post.createdAt,
    visibility: post.visibility === 'JUST_ME' ? 'only_me' : (post.visibility.toLowerCase() as 'public' | 'private'),
    likeCount: post.likeCount,
    commentCount: 0,
    repostCount: 0,
    likedByMe: false,
    bookmarkedByMe: false,
    repostedByMe: false,
    comments: [],
  };
}

// ---------------------------------------------------------------------------
// Demo data: shown when the backend is unreachable (network/connection error),
// so the page still renders something meaningful instead of a blank error.
// This is local-only — nothing here is ever persisted to a server.
// Done so that frontend can be viewed and changed without the need of server.
// ---------------------------------------------------------------------------

const DEMO_USER: BackendUser = {
  userId: 0,
  name: 'Jordan Rivera',
  username: 'jordan.reads',
  profilePicture: null,
  bio: 'Fantasy & sci-fi enthusiast 📚 Currently reading through the Cosmere.',
};

const DEMO_PROFILE: ProfileResponse = {
  user: DEMO_USER,
  isOwnProfile: true,
  relationship: 'self',
  followersCount: 128,
  followingCount: 94,
};

const DEMO_POSTS: FeedItem[] = [
  {
    id: 'demo-1',
    type: 'review',
    author: { id: '0', name: DEMO_USER.name, username: DEMO_USER.username, avatarUrl: undefined },
    book: { id: 'demo-book-1', title: 'The Way of Kings', author: 'Brandon Sanderson', rating: 5 },
    content: "An absolute masterclass in worldbuilding. Couldn't put it down.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    visibility: 'public',
    likeCount: 24,
    commentCount: 0,
    repostCount: 2,
    likedByMe: false,
    bookmarkedByMe: false,
    repostedByMe: false,
    comments: [],
  },
  {
    id: 'demo-2',
    type: 'post',
    author: { id: '0', name: DEMO_USER.name, username: DEMO_USER.username, avatarUrl: undefined },
    book: undefined,
    content: 'Starting a new series this weekend, taking recommendations!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    visibility: 'public',
    likeCount: 9,
    commentCount: 0,
    repostCount: 0,
    likedByMe: false,
    bookmarkedByMe: false,
    repostedByMe: false,
    comments: [],
  },
];

const DEMO_QUOTES: string[] = [
  'Life before death, strength before weakness, journey before destination.',
  'It is our choices that show what we truly are, far more than our abilities.',
];

/**
 * True when a request failed because the backend couldn't be reached at all
 * (connection refused, DNS failure, timeout, CORS, etc) — as opposed to a
 * real server response like a 404 "user not found" or a 401.
 */
function isBackendUnreachable(error: unknown): boolean {
  if (isAxiosError(error)) {
    // No response means the request never made it to a server.
    return !error.response;
  }
  return false;
}

export default function ProfilePage() {
  const { username: viewedUsername } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [viewer, setViewer] = useState<BackendUser | null>(null);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryModalMode, setEntryModalMode] = useState<'post' | 'review'>('post');
  const [quotes, setQuotes] = useState<ProfileQuote[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeProfileEditor, setActiveProfileEditor] = useState<'bio' | 'photo' | null>(null);
  const [bioDraft, setBioDraft] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [activeModal, setActiveModal] = useState<'followers' | 'following' | null>(null);

  // Photo editor state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPEG, PNG, WEBP, or GIF images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError('');
      setIsDemoMode(false);
      try {
        const viewerResponse = await apiClient.get<{ user: BackendUser }>('/auth/me');
        const currentViewer = viewerResponse.data.user;
        const username = viewedUsername ?? currentViewer.username;
        const [profileResponse, postsResponse, quotesResponse] = await Promise.all([
          apiClient.get<ProfileResponse>(`/users/${encodeURIComponent(username)}`),
          apiClient.get<{ posts: BackendPost[] }>(`/users/${encodeURIComponent(username)}/posts`, {
            params: { limit: 30, offset: 0 },
          }),
          apiClient.get<{ quotes: BackendQuote[] }>(`/users/${encodeURIComponent(username)}/quotes`, {
            params: { limit: 20 },
          }),
        ]);

        if (!isCurrentRequest) return;
        setViewer(currentViewer);
        setProfile(profileResponse.data);
        setPosts(postsResponse.data.posts.map((post) => toFeedItem(post, profileResponse.data.user)));
        setQuotes(
          quotesResponse.data.quotes.map((quote) => ({
            id: String(quote.quoteId),
            quote: quote.quote,
            likedByMe: false,
            likeCount: 0,
          }))
        );
        setIsFollowing(profileResponse.data.relationship === 'friend');
        setBioDraft(profileResponse.data.user.bio ?? '');
      } catch (error) {
        if (!isCurrentRequest) return;

        if (isBackendUnreachable(error)) {
          // Backend isn't running/reachable — fall back to local demo data
          // instead of showing an error, so the page still demonstrates the UI.
          setViewer(DEMO_USER);
          setProfile(DEMO_PROFILE);
          setPosts(DEMO_POSTS);
          setQuotes(
            DEMO_QUOTES.map((quote, index) => ({
              id: `demo-quote-${index}`,
              quote,
              likedByMe: false,
              likeCount: 0,
            }))
          );
          setIsFollowing(false);
          setBioDraft(DEMO_USER.bio ?? '');
          setIsDemoMode(true);
        } else {
          // Real server error (e.g. 404 user not found, 401, 500) — keep
          // showing the actual error instead of masking it with demo data.
          setLoadError('Unable to load this profile. Please try again.');
          setProfile(null);
          setPosts([]);
          setQuotes([]);
        }
      } finally {
        if (isCurrentRequest) setIsLoading(false);
      }
    }

    void loadProfile();
    return () => {
      isCurrentRequest = false;
    };
  }, [viewedUsername]);

  const currentUserName = viewer?.name ?? profile?.user.name ?? '';
  const isOwnProfile = profile?.isOwnProfile ?? false;
  const shouldShowFollowStats = Boolean(profile && profile.user.userId !== 0);

  // Save bio only
  const handleSaveBio = async (event: FormEvent) => {
    event.preventDefault();
    if (!isOwnProfile || isSavingProfile) return;

    if (isDemoMode) {
      // No backend to persist to — just update local state.
      setProfile((current) => (current ? { ...current, user: { ...current.user, bio: bioDraft } } : current));
      setActiveProfileEditor(null);
      toast.success('Bio updated (demo mode — not saved to a server)');
      return;
    }

    setIsSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('bio', bioDraft);
      const response = await apiClient.patch<{ user: BackendUser }>('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((current) => (current ? { ...current, user: response.data.user } : current));
      setBioDraft(response.data.user.bio ?? '');
      setActiveProfileEditor(null);
      toast.success('Bio updated!');
    } catch {
      toast.error('Unable to update bio. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save profile picture only
  const handleSavePhoto = async (event: FormEvent) => {
    event.preventDefault();
    if (!isOwnProfile || isSavingProfile || !photoFile) return;

    if (isDemoMode) {
      // No backend to persist to — just update local state with the local preview URL.
      setProfile((current) =>
        current ? { ...current, user: { ...current.user, profilePicture: photoPreview } } : current
      );
      setViewer((current) => (current ? { ...current, profilePicture: photoPreview } : current));
      setPhotoFile(null);
      setActiveProfileEditor(null);
      toast.success('Profile photo updated (demo mode — not saved to a server)');
      return;
    }

    setIsSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', photoFile);
      const response = await apiClient.patch<{ user: BackendUser }>('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((current) => (current ? { ...current, user: response.data.user } : current));
      setViewer((current) => (current ? { ...current, profilePicture: response.data.user.profilePicture } : current));
      setPhotoFile(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      setActiveProfileEditor(null);
      toast.success('Profile photo updated!');
    } catch {
      toast.error('Unable to update profile photo. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    if (!isOwnProfile) return;
    // TODO: Backend Integration - API call to delete post from database
    setPosts((current) => current.filter((item) => item.id !== id));
    toast.success('Post removed from profile');
  };

  const handleToggleFollow = () => {
    if (!profile || profile.user.userId === 0 || profile.isOwnProfile) return;

    setIsFollowing((current) => {
      const nextValue = !current;
      toast.success(nextValue ? 'Following' : 'Unfollowed');
      return nextValue;
    });
  };

  const handleToggleLike = (id: string) => {
    setPosts((current) =>
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
    setPosts((current) =>
      current.map((item) => (item.id === id ? { ...item, bookmarkedByMe: !item.bookmarkedByMe } : item))
    );
  };

  const handleAddComment = (itemId: string, _parentCommentId: string | null, content: string) => {
    const newComment: FeedComment = {
      id: `comment-${Date.now()}`,
      author: { id: String(viewer?.userId ?? ''), name: currentUserName, username: viewer?.username ?? '' },
      content,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    setPosts((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              comments: [...item.comments, newComment],
              commentCount: item.commentCount + 1,
            }
          : item
      )
    );
  };

  const handleCreateEntry = async (payload: CreateEntryPayload) => {
    // TODO: Backend Integration - API call to create a new post/review entry in DB
    // const response = await api.post('/api/posts', payload);
    if (!viewer || !isOwnProfile) return;
    const author = { id: String(viewer.userId), name: viewer.name, username: viewer.username };
    const book = {
      id: `book-${Date.now()}`,
      title: payload.bookTitle,
      author: payload.bookAuthor,
      rating: payload.rating,
    };
    const base = {
      id: `${payload.isReview ? 'review' : 'post'}-${Date.now()}`,
      author,
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

    const newItem: FeedItem = payload.isReview
      ? { ...base, type: 'review', book }
      : { ...base, type: 'post' };

    setPosts((current) => [newItem, ...current]);
    toast.success(payload.isReview ? 'Review published!' : 'Posted!');
  };

  const handleDeleteQuote = (id: string) => {
    setQuotes((current) => current.filter((quote) => quote.id !== id));
    toast.success('Quote removed');
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {isLoading && <p className="text-sm text-textSecondary">Loading profile...</p>}
      {!isLoading && loadError && <p className="text-sm text-error">{loadError}</p>}
      {!isLoading && !profile && !loadError && <p className="text-sm text-textSecondary">Profile not found.</p>}

      {!isLoading && profile && (
        <>
          {isDemoMode && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
              Showing demo data — the backend isn't reachable right now. Changes here won't be saved.
            </div>
          )}

          {/* Profile Header */}
          <div className="flex items-start gap-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-card dark:bg-card-dark p-6 shadow-sm">
            <Avatar
              name={profile.user.name}
              src={photoPreview ?? resolveProfilePicture(profile.user.profilePicture)}
              size="lg"
              className="h-24 w-24 border-2 border-white text-2xl shadow-md"
            />
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-text dark:text-text-dark">{profile.user.name}</h1>
                {isOwnProfile && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveProfileEditor((current) => (current === 'photo' ? null : 'photo'))}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-textSecondary dark:text-textSecondary-dark hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      {activeProfileEditor === 'photo' ? 'Cancel photo' : 'Change photo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveProfileEditor((current) => (current === 'bio' ? null : 'bio'))}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-textSecondary dark:text-textSecondary-dark hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      {activeProfileEditor === 'bio' ? 'Cancel bio' : 'Edit bio'}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-textSecondary dark:text-textSecondary-dark">@{profile.user.username}</p>
              {isOwnProfile && activeProfileEditor === 'photo' && (
                <form onSubmit={handleSavePhoto} className="max-w-lg space-y-3 pt-1">
                  {/* Hidden native file input */}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handlePhotoFileChange}
                  />

                  {/* Preview + pick button */}
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-16 w-16 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-textSecondary dark:text-textSecondary-dark text-xs">
                        No file
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-textSecondary dark:text-textSecondary-dark hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      {photoFile ? 'Choose different file' : 'Choose file…'}
                    </button>
                  </div>

                  {photoFile && (
                    <p className="text-xs text-textSecondary dark:text-textSecondary-dark">
                      {photoFile.name} · {(photoFile.size / 1024).toFixed(0)} KB
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile || !photoFile}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save photo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProfileEditor(null);
                        setPhotoFile(null);
                        if (photoPreview) URL.revokeObjectURL(photoPreview);
                        setPhotoPreview(null);
                      }}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-textSecondary dark:text-textSecondary-dark hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {isOwnProfile && activeProfileEditor === 'bio' && (
                <form onSubmit={handleSaveBio} className="max-w-lg space-y-2 pt-1">
                  <textarea
                    value={bioDraft}
                    onChange={(event) => setBioDraft(event.target.value)}
                    maxLength={500}
                    placeholder="Tell readers about yourself..."
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-text dark:text-text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save bio'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveProfileEditor(null)}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-textSecondary dark:text-textSecondary-dark hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {!activeProfileEditor && (
                <p className="pt-1 text-sm leading-relaxed text-text dark:text-text-dark max-w-lg">
                  {profile.user.bio?.trim() ? profile.user.bio : 'No bio available right now.'}
                </p>
              )}
              {!profile.isOwnProfile && (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <p className="text-xs font-medium capitalize text-primary">{profile.relationship}</p>
                  {shouldShowFollowStats && (
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              )}
              {shouldShowFollowStats && (
                <div className="flex gap-8 pt-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setActiveModal('followers')}
                    className="hover:opacity-80 transition-opacity text-left"
                  >
                    <span className="font-bold text-text dark:text-text-dark">{profile.followersCount}</span>{' '}
                    <span className="text-textSecondary dark:text-textSecondary-dark">Followers</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal('following')}
                    className="hover:opacity-80 transition-opacity text-left"
                  >
                    <span className="font-bold text-text dark:text-text-dark">{profile.followingCount}</span>{' '}
                    <span className="text-textSecondary dark:text-textSecondary-dark">Following</span>
                  </button>
                  <div>
                    <span className="font-bold text-text dark:text-text-dark">{posts.length}</span>{' '}
                    <span className="text-textSecondary dark:text-textSecondary-dark">Posts</span>
                  </div>
                </div>
              )}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Posts Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="border-b-2 border-primary pb-2 text-lg font-bold text-text dark:text-text-dark">Posts</h2>
            {isOwnProfile && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEntryModalMode('post');
                    setIsEntryModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary/90"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  New Post
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryModalMode('review');
                    setIsEntryModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm transition-colors duration-150 hover:bg-primary/5 dark:bg-gray-900"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  New Review
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {posts.map((item) => (
                <FeedItemCard
                  key={item.id}
                  item={item}
                  currentUserName={currentUserName}
                  currentUserId={String(viewer?.userId ?? profile.user.userId)}
                  onToggleLike={handleToggleLike}
                  onToggleBookmark={handleToggleBookmark}
                  onAddComment={handleAddComment}
                  onDelete={handleDeleteItem}
                  canDelete={isOwnProfile}
                />
              ))}
            </AnimatePresence>

            {posts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-card dark:bg-card-dark p-10 text-center">
                <p className="text-sm font-medium text-text dark:text-text-dark">No posts available right now.</p>
                {isOwnProfile && <p className="mt-1 text-sm text-textSecondary">Share your first update by creating a new post.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quotes Section */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-card dark:bg-card-dark p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-text dark:text-text-dark">
                <span>🎉</span> Quotes
              </h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {quotes.length} saved
              </span>
            </div>

            {quotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/60 p-4 text-center text-sm text-textSecondary dark:text-textSecondary-dark">
                No quotes available right now.
              </div>
            ) : (
              <ul className="max-h-[320px] space-y-3 overflow-y-auto pr-1 text-sm text-text dark:text-text-dark">
                {quotes.map((quote) => (
                  <li
                    key={quote.id}
                    className="group relative rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70 p-3 text-xs leading-relaxed"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium italic text-textSecondary dark:text-textSecondary-dark">"{quote.quote}"</span>
                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="shrink-0 rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-textSecondary dark:text-textSecondary-dark">
                      <span className="font-semibold text-text dark:text-text-dark">♥ {quote.likeCount}</span>
                      <span>{quote.likeCount > 0 ? 'Likes' : 'No likes yet'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

          </div>
        </div>
      </div>

      {/* Followers / Following Modal */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-card dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
                <h3 className="font-bold text-text dark:text-text-dark capitalize">
                  {activeModal} ({activeModal === 'followers' ? profile?.followersCount ?? 0 : profile?.followingCount ?? 0})
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-textSecondary dark:text-textSecondary-dark hover:text-text dark:hover:text-text-dark font-bold text-lg"
                >
                  &times;
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-4">
                {(activeModal === 'followers' && (profile?.followersCount ?? 0) === 0) || (activeModal === 'following' && (profile?.followingCount ?? 0) === 0) ? (
                  <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-center text-sm text-textSecondary dark:text-textSecondary-dark">
                    {activeModal === 'followers' ? 'No followers available right now.' : 'No following available right now.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-center text-sm text-textSecondary dark:text-textSecondary-dark">
                      {activeModal === 'followers' ? 'Followers will appear here once they are available.' : 'People you follow will appear here once they are available.'}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEntryModalOpen && (
          <NewEntryModal
            key={`entry-modal-${entryModalMode}`}
            onClose={() => setIsEntryModalOpen(false)}
            onSubmit={handleCreateEntry}
            initialMode={entryModalMode}
          />
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}