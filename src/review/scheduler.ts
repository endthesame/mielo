import { fsrs, generatorParameters, type CardInput, type Grade } from 'ts-fsrs';

// Store the version and parameters in the review log for reproducibility.
export const FSRS_VERSION = 'ts-fsrs@5.4.2';
export const FSRS_PARAMETERS = generatorParameters({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m'],
});

export function scheduleReview(state: CardInput, rating: Grade, now: Date) {
  return fsrs(FSRS_PARAMETERS).next(state, now, rating);
}
