// Client-side answer checking — mirrors server util.normalizeAnswer.
// Ignores case, apostrophes, punctuation and extra whitespace.
export function normalizeAnswer(s: string): string {
  if (s == null) return '';
  return String(s)
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/['"]/g, '')
    .replace(/[.,!?;:…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function answerMatches(given: string, accepted: string | string[]): boolean {
  const g = normalizeAnswer(given);
  if (!g) return false;
  const list = Array.isArray(accepted) ? accepted : [accepted];
  return list.some((a) => normalizeAnswer(a) === g);
}

export function firstAnswer(accepted?: string | string[]): string {
  if (!accepted) return '';
  return Array.isArray(accepted) ? accepted[0] : accepted;
}
