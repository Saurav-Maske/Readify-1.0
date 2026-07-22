import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Textarea } from '../components/ui/Textarea';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { QuestionSection } from '../components/questions/QuestionSection';
import { ChipMultiSelect } from '../components/questions/ChipMultiSelect';
import { SegmentedChoice } from '../components/questions/SegmentedChoice';
import { questionsSchema, type QuestionsSchema } from '../lib/validation/questionsSchemas';
import { GENRE_OPTIONS, READER_STATUS_OPTIONS, PACE_OPTIONS } from '../lib/questionsOptions';
import apiClient from '../lib/api';
import type { ReadingPreferencesPayload } from '../types/questions';


function extractErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message ?? 'Something went wrong. Please try again.';
}

type StepFieldName = keyof QuestionsSchema;

interface StepConfig {
  title: string;
  caption: string;
  optional: boolean;
  fields: StepFieldName[];
}

const STEPS: StepConfig[] = [
  {
    title: 'What books have you read?',
    caption: 'Brag a little — nobody here is grading your bookshelf.',
    optional: true,
    fields: ['booksRead'],
  },
  {
    title: 'What genres do you prefer?',
    caption: 'Pick as many as spark joy. Marie Kondo would approve.',
    optional: true,
    fields: ['genres'],
  },
  {
    title: 'Are you looking forward to beginning reading books, an active reader, or returning from a break?',
    caption: "No wrong answers here — even 'browsing since 2019' counts as active.",
    optional: false,
    fields: ['readerStatus'],
  },
  {
    title:
      'How much time did you give to your most recent book, and did you complete it in time, faster, or slower than expected?',
    caption: 'Confession time: did you savor it, or speed-run it like a Black Friday sale?',
    optional: false, // Will be dynamically set based on readerStatus
    fields: ['recentBookDuration', 'recentBookPace'],
  },
  {
    title: 'Do you have a favourite author or authors?',
    caption: "Immortalize your favorites here — they'll never find out.",
    optional: true,
    fields: ['favoriteAuthors'],
  },
];

export default function QuestionsPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    trigger,
    formState: { errors },
  } = useForm<QuestionsSchema>({
    resolver: zodResolver(questionsSchema),
    defaultValues: {
      booksRead: '',
      genres: [],
      readerStatus: undefined,
      recentBookDuration: '',
      recentBookPace: undefined,
      favoriteAuthors: '',
    },
    mode: 'onBlur',
  });

  // Watch readerStatus to determine if question 4 should be optional
  const readerStatus = useWatch({
    control,
    name: 'readerStatus',
  });

  // Question 4 is only mandatory if "active reader" is selected
  const isQuestion4Mandatory = readerStatus === 'active';
  const isLastStep = step === STEPS.length - 1;
  const currentFields = STEPS[step].fields;
  const currentStepOptional = step === 3 ? !isQuestion4Mandatory : STEPS[step].optional;

  const onSubmit = async (values: QuestionsSchema) => {
    setIsSubmitting(true);

    try {
      const payload: ReadingPreferencesPayload = {
        booksRead: values.booksRead || undefined,
        genres: values.genres,
        readerStatus: values.readerStatus,
        recentBookDuration: values.recentBookDuration,
        recentBookPace: values.recentBookPace,
        favoriteAuthors: values.favoriteAuthors || undefined,
      };

      await apiClient.post('/users/reading-preferences', payload);

      toast.success('Thanks! Your preferences are saved.');
      navigate('/home');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = async () => {
    const isValid = await trigger(currentFields);
    if (!isValid) return;

    if (isLastStep) {
      handleSubmit(onSubmit)();
      return;
    }

    setDirection(1);
    setStep((current) => current + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((current) => Math.max(0, current - 1));
  };

  const handleSkip = () => {
    // Skipping bypasses validation entirely — don't call goNext(),
    // since it runs trigger() against the zod schema and will block
    // advancing if fields on this step are marked required there.
    if (isLastStep) {
      handleSubmit(onSubmit)();
      return;
    }

    setDirection(1);
    setStep((current) => current + 1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-8 rounded-full transition-colors duration-200 ${
                  index <= step ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          {currentStepOptional && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-textSecondary hover:text-text hover:underline"
            >
              Skip for now
            </button>
          )}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.25 }}
          >
            <QuestionSection
              index={step + 1}
              title={STEPS[step].title}
              caption={STEPS[step].caption}
              optional={currentStepOptional}
            >
              {step === 0 && (
                <Textarea
                  aria-label="What books have you read"
                  placeholder="A few titles or authors that come to mind..."
                  rows={4}
                  error={errors.booksRead?.message}
                  {...register('booksRead')}
                />
              )}

              {step === 1 && (
                <Controller
                  name="genres"
                  control={control}
                  render={({ field }) => (
                    <ChipMultiSelect options={GENRE_OPTIONS} value={field.value} onChange={field.onChange} />
                  )}
                />
              )}

              {step === 2 && (
                <Controller
                  name="readerStatus"
                  control={control}
                  render={({ field }) => (
                    <SegmentedChoice
                      name="readerStatus"
                      options={READER_STATUS_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.readerStatus?.message}
                    />
                  )}
                />
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <Input
                    label="Time spent on your most recent book"
                    placeholder="e.g. 2 weeks, a weekend, a month..."
                    error={errors.recentBookDuration?.message}
                    {...register('recentBookDuration')}
                  />
                  <Controller
                    name="recentBookPace"
                    control={control}
                    render={({ field }) => (
                      <SegmentedChoice
                        name="recentBookPace"
                        options={PACE_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.recentBookPace?.message}
                      />
                    )}
                  />
                </div>
              )}

              {step === 4 && (
                <Textarea
                  aria-label="Do you have a favourite author or authors"
                  placeholder="Name a few, if any come to mind..."
                  rows={3}
                  error={errors.favoriteAuthors?.message}
                  {...register('favoriteAuthors')}
                />
              )}
            </QuestionSection>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={step === 0}
            className={`w-auto ${step === 0 ? 'invisible' : ''}`}
          >
            Back
          </Button>
          <Button 
            type="button" 
            onClick={isLastStep ? () => navigate('/Feed') : goNext} 
            isLoading={isLastStep && isSubmitting} 
            className="w-auto"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}