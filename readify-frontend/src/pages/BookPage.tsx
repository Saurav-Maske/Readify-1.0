import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { StarRating } from '../components/ui/StarRating';
import { Avatar } from '../components/ui/Avatar';
import { getBookById } from '../lib/mockBookData';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import { ArrowLeftIcon, BookmarkIcon, BrainIcon, ChevronRightIcon, } from '../components/icons';

export default function BookPage() {
    const [searchParams] = useSearchParams();
    const bookId = searchParams.get('id') ?? '';
    const book = getBookById(bookId);

    if (!book) {
        return (
            <div className="min-h-screen bg-background px-4 py-8">
                <div className="mx-auto max-w-3xl">
                    <Link to="/feed" className="flex items-center gap-2 text-sm font-medium text-textSecondary hover:text-text">
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to feed
                    </Link>
                    <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-card p-10 text-center">
                        <p className="text-sm font-medium text-text">We don't have this book yet</p>
                        <p className="mt-1 text-sm text-textSecondary">It may not exist, or hasn't synced from the backend.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background px-4 py-8">
            <div className="mx-auto max-w-4xl">
                <Link to="/feed" className="flex items-center gap-2 text-sm font-medium text-textSecondary hover:text-text">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to feed
                </Link>

                <div className="mt-6 grid gap-8 sm:grid-cols-[220px_1fr]">
                    <div>
                        {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} className="h-72 w-full rounded-xl object-cover shadow-sm" />
                        ) : (
                            <div
                                className="flex h-72 w-full items-center justify-center rounded-xl text-3xl font-bold text-white shadow-sm"
                                style={{ backgroundColor: book.coverColor ?? '#5B5CEB' }}
                            >
                                {book.title.slice(0, 2).toUpperCase()}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => toast.success(`Added ${book.title} to your shelf`)}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary/90"
                        >
                            <BookmarkIcon className="h-4 w-4" />
                            Add to Shelf
                        </button>
                    </div>

                    <div>
                        <span className="inline-block rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {book.genre}
                        </span>

                        <h1 className="mt-3 text-3xl font-bold text-text">{book.title}</h1>
                        <p className="mt-1 text-lg text-textSecondary">{book.author}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-textSecondary">
                            <StarRating value={Math.round(book.averageRating)} />
                            <span className="font-semibold text-text">{book.averageRating.toFixed(1)}</span>
                            <span>·</span>
                            <span>{book.pageCount} pages</span>
                            <span>·</span>
                            <span>{book.publishedYear}</span>
                        </div>

                        <button
                            type="button"
                            className="mt-4 flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-card px-4 py-3 text-left shadow-sm transition-colors duration-150 hover:bg-gray-50"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                                <BrainIcon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-text">Why Readify recommends this</span>
                                <span className="block truncate text-xs text-textSecondary">
                                    {book.recommendationReason} · {book.matchPercent}% match
                                </span>
                            </span>
                            <ChevronRightIcon className="h-4 w-4 shrink-0 text-textSecondary" />
                        </button>

                        <h2 className="mt-6 text-lg font-bold text-text">About this book</h2>
                        <p className="mt-2 text-sm leading-relaxed text-textSecondary">{book.description}</p>
                    </div>
                </div>

                <h2 className="mt-8 text-lg font-bold text-text">Community Reviews</h2>
                <div className="mt-3 space-y-3">
                    {book.reviews.length === 0 && (
                        <p className="text-sm text-textSecondary">No reviews yet — be the first to share your thoughts.</p>
                    )}
                    {book.reviews.map((review) => (
                        <div key={review.id} className="rounded-2xl border border-gray-100 bg-card p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <Avatar name={review.reviewerName} src={review.reviewerAvatarUrl} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-text">{review.reviewerName}</span>
                                            <StarRating value={review.rating} />
                                        </div>
                                        <span className="text-xs text-textSecondary">{formatRelativeTime(review.createdAt)}</span>
                                    </div>
                                    <p className="mt-1.5 text-sm text-text">{review.content}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {book.similarBooks.length > 0 && (
                    <>
                        <h2 className="mt-8 text-lg font-bold text-text">Similar Books You Might Love</h2>
                        <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
                            {book.similarBooks.map((similar) => (
                                <Link key={similar.id} to={`/books?id=${similar.id}`} className="w-24 shrink-0">
                                    {similar.coverUrl ? (
                                        <img src={similar.coverUrl} alt={similar.title} className="h-32 w-24 rounded-lg object-cover" />
                                    ) : (
                                        <div
                                            className="flex h-32 w-24 items-center justify-center rounded-lg text-xs font-semibold text-white"
                                            style={{ backgroundColor: similar.coverColor ?? '#5B5CEB' }}
                                        >
                                            {similar.title.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <p className="mt-1.5 truncate text-xs font-medium text-text hover:underline">{similar.title}</p>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}