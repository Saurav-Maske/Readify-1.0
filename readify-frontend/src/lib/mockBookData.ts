import type { BookDetail } from '../types/book';

const BOOK_DETAILS: Record<string, BookDetail> = {
  'book-ttt': {
    id: 'book-ttt',
    title: 'Tomorrow, and Tomorrow, and Tomorrow',
    author: 'Gabrielle Zevin',
    genre: 'Literary Fiction',
    coverColor: '#EF4444',
    averageRating: 4.8,
    pageCount: 480,
    publishedYear: 2022,
    recommendationReason: 'Based on your reading DNA and social graph',
    matchPercent: 94,
    description:
      'Two friends, Sam and Sadie, collaborate on video games for decades, their relationship tested by creativity, success, and heartbreak. A dazzling novel about work, play, and love that spans thirty years of an extraordinary friendship.',
    reviews: [
      {
        id: 'br1',
        reviewerName: 'Marcus Osei',
        rating: 5,
        content:
          "Absolutely stunning. Zevin crafts something rare — a novel about creativity that IS creative. The video game structure mirrors the emotional beats perfectly. I couldn't put it down.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: 'br2',
        reviewerName: 'Dev Sharma',
        rating: 5,
        content:
          "Kingsolver has written a masterwork — wait, wrong book, but honestly this one deserves the same praise. The friendship at the center feels lived-in and true across every decade.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
    ],
    similarBooks: [
      { id: 'book-atlas-six', title: 'The Atlas Six', coverColor: '#6366F1' },
      { id: 'book-lessons-in-chemistry', title: 'Lessons in Chemistry', coverColor: '#10B981' },
      { id: 'book-song-of-achilles', title: 'The Song of Achilles', coverColor: '#DC2626' },
      { id: 'book-fourth-wing', title: 'Fourth Wing', coverColor: '#111827' },
      { id: 'book-circe', title: 'Circe', coverColor: '#F59E0B' },
    ],
  },
  'book-demon-copperhead': {
    id: 'book-demon-copperhead',
    title: 'Demon Copperhead',
    author: 'Barbara Kingsolver',
    genre: 'Literary Fiction',
    coverColor: '#F59E0B',
    averageRating: 4.7,
    pageCount: 560,
    publishedYear: 2022,
    recommendationReason: 'Popular with readers who liked Tomorrow, and Tomorrow, and Tomorrow',
    matchPercent: 88,
    description:
      "A modern retelling of David Copperfield set in the mountains of southern Appalachia, following a boy born to a teenage single mother in a single-wide trailer, with no assets beyond his dead father's good looks and his mother's fighting spirit.",
    reviews: [
      {
        id: 'br3',
        reviewerName: 'Dev Sharma',
        rating: 5,
        content:
          "Kingsolver's command of voice is remarkable — it never once slips out of character. A hard read in places, but the kind of book that changes how you see an entire region.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
    ],
    similarBooks: [
      { id: 'book-ttt', title: 'Tomorrow, and Tomorrow, and Tomorrow', coverColor: '#EF4444' },
      { id: 'book-lessons-in-chemistry', title: 'Lessons in Chemistry', coverColor: '#10B981' },
    ],
  },
  'book-fourth-wing': {
    id: 'book-fourth-wing',
    title: 'Fourth Wing',
    author: 'Rebecca Yarros',
    genre: 'Fantasy Romance',
    coverColor: '#111827',
    averageRating: 4.6,
    pageCount: 512,
    publishedYear: 2023,
    recommendationReason: 'Based on your reading DNA and 6 similar readers',
    matchPercent: 91,
    description:
      "Violet Sorrengail was supposed to enter the Scribe Quadrant, living a quiet life among books and history. Instead, she's forced into the brutal Riders Quadrant, where dragons choose their bonded riders and most who enter don't survive.",
    reviews: [],
    similarBooks: [
      { id: 'book-iron-flame', title: 'Iron Flame', coverColor: '#1F2937' },
      { id: 'book-acotar', title: 'A Court of Thorns and Roses', coverColor: '#7C3AED' },
      { id: 'book-atlas-six', title: 'The Atlas Six', coverColor: '#6366F1' },
    ],
  },
  'book-atlas-six': {
    id: 'book-atlas-six',
    title: 'The Atlas Six',
    author: 'Olivie Blake',
    genre: 'Dark Academia',
    coverColor: '#6366F1',
    averageRating: 4.2,
    pageCount: 384,
    publishedYear: 2020,
    recommendationReason: 'Trending among readers you follow',
    matchPercent: 82,
    description:
      'Six young magicians are recruited into a secret society of the world\'s best magical academics, competing for five permanent spots. Only the ruthless will survive.',
    reviews: [],
    similarBooks: [
      { id: 'book-ttt', title: 'Tomorrow, and Tomorrow, and Tomorrow', coverColor: '#EF4444' },
      { id: 'book-fourth-wing', title: 'Fourth Wing', coverColor: '#111827' },
    ],
  },
  'book-lessons-in-chemistry': {
    id: 'book-lessons-in-chemistry',
    title: 'Lessons in Chemistry',
    author: 'Bonnie Garmus',
    genre: 'Historical Fiction',
    coverColor: '#10B981',
    averageRating: 4.5,
    pageCount: 400,
    publishedYear: 2022,
    recommendationReason: 'Highly rated by readers with similar taste',
    matchPercent: 87,
    description:
      "Chemist Elizabeth Zott finds herself pushed out of the lab and into the unlikely role of a 1960s TV cooking show host, using the platform to teach women far more than recipes.",
    reviews: [],
    similarBooks: [
      { id: 'book-ttt', title: 'Tomorrow, and Tomorrow, and Tomorrow', coverColor: '#EF4444' },
      { id: 'book-demon-copperhead', title: 'Demon Copperhead', coverColor: '#F59E0B' },
    ],
  },
};

export function getBookById(id: string): BookDetail | null {
  return BOOK_DETAILS[id] ?? null;
}