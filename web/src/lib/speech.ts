// Pronunciation: real recorded audio for single words (from the dictionary),
// and the best available system voice for sentences. Plus speech recognition.
import { api } from '../api';

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

// Rank voices: right language + "natural"/"neural" cloud voices + known good iOS voices.
function scoreVoice(v: SpeechSynthesisVoice, lang: string): number {
  let s = 0;
  const name = v.name.toLowerCase();
  const vl = v.lang.toLowerCase();
  if (vl.startsWith(lang.toLowerCase())) s += 100;
  else if (vl.slice(0, 2) === lang.slice(0, 2)) s += 60;
  if (/(natural|neural|enhanced|premium)/.test(name)) s += 40;
  if (/google/.test(name)) s += 28;
  if (/(samantha|aaron|siri|daniel|karen|moira|tessa|serena|nicky|alex)/.test(name)) s += 22;
  if (!v.localService) s += 8; // online voices tend to sound better
  return s;
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = voicesCache.length ? voicesCache : loadVoices();
  if (!voices.length) return undefined;
  return voices
    .map((v) => [v, scoreVoice(v, lang)] as const)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
}

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text: string, lang = 'en-US', rate = 0.95) {
  if (typeof speechSynthesis === 'undefined' || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = 1;
  const v = pickVoice(lang);
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

// --- recorded audio for single words ---
const audioCache = new Map<string, string | null>();
let audioEl: HTMLAudioElement | null = null;

function playUrl(url: string) {
  try {
    if (!audioEl) audioEl = new Audio();
    audioEl.src = url;
    void audioEl.play().catch(() => {});
  } catch { /* ignore */ }
}

async function resolveWordAudio(key: string): Promise<string | null> {
  if (audioCache.has(key)) return audioCache.get(key)!;
  try {
    const d = await api.define(key);
    let url = d.found ? (d.audio || '') : '';
    if (url.startsWith('//')) url = 'https:' + url;
    audioCache.set(key, url || null);
    return url || null;
  } catch {
    audioCache.set(key, null);
    return null;
  }
}

export function prefetchWord(word: string) {
  const key = word.trim().toLowerCase();
  if (key && !audioCache.has(key)) void resolveWordAudio(key);
}

export async function speakWord(word: string, lang = 'en-US') {
  const key = word.trim().toLowerCase();
  const url = await resolveWordAudio(key);
  if (url) playUrl(url);
  else speak(word, lang);
}

// Use recorded audio for single English words; TTS otherwise.
export function pronounce(text: string, lang = 'en-US') {
  const t = text.trim();
  if (lang.startsWith('en') && /^[a-z][a-z'-]*$/i.test(t)) return speakWord(t, lang);
  return speak(text, lang);
}

// --- Speech recognition ---
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
