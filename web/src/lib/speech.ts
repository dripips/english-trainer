// High-quality pronunciation via server ElevenLabs TTS (cached), with the
// browser SpeechSynthesis as a fallback. Plus speech recognition.

// ---- system voice fallback ----
let voicesCache: SpeechSynthesisVoice[] = [];
function loadVoices() {
  if (typeof speechSynthesis === 'undefined') return [];
  voicesCache = speechSynthesis.getVoices();
  return voicesCache;
}
if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
function scoreVoice(v: SpeechSynthesisVoice, lang: string): number {
  let s = 0;
  const name = v.name.toLowerCase();
  const vl = v.lang.toLowerCase();
  if (vl.startsWith(lang.toLowerCase())) s += 100;
  else if (vl.slice(0, 2) === lang.slice(0, 2)) s += 60;
  if (/(natural|neural|enhanced|premium)/.test(name)) s += 40;
  if (/google/.test(name)) s += 28;
  if (/(samantha|aaron|siri|daniel|karen|moira|tessa|serena|nicky|alex)/.test(name)) s += 22;
  if (!v.localService) s += 8;
  return s;
}
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = voicesCache.length ? voicesCache : loadVoices();
  if (!voices.length) return undefined;
  return voices.map((v) => [v, scoreVoice(v, lang)] as const).sort((a, b) => b[1] - a[1])[0]?.[0];
}
function systemSpeak(text: string, lang = 'en-US', rate = 0.95) {
  if (typeof speechSynthesis === 'undefined' || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = rate; u.pitch = 1;
  const v = pickVoice(lang);
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

// ---- ElevenLabs (server-proxied, cached) ----
export const ttsSupported = true; // server TTS + system fallback, so always offer it
const MAX_TTS = 2500;
const blobCache = new Map<string, string>(); // text -> object URL
const inflight = new Map<string, Promise<string | null>>();
let audioEl: HTMLAudioElement | null = null;
let ttsBroken = false; // server said it's not configured → stop trying

function getAudio(): HTMLAudioElement | null {
  if (!audioEl && typeof Audio !== 'undefined') audioEl = new Audio();
  return audioEl;
}

// Best-effort unlock of the audio element on the first user gesture so playback
// started after an async fetch isn't blocked by autoplay policy.
if (typeof window !== 'undefined') {
  const unlock = () => {
    const a = getAudio();
    try { if (a) { a.muted = true; a.play().then(() => { a.pause(); a.muted = false; }).catch(() => { a.muted = false; }); } } catch { /* ignore */ }
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
}

function fetchTts(text: string): Promise<string | null> {
  const key = text.trim();
  if (!key || ttsBroken) return Promise.resolve(null);
  const have = blobCache.get(key);
  if (have) return Promise.resolve(have);
  const running = inflight.get(key);
  if (running) return running;
  const p = (async () => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: key }),
      });
      if (res.status === 503) { ttsBroken = true; return null; }
      if (!res.ok) return null;
      const url = URL.createObjectURL(await res.blob());
      blobCache.set(key, url);
      return url;
    } catch { return null; } finally { inflight.delete(key); }
  })();
  inflight.set(key, p);
  return p;
}

// Warm the cache (no playback) so the next tap plays instantly within the gesture.
export function prefetchTts(text: string) {
  const t = (text || '').trim();
  if (t && t.length <= MAX_TTS) void fetchTts(t);
}
export const prefetchWord = prefetchTts; // back-compat

function playUrl(url: string): boolean {
  const a = getAudio();
  if (!a) return false;
  try { a.pause(); a.src = url; a.currentTime = 0; void a.play().catch(() => {}); return true; } catch { return false; }
}

export function speak(text: string, lang = 'en-US', rate = 0.95) {
  const t = (text || '').trim();
  if (!t) return;
  try { speechSynthesis?.cancel(); } catch { /* ignore */ }
  // Russian (or oversized, or TTS unavailable) → system voice; English → ElevenLabs with fallback.
  if (!lang.startsWith('en') || t.length > MAX_TTS || ttsBroken) { systemSpeak(t, lang, rate); return; }
  const cached = blobCache.get(t);
  if (cached) { playUrl(cached); return; } // sync play preserves user-gesture activation
  fetchTts(t).then((url) => {
    if (url) { if (!playUrl(url)) systemSpeak(t, lang, rate); }
    else systemSpeak(t, lang, rate);
  });
}

export function pronounce(text: string, lang = 'en-US') { speak(text, lang); }
export function speakWord(word: string, lang = 'en-US') { speak(word, lang); } // back-compat

// ---- Speech recognition ----
type SR = typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any };
export const sttSupported =
  typeof window !== 'undefined' &&
  !!((window as SR).SpeechRecognition || (window as SR).webkitSpeechRecognition);

export function listenOnce(lang = 'en-US'): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = window as SR;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return reject(new Error('speech recognition not supported'));
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => resolve(e.results[0][0].transcript);
    rec.onerror = (e: any) => reject(new Error(e.error || 'recognition error'));
    rec.start();
  });
}
