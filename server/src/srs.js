// Spaced repetition (SM-2 style, Anki-like) with short learning steps.
// Ratings: 'again' | 'hard' | 'good' | 'easy'

const MIN_EASE = 1.3;
const DAY = 24 * 60 * 60 * 1000;

function plusMinutes(min) {
  return new Date(Date.now() + min * 60 * 1000).toISOString();
}
function plusDays(days) {
  return new Date(Date.now() + Math.round(days) * DAY).toISOString();
}

/**
 * @param {{ease:number, interval:number, reps:number, lapses:number, state:string}} card
 * @param {'again'|'hard'|'good'|'easy'} rating
 * @returns updated card fields
 */
export function schedule(card, rating) {
  let { ease = 2.5, interval = 0, reps = 0, lapses = 0, state = 'new' } = card;

  if (state === 'new' || state === 'learning') {
    switch (rating) {
      case 'again':
        return { ease, interval: 0, reps, lapses, state: 'learning', due: plusMinutes(1) };
      case 'hard':
        return { ease, interval: 0, reps, lapses, state: 'learning', due: plusMinutes(6) };
      case 'good':
        return { ease, interval: 1, reps: reps + 1, lapses, state: 'review', due: plusDays(1) };
      case 'easy':
        return { ease, interval: 4, reps: reps + 1, lapses, state: 'review', due: plusDays(4) };
    }
  }

  // review state
  switch (rating) {
    case 'again':
      ease = Math.max(MIN_EASE, ease - 0.2);
      return { ease, interval: 0, reps, lapses: lapses + 1, state: 'learning', due: plusMinutes(10) };
    case 'hard':
      ease = Math.max(MIN_EASE, ease - 0.15);
      interval = Math.max(1, interval * 1.2);
      break;
    case 'good':
      interval = Math.max(1, interval * ease);
      break;
    case 'easy':
      ease = ease + 0.15;
      interval = Math.max(1, interval * ease * 1.3);
      break;
  }
  interval = Math.min(interval, 365);
  return { ease, interval, reps: reps + 1, lapses, state: 'review', due: plusDays(interval) };
}

// Spaced review schedule for grammar TOPICS (from progress.md: 1d, 3d, 1w, 2w, 1mo)
const TOPIC_STEPS_DAYS = [1, 3, 7, 14, 30];
export function topicNextReview(step) {
  const i = Math.min(step, TOPIC_STEPS_DAYS.length - 1);
  return { due: plusDays(TOPIC_STEPS_DAYS[i]), nextStep: Math.min(step + 1, TOPIC_STEPS_DAYS.length - 1) };
}
