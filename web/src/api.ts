import type {
  User, Lesson, LessonMeta, GrammarMeta, GrammarCard, Word, VocabCategory,
  QueueItem, Rating, ErrorEntry, ProgressEntry, Dashboard, LibraryLevel, GamificationData,
  WritingFeedback, StudyPlan,
} from './types';

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  // Only declare a JSON content-type when we actually send a body — Fastify rejects
  // an empty body with `Content-Type: application/json` (400 "Body cannot be empty").
  const hasBody = opts.body != null;
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    ...opts,
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('unauthorized');
  }
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const get = <T>(p: string) => req<T>(p);
const post = <T>(p: string, body?: unknown) =>
  req<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const put = <T>(p: string, body?: unknown) =>
  req<T>(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
const del = <T>(p: string) => req<T>(p, { method: 'DELETE' });

export const api = {
  // auth
  login: (username: string, password: string) =>
    post<{ user: User }>('/auth/login', { username, password }),
  logout: () => post('/auth/logout'),
  me: () => get<{ user: User }>('/auth/me'),

  // dashboard
  dashboard: () => get<Dashboard>('/dashboard'),
  warmup: () => get<{
    errors: { id: number; wrong: string; correct: string; rule: string }[];
    topics: { id: string; status: string; title: string }[];
    words: { id: string; word: string; ru: string }[];
  }>('/warmup'),

  // lessons
  lessons: () => get<LessonMeta[]>('/lessons'),
  lesson: (id: string) => get<Lesson>(`/lessons/${id}`),
  attempt: (id: string, exerciseId: string, correct: boolean, answer?: string) =>
    post(`/lessons/${id}/attempt`, { exerciseId, correct, answer }),
  addGlossToSrs: (id: string) => post<{ added: number; total: number }>(`/lessons/${id}/add-gloss-to-srs`),

  // grammar
  grammar: () => get<GrammarMeta[]>('/grammar'),
  grammarCard: (id: string) => get<GrammarCard>(`/grammar/${id}`),

  // vocab
  vocabCategories: () => get<VocabCategory[]>('/vocab/categories'),
  vocabWords: (q: Record<string, string | number> = {}) => {
    const s = new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)]));
    return get<{ total: number; words: Word[] }>(`/vocab/words?${s}`);
  },

  // srs
  srsQueue: () => get<{ cards: QueueItem[]; counts: { due: number; new: number } }>('/srs/queue'),
  srsReview: (wordId: string, rating: Rating) => post('/srs/review', { wordId, rating }),
  srsAdd: (wordIds: string[]) => post<{ added: number }>('/srs/add', { wordIds }),
  srsAddSet: (set: { category?: string; topic?: string; level?: string }) =>
    post<{ added: number }>('/srs/add-set', set),
  srsRemove: (wordId: string) => del(`/srs/${wordId}`),
  srsStats: () => get<{ total: number; new: number; learning: number; review: number; due: number }>('/srs/stats'),

  // translator / dictionary / custom
  translate: (text: string, source?: string, target?: string, context?: string) =>
    post<{ translation: string; alternatives: string[]; note?: string; provider: string; source: string; target: string }>(
      '/translate', { text, source, target, context }),
  define: (word: string) => get<{
    word: string; found: boolean; phonetic?: string; audio?: string;
    meanings?: { pos: string; definitions: string[]; example: string }[];
  }>(`/define?word=${encodeURIComponent(word)}`),
  customWords: () => get<any[]>('/custom-words'),
  addCustomWord: (w: {
    word: string; ru?: string; ipa?: string; pos?: string;
    exampleEn?: string; exampleRu?: string; addToSrs?: boolean;
  }) => post<{ id: string }>('/custom-words', w),
  deleteCustomWord: (id: string) => del(`/custom-words/${encodeURIComponent(id)}`),

  // progress
  progress: () => get<ProgressEntry[]>('/progress'),
  setProgress: (topicId: string, body: { status: string; note?: string; scheduleReview?: boolean }) =>
    put(`/progress/${topicId}`, body),

  // errors
  errors: (status?: string) => get<ErrorEntry[]>(`/errors${status ? `?status=${status}` : ''}`),
  addError: (e: { wrong: string; correct: string; rule?: string; tags?: string[]; source?: string }) =>
    post<{ id: number }>('/errors', e),
  updateError: (id: number, e: Partial<ErrorEntry>) => put(`/errors/${id}`, e),
  deleteError: (id: number) => del(`/errors/${id}`),

  // settings
  settings: () => get<Record<string, any>>('/settings'),
  setSettings: (s: Record<string, any>) => put('/settings', s),

  // account (self)
  changePassword: (oldPassword: string, newPassword: string) =>
    post('/account/password', { oldPassword, newPassword }),

  // admin
  adminUsers: () => get<import('./types').AdminUser[]>('/admin/users'),
  adminAddUser: (u: { username: string; name?: string; password: string; role?: string }) =>
    post<{ id: number }>('/admin/users', u),
  adminSetPassword: (id: number, password: string) => post(`/admin/users/${id}/password`, { password }),
  adminUpdateUser: (id: number, body: { name?: string; role?: string }) => req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminDeleteUser: (id: number) => del(`/admin/users/${id}`),

  // push
  pushPubKey: () => get<{ key: string; enabled: boolean }>('/push/pubkey'),
  pushSubscribe: (subscription: unknown) => post('/push/subscribe', { subscription }),
  pushUnsubscribe: (endpoint: string) => post('/push/unsubscribe', { endpoint }),
  pushTest: () => post('/push/test'),

  // textbook
  textbookInfo: () => get<{ available: boolean; size?: number }>('/textbook/info'),

  // library
  libraryBooks: () => get<{ levels: LibraryLevel[] }>('/library/books'),

  // practice
  practiceQueue: (count = 20, level?: string) => {
    const q = new URLSearchParams({ count: String(count) });
    if (level) q.set('level', level);
    return get<{ items: import('./types').PracticeItem[] }>(`/practice/queue?${q}`);
  },
  practiceStats: () => get<import('./types').PracticeStats>('/practice/stats'),

  // gamification
  gamification: () => get<GamificationData>('/gamification'),

  // study plan
  plan: () => get<StudyPlan>('/plan'),

  // AI writing feedback
  checkWriting: (body: { text: string; task?: string; mode?: 'free' | 'task1' | 'task2' | 'speaking' }) =>
    post<WritingFeedback>('/check-writing', body),
};
