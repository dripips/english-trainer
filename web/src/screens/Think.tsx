import { useRef, useState, useEffect, type ReactNode } from 'react';
import {
  Brain, Eye, MessageCircle, Images, Ear, Sun, Volume2, Mic, Square,
  ArrowRight, CheckCircle2, XCircle, RotateCcw,
} from 'lucide-react';
import { Header } from '../components/Header';
import { SpeakButton } from '../components/ui';
import { WritingChecker } from '../components/WritingChecker';
import { speak } from '../lib/speech';
import { normalizeAnswer } from '../lib/check';

// "Think in English (stop translating in your head)" — five daily exercises.
// Ported from the method in https://youtu.be/MpiWuR-yL9k.

type TabId = 'name' | 'self' | 'pics' | 'shadow' | 'moments';

const EXERCISES: { id: TabId; n: number; short: string; title: string; icon: typeof Eye; tagline: string }[] = [
  { id: 'name',    n: 1, short: 'Назови',     title: 'Назови всё вокруг',        icon: Eye,           tagline: 'смотри на предметы и называй их по-английски — без перевода в голове' },
  { id: 'self',    n: 2, short: 'Сам с собой', title: 'Говори сам с собой',      icon: MessageCircle, tagline: 'наедине нет давления — проговаривай свои действия вслух' },
  { id: 'pics',    n: 3, short: 'Картинки',    title: 'Картинки вместо перевода', icon: Images,        tagline: 'связывай слово с образом, а не с русским переводом' },
  { id: 'shadow',  n: 4, short: 'Повторяй',    title: 'Слушай и повторяй',       icon: Ear,           tagline: 'услышал фразу — сразу повтори, копируя темп и интонацию' },
  { id: 'moments', n: 5, short: 'Моменты',     title: 'Проживай моменты дня',    icon: Sun,           tagline: 'выбери кусочек дня и думай в нём только по-английски' },
];

// --- small shared bits -------------------------------------------------------

function ModelLine({ en }: { en: string }) {
  return (
    <button
      onClick={() => speak(en)}
      className="flex w-full items-center gap-2 rounded-xl bg-[var(--color-bg2)] px-3 py-2 text-left text-sm active:scale-[0.98]"
    >
      <Volume2 size={15} className="shrink-0 text-[var(--color-sky)]" />
      <span className="flex-1 leading-snug">{en}</span>
    </button>
  );
}

function WordChip({ word, emoji }: { word: string; emoji: string }) {
  return (
    <button
      onClick={() => speak(word)}
      className="flex items-center gap-1.5 rounded-full bg-[var(--color-bg2)] px-3 py-1.5 text-sm active:scale-95"
    >
      <span>{emoji}</span><span className="font-semibold">{word}</span>
    </button>
  );
}

function Intro({ children }: { children: ReactNode }) {
  return <div className="card text-sm leading-relaxed text-[var(--color-muted)]">{children}</div>;
}

// --- exercise 1: name everything around you ---------------------------------

const NAME_SCENES: { label: string; words: [string, string][] }[] = [
  { label: 'Комната', words: [['phone', '📱'], ['chair', '🪑'], ['window', '🪟'], ['bed', '🛏️'], ['lamp', '💡'], ['book', '📖'], ['door', '🚪'], ['bag', '🎒']] },
  { label: 'Кухня',   words: [['cup', '☕'], ['water', '💧'], ['bottle', '🍼'], ['knife', '🔪'], ['plate', '🍽️'], ['apple', '🍎'], ['spoon', '🥄'], ['bread', '🍞']] },
  { label: 'Улица',   words: [['car', '🚗'], ['tree', '🌳'], ['shop', '🏬'], ['road', '🛣️'], ['dog', '🐕'], ['sky', '☁️'], ['bus', '🚌'], ['bench', '🪑']] },
];

function NameAround() {
  const [scene, setScene] = useState(0);
  const s = NAME_SCENES[scene];
  return (
    <div className="space-y-3">
      <Intro>
        Осмотрись и называй предметы вслух <b className="text-[var(--color-text)]">сразу по-английски</b>, не переводя.
        Потом складывай простые фразы: <i>«My phone is on the table»</i>, <i>«The window is open»</i>.
        Сначала мозг всё равно будет переводить — это нормально, со временем пройдёт.
      </Intro>

      <div className="flex gap-2">
        {NAME_SCENES.map((sc, i) => (
          <button
            key={sc.label}
            onClick={() => setScene(i)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              i === scene ? 'bg-[var(--color-surface2)] text-[var(--color-text)]' : 'bg-[var(--color-bg2)] text-[var(--color-muted)]'
            }`}
          >
            {sc.label}
          </button>
        ))}
      </div>

      <div className="card space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Нажми, чтобы услышать</p>
        <div className="flex flex-wrap gap-2">
          {s.words.map(([w, e]) => <WordChip key={w} word={w} emoji={e} />)}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1 text-xs text-[var(--color-muted)]">
          <span className="rounded-lg bg-[var(--color-bg2)] px-2 py-1">My ___ is here.</span>
          <span className="rounded-lg bg-[var(--color-bg2)] px-2 py-1">The ___ is on the table.</span>
          <span className="rounded-lg bg-[var(--color-bg2)] px-2 py-1">I can see a ___.</span>
        </div>
      </div>

      <div>
        <p className="mb-1.5 px-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Составь свои фразы — скажи или напиши, AI проверит</p>
        <WritingChecker mode="speaking" voice task="Name the objects you see around you and make simple English sentences about them."
          placeholder="Напр.: My phone is on the table. The window is open." />
      </div>
    </div>
  );
}

// --- exercises 2 & 5: narrate a moment --------------------------------------

function NarrateMoments({ intro, moments, placeholder }: {
  intro: ReactNode;
  moments: { label: string; task: string; lines: string[] }[];
  placeholder: string;
}) {
  const [i, setI] = useState(0);
  const m = moments[i];
  return (
    <div className="space-y-3">
      <Intro>{intro}</Intro>

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{m.label}</p>
          <button onClick={() => setI((x) => (x + 1) % moments.length)}
            className="shrink-0 rounded-xl bg-[var(--color-surface2)] px-3 py-1.5 text-xs font-semibold">
            Другой момент
          </button>
        </div>
        <div className="space-y-1.5">
          {m.lines.map((l) => <ModelLine key={l} en={l} />)}
        </div>
      </div>

      <div>
        <p className="mb-1.5 px-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Теперь проговори сам — голосом или текстом</p>
        <WritingChecker key={i} mode="speaking" voice task={m.task} placeholder={placeholder} />
      </div>
    </div>
  );
}

const SELF_MOMENTS = [
  { label: 'Утро', task: 'Describe your morning routine in simple English.', lines: ['I need to get out of bed.', 'I feel a bit sleepy today.', "Let's start the day."] },
  { label: 'Чай / кофе', task: 'Describe making tea or coffee in simple English.', lines: ['The water is getting hot.', 'I need some sugar.', 'This coffee smells good.'] },
  { label: 'Сборы', task: 'Describe getting ready to leave home, in simple English.', lines: ['Where are my keys?', 'I have to hurry.', "It's time to go."] },
  { label: 'Прогулка', task: 'Describe a short walk outside in simple English.', lines: ["It's a bit cold today.", "I'll walk to the shop.", 'Look at those trees.'] },
];

const DAY_MOMENTS = [
  { label: 'Чищу зубы', task: 'Describe brushing your teeth in simple English.', lines: ["I'm brushing my teeth.", 'The water is cold.', 'Almost done.'] },
  { label: 'Ем', task: 'Describe the food you are eating — taste, smell, texture.', lines: ['This food tastes great.', 'It smells delicious.', "I'm still a little hungry."] },
  { label: 'На улице', task: 'Describe what you see, hear and feel outside right now.', lines: ['The sky looks beautiful today.', 'That man is wearing a blue jacket.', 'I can hear some birds.'] },
  { label: 'Перед сном', task: 'Describe how you feel at the end of the day, in simple English.', lines: ['I feel relaxed now.', 'Today was a good day.', 'Time to sleep.'] },
];

// --- exercise 3: pictures instead of translation ----------------------------

const PIC_WORDS: { word: string; emoji: string; scene: string; ru: string }[] = [
  { word: 'hungry', emoji: '🍕', scene: 'You see delicious food after a long day.', ru: 'голодный' },
  { word: 'angry',  emoji: '😠', scene: 'Someone is shouting with an upset face.', ru: 'злой, сердитый' },
  { word: 'run',    emoji: '🏃', scene: 'A person runs quickly along the road.', ru: 'бежать' },
  { word: 'tired',  emoji: '😴', scene: "Your eyes are closing and you can't keep them open.", ru: 'усталый' },
  { word: 'happy',  emoji: '😄', scene: 'You smile because something good happened.', ru: 'счастливый, радостный' },
  { word: 'cold',   emoji: '🥶', scene: 'You shiver and want a warm jacket.', ru: 'холодный, мёрзнуть' },
  { word: 'hot',    emoji: '☀️', scene: 'The sun burns and you want some water.', ru: 'жаркий, горячий' },
  { word: 'big',    emoji: '🐘', scene: 'An elephant fills the whole room.', ru: 'большой' },
  { word: 'small',  emoji: '🐜', scene: 'A tiny ant sits on your finger.', ru: 'маленький' },
  { word: 'fast',   emoji: '🚀', scene: 'A rocket shoots up into the sky.', ru: 'быстрый' },
  { word: 'slow',   emoji: '🐌', scene: 'A snail crawls across the path.', ru: 'медленный' },
  { word: 'heavy',  emoji: '🧱', scene: 'You lift a box full of bricks.', ru: 'тяжёлый' },
  { word: 'open',   emoji: '🚪', scene: 'The door swings wide open.', ru: 'открытый, открывать' },
  { word: 'buy',    emoji: '🛒', scene: 'You put things in a cart and pay.', ru: 'покупать' },
  { word: 'sleep',  emoji: '🛌', scene: 'You close your eyes in a soft, warm bed.', ru: 'спать' },
  { word: 'drink',  emoji: '🥤', scene: 'You sip cold water through a straw.', ru: 'пить' },
  { word: 'jump',   emoji: '🤸', scene: 'You push off the ground into the air.', ru: 'прыгать' },
  { word: 'afraid', emoji: '😱', scene: 'Your heart beats fast in the dark.', ru: 'испуганный' },
];

function PictureCards() {
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);
  const c = PIC_WORDS[i];
  function next() { setReveal(false); setI((x) => (x + 1) % PIC_WORDS.length); }
  return (
    <div className="space-y-3">
      <Intro>
        Новое слово связывай <b className="text-[var(--color-text)]">не с русским словом</b>, а с картинкой, действием или чувством.
        Посмотри на образ, услышь слово и представь сцену — мозг запоминает образы быстрее перевода.
      </Intro>

      <div className="card flex flex-col items-center gap-3 py-6 text-center">
        <div className="text-7xl leading-none">{c.emoji}</div>
        <div className="flex items-center gap-2">
          <span className="display text-3xl font-bold">{c.word}</span>
          <SpeakButton text={c.word} size={18} className="!h-9 !w-9" />
        </div>
        <p className="max-w-xs text-sm text-[var(--color-muted)]">{c.scene}</p>

        {reveal ? (
          <p className="text-sm"><span className="text-[var(--color-muted)]">по-русски: </span><b>{c.ru}</b></p>
        ) : (
          <button onClick={() => setReveal(true)} className="text-xs font-semibold text-[var(--color-muted)] underline underline-offset-2">
            что это значит?
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-muted)]">{i + 1} / {PIC_WORDS.length}</span>
        <button onClick={next} className="btn btn-primary !py-2 !px-5 text-sm">Дальше <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}

// --- exercise 4: listen and repeat (shadowing) ------------------------------

const SHADOW: string[] = [
  "I don't know what happened.",
  'Can you help me, please?',
  'What time is it now?',
  "I'm going to the shop.",
  "It's a beautiful day today.",
  'I would like a cup of tea.',
  'See you tomorrow.',
  'Let me think about it.',
  'How was your day?',
  "I'm a little tired today.",
  'That sounds like a good idea.',
  'Thank you very much.',
];

const SRClass: any = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : undefined;

function Shadowing() {
  const [i, setI] = useState(0);
  const [heard, setHeard] = useState('');
  const [state, setState] = useState<'idle' | 'listening' | 'done'>('idle');
  const recRef = useRef<any>(null);
  const target = SHADOW[i];
  const ok = state === 'done' && normalizeAnswer(heard) === normalizeAnswer(target);

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* ignore */ } }, []);

  function record() {
    if (!SRClass) return;
    if (state === 'listening') { try { recRef.current?.stop(); } catch { /* ignore */ } return; }
    const rec = new SRClass();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: any) => { setHeard(e.results[0][0].transcript.trim()); setState('done'); };
    rec.onerror = () => setState('idle');
    rec.onend = () => setState((s) => (s === 'listening' ? 'idle' : s));
    recRef.current = rec;
    setHeard(''); setState('listening');
    try { rec.start(); } catch { setState('idle'); }
  }
  function next() { setHeard(''); setState('idle'); setI((x) => (x + 1) % SHADOW.length); }

  return (
    <div className="space-y-3">
      <Intro>
        Бери <b className="text-[var(--color-text)]">лёгкие</b> фразы, слушай и <b className="text-[var(--color-text)]">сразу повторяй</b> вслух —
        копируй произношение, скорость и интонацию. Не бери слишком сложное: лёгкое → уверенность → постоянство.
      </Intro>

      <button onClick={() => speak(target)} className="card flex w-full items-center justify-center gap-3 py-7 active:scale-[0.98]">
        <Volume2 size={26} className="text-[var(--color-sky)]" />
        <span className="text-lg font-semibold">{target}</span>
      </button>

      {SRClass ? (
        <button
          onClick={record}
          className={`btn w-full ${state === 'listening' ? '!bg-[var(--color-danger)] !text-white' : 'btn-primary'}`}
        >
          {state === 'listening' ? <><Square size={18} className="animate-pulse" /> Слушаю… стоп</> : <><Mic size={18} /> Повторить вслух</>}
        </button>
      ) : (
        <div className="card text-center text-xs text-[var(--color-muted)]">
          Этот браузер не умеет распознавать речь. Повтори фразу вслух сам, затем нажми «Дальше».
        </div>
      )}

      {state === 'done' && (
        <div className={`card flex items-start gap-2 text-sm ${ok
          ? '!bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))]'
          : '!bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-surface))]'}`}>
          {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
              : <XCircle size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />}
          <div className="min-w-0">
            <p className="font-semibold">{ok ? 'Отлично, точь-в-точь!' : 'Почти — попробуй ещё раз'}</p>
            <p className="text-[var(--color-muted)]">услышал: «{heard || '…'}»</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-muted)]">{i + 1} / {SHADOW.length}</span>
        <div className="flex gap-2">
          {state === 'done' && !ok && SRClass && (
            <button onClick={record} className="btn btn-ghost !py-2 !px-4 text-sm"><RotateCcw size={15} /> Ещё раз</button>
          )}
          <button onClick={next} className="btn btn-primary !py-2 !px-5 text-sm">Дальше <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// --- screen ------------------------------------------------------------------

export function Think() {
  const [tab, setTab] = useState<TabId>('name');
  const current = EXERCISES.find((e) => e.id === tab)!;

  return (
    <div>
      <Header back title="Думай на английском" subtitle="перестань переводить в голове" />

      <div className="card mb-4 flex gap-3 !bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))]">
        <Brain size={20} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
        <p className="text-sm leading-relaxed">
          Думать на английском — это <b>путь</b> к беглости, а не её итог. Мозг как мышца: тренируешь перевод — быстрее переводишь;
          тренируешь прямое мышление — быстрее думаешь на английском. Делай по одному упражнению в день.
        </p>
      </div>

      {/* 5-step picker */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {EXERCISES.map((e) => {
          const active = e.id === tab;
          return (
            <button
              key={e.id}
              onClick={() => setTab(e.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full py-2 pl-1.5 pr-3 text-sm font-semibold transition ${
                active ? 'bg-[var(--color-surface2)] text-[var(--color-text)]' : 'bg-[var(--color-bg2)] text-[var(--color-muted)]'
              }`}
            >
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                active ? 'bg-[var(--color-primary)] text-[#160f33]' : 'bg-[var(--color-surface2)]'
              }`}>{e.n}</span>
              {e.short}
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <current.icon size={18} className="text-[var(--color-primary)]" />
        <div>
          <h2 className="font-bold leading-tight">{current.title}</h2>
          <p className="text-xs text-[var(--color-muted)]">{current.tagline}</p>
        </div>
      </div>

      {tab === 'name' && <NameAround />}
      {tab === 'self' && (
        <NarrateMoments
          intro={<>Наедине нет давления и страха ошибиться. Проговаривай свои действия вслух простыми фразами — простой английский каждый день сильнее, чем продвинутый, которым ты не пользуешься.</>}
          moments={SELF_MOMENTS}
          placeholder="Проговори этот момент: I need to get out of bed…"
        />
      )}
      {tab === 'pics' && <PictureCards />}
      {tab === 'shadow' && <Shadowing />}
      {tab === 'moments' && (
        <NarrateMoments
          intro={<>Выбери маленький кусочек дня и думай в нём <b className="text-[var(--color-text)]">только по-английски</b>: чистишь зубы, ешь, идёшь по улице. Сначала мозг устаёт — это новая привычка, но скоро фразы начнут приходить сами.</>}
          moments={DAY_MOMENTS}
          placeholder="Опиши момент: The sky looks beautiful today…"
        />
      )}
    </div>
  );
}
