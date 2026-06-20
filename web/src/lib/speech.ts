// Browser Text-to-Speech (free, offline-ish) and Speech Recognition helpers.

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

function pickVoice(lang: string) {
  const voices = voicesCache.length ? voicesCache : loadVoices();
  const exact = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
  return exact || voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
}

export function speak(text: string, lang = 'en-US', rate = 0.92) {
  if (typeof speechSynthesis === 'undefined' || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const v = pickVoice(lang);
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// --- Speech recognition (pronunciation practice; Chrome/Safari) ---
type SR = typeof window & {
  SpeechRecognition?: any; webkitSpeechRecognition?: any;
};
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
    rec.onend = () => { /* resolved via onresult */ };
    rec.start();
  });
}
