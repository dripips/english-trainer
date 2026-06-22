export type User = { id: number; username: string; name: string; role?: 'user' | 'admin' };

export interface AdminUser {
  id: number; username: string; display_name: string; role: 'user' | 'admin';
  created_at: string; words: number; attempts: number;
}

export type ExerciseType =
  | 'fill' | 'choose' | 'translate' | 'fix' | 'order' | 'match' | 'listen' | 'freeform';

export interface Exercise {
  id: string;
  type: ExerciseType;
  prompt?: string;
  answer?: string | string[];
  options?: string[];
  tokens?: string[];
  pairs?: { left: string; right: string }[];
  audioText?: string;
  hint?: string;
  rule?: string;
  sample?: string;
}

export interface LessonMeta {
  id: string; order: number; title: string; level: string; phase: number;
  murphy: string | null; summary: string; tags: string[];
  exerciseCount: number; attempted?: number; correct?: number;
}

export interface LessonVideo { title: string; url: string }
export interface LessonReading {
  textEn: string; textRu: string;
  gloss?: { en: string; ru: string; note?: string }[];
}

export interface Lesson extends LessonMeta {
  grammarRefs: string[]; vocabTopics: string[]; warmup: string[];
  videos?: LessonVideo[]; reading?: LessonReading | null;
  exercises: Exercise[]; theory: string;
  attempts?: { exercise_id: string; correct: number; answer: string }[];
}

export interface GrammarMeta {
  id: string; order: number; title: string; level: string; tags: string[];
  summary: string; relatedLessons: string[];
  commonMistakes: { wrong: string; right: string; rule: string }[];
}
export interface GrammarCard extends GrammarMeta { body: string }

export interface Word {
  id: string; word: string; pos: string; ru: string; ipa: string;
  exampleEn: string; exampleRu: string; level: string; topic: string;
  tags: string[]; forms?: Record<string, string> | null; category?: string;
  inDeck?: boolean; custom?: boolean;
}

export interface VocabCategory {
  category: string; title: string; level: string; pos: string; topic: string; count: number;
}

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface QueueItem {
  card: { id: number; wordId: string; state: string; reps: number; source: string };
  word: Word;
}

export interface ErrorEntry {
  id: number; wrong: string; correct: string; rule: string | null;
  tags: string | null; status: 'open' | 'fixed'; source: string | null;
  hits: number; created_at: string; updated_at: string;
}

export interface ProgressEntry {
  topic_id: string; status: 'learning' | 'consolidating' | 'confident';
  note: string | null; review_due: string | null; updated_at: string;
}

export interface Dashboard {
  user: User;
  streak: number;
  xp: number; level: number; levelXp: number; nextLevelXp: number | null;
  srs: { total: number; due: number; new: number };
  openErrors: number; lessonsDone: number; lessonsTotal: number;
  activeDays: string[];
}

export interface Badge {
  id: string; emoji: string; name: string; desc: string; earned: boolean;
}

export interface GamificationData {
  xp: number; level: number; levelXp: number; nextLevelXp: number | null;
  streak: number; longestStreak: number; badges: Badge[];
}

export interface PracticeItem {
  lessonId: string;
  lessonTitle: string;
  level: string;
  exercise: Exercise;
}

export interface PracticeStats {
  total: number;
  correct: number;
  todayCount: number;
  todayCorrect: number;
  weakSpots: { lessonId: string; title: string; correctRate: number }[];
}

export interface LibraryBook {
  level: 'A1' | 'A2' | 'B1' | 'B2';
  file: string;
  title: string;
  author: string;
  description: string;
  size: number;
  updatedAt: string;
  url: string;
  coverUrl: string | null;
  recommended: boolean;
  tags: string[];
  pages: number | null;
}

export interface LibraryLevel {
  level: 'A1' | 'A2' | 'B1' | 'B2';
  title: string;
  count: number;
  books: LibraryBook[];
}
