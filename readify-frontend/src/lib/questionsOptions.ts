import type { ReaderStatus, ReadingPace } from '../types/questions';

export const GENRE_OPTIONS = [
  'Fiction',
  'Non-fiction',
  'Mystery & Thriller',
  'Sci-Fi',
  'Fantasy',
  'Romance',
  'Biography & Memoir',
  'Self-Help',
  'History',
  'Poetry',
  'Horror',
  'Young Adult',
  'Classics',
  'Business',
] as const;

export const READER_STATUS_OPTIONS: { value: ReaderStatus; label: string; description: string }[] = [
  {
    value: 'starting',
    label: 'Just getting started',
    description: 'Looking forward to beginning my reading journey',
  },
  {
    value: 'active',
    label: 'Active reader',
    description: 'I read pretty regularly',
  },
  {
    value: 'returning',
    label: 'Returning from a break',
    description: 'Picking reading back up',
  },
];

export const PACE_OPTIONS: { value: ReadingPace; label: string }[] = [
  { value: 'on_time', label: 'Right on time' },
  { value: 'faster', label: 'Faster than expected' },
  { value: 'slower', label: 'Slower than expected' },
];