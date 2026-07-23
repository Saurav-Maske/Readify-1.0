export interface BookLookupResult {
  id: string;
  title: string;
  author: string;
  coverColor?: string;
}

const BOOK_DATABASE: BookLookupResult[] = [
  { id: 'book-ttt', title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', coverColor: '#EF4444' },
  { id: 'book-demon-copperhead', title: 'Demon Copperhead', author: 'Barbara Kingsolver', coverColor: '#F59E0B' },
  { id: 'book-fourth-wing', title: 'Fourth Wing', author: 'Rebecca Yarros', coverColor: '#111827' },
  { id: 'book-iron-flame', title: 'Iron Flame', author: 'Rebecca Yarros', coverColor: '#1F2937' },
  { id: 'book-atlas-six', title: 'The Atlas Six', author: 'Olivie Blake', coverColor: '#6366F1' },
  { id: 'book-lessons-in-chemistry', title: 'Lessons in Chemistry', author: 'Bonnie Garmus', coverColor: '#10B981' },
  { id: 'book-acotar', title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', coverColor: '#7C3AED' },
  { id: 'book-project-hail-mary', title: 'Project Hail Mary', author: 'Andy Weir', coverColor: '#0EA5E9' },
  { id: 'book-song-of-achilles', title: 'The Song of Achilles', author: 'Madeline Miller', coverColor: '#DC2626' },
  { id: 'book-circe', title: 'Circe', author: 'Madeline Miller', coverColor: '#F59E0B' },
];

export function lookupAuthorByTitle(title: string): BookLookupResult | null {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return null;

  const exact = BOOK_DATABASE.find((book) => book.title.toLowerCase() === normalized);
  if (exact) return exact;

  return BOOK_DATABASE.find((book) => book.title.toLowerCase().includes(normalized)) ?? null;
}