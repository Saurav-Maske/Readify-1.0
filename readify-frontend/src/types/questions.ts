export type ReaderStatus = 'starting' | 'active' | 'returning';
export type ReadingPace = 'on_time' | 'faster' | 'slower';

export interface ReadingPreferencesPayload {
  booksRead?: string;
  genres: string[];
  readerStatus: ReaderStatus;
  recentBookDuration: string;
  recentBookPace: ReadingPace;
  favoriteAuthors?: string;
}