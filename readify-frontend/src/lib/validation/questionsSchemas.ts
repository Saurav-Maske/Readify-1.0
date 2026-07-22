import { z } from 'zod';

export const questionsSchema = z.object({
  booksRead: z.string().trim().max(1000, 'Keep it under 1000 characters').optional(),
  genres: z.array(z.string()),
  readerStatus: z.enum(['starting', 'active', 'returning'], {
    required_error: 'Please select one option',
  }),
  recentBookDuration: z
    .string()
    .trim()
    .min(1, 'Let us know roughly how long it took')
    .max(100, 'Keep it under 100 characters'),
  recentBookPace: z.enum(['on_time', 'faster', 'slower'], {
    required_error: 'Please select one option',
  }),
  favoriteAuthors: z.string().trim().max(300, 'Keep it under 300 characters').optional(),
});

export type QuestionsSchema = z.infer<typeof questionsSchema>;