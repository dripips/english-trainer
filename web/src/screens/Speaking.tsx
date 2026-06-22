import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mic, ChevronDown, ChevronUp, Timer, ArrowRight, BookOpen, RotateCcw, Play, Square } from 'lucide-react';
import { Header } from '../components/Header';
import { WritingChecker } from '../components/WritingChecker';

type Part = 'p1' | 'p2' | 'p3';

// A question you can expand to answer (by voice or text) and get AI feedback.
function AnswerableQuestion({ q }: { q: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="overflow-hidden rounded-xl bg-[var(--color-bg2)]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm leading-snug">
        <span className="flex-1">{q}</span>
        <span className="mt-0.5 shrink-0 text-[10px] font-semibold text-[var(--color-primary)]">{open ? 'скрыть' : 'ответить'}</span>
      </button>
      {open && (
        <div className="border-t border-[var(--color-surface2)] p-3">
          <WritingChecker mode="speaking" task={q} voice placeholder="Скажи (🎙 Голос) или напиши свой ответ на английском…" />
        </div>
      )}
    </li>
  );
}

const P1_QUESTIONS: { topic: string; qs: string[] }[] = [
  { topic: 'Работа / Учёба', qs: [
    'Do you work or are you a student?',
    'What do you do in your job? Do you enjoy it?',
    'Would you like to change your job in the future? Why?',
    'What was your favourite subject at school? Why?',
  ]},
  { topic: 'Дом / Жильё', qs: [
    'Where do you live at the moment?',
    'Do you live in a house or a flat? Do you prefer one to the other?',
    'What do you like most about where you live?',
    'Would you like to move somewhere different in the future?',
  ]},
  { topic: 'Свободное время', qs: [
    'What do you like to do in your free time?',
    'Do you prefer spending time indoors or outdoors? Why?',
    'How do you usually spend your weekends?',
    'Is there a hobby you would like to take up? Why?',
  ]},
  { topic: 'Путешествия', qs: [
    'Do you enjoy travelling? Why or why not?',
    'What kind of places do you like to visit on holiday?',
    'Have you ever visited another country? Tell me about it.',
    'Do you prefer travelling alone or with others?',
  ]},
  { topic: 'Технологии', qs: [
    'How often do you use the internet? What do you use it for?',
    'Do you use social media? What do you think of it?',
    'Has technology changed the way you communicate with friends?',
    'Do you think people spend too much time on their phones?',
  ]},
  { topic: 'Еда', qs: [
    'Do you enjoy cooking? How often do you cook at home?',
    'What is your favourite type of food? Why?',
    'Do you prefer eating at home or in restaurants?',
    'Have you ever tried food from another country? Did you like it?',
  ]},
];

const P2_CUES: { topic: string; cue: string; bullets: string[]; followUp: string }[] = [
  {
    topic: 'Memorable event',
    cue: 'Describe a memorable event from your past.',
    bullets: ['What the event was', 'When and where it happened', 'Who was there with you', 'Why it was so memorable'],
    followUp: 'Do you often think about this event?',
  },
  {
    topic: 'Helpful person',
    cue: 'Describe a person who has been very helpful to you.',
    bullets: ['Who this person is', 'How you know them', 'How they helped you', 'Why their help was important'],
    followUp: 'Do you think it is important to help others? Why?',
  },
  {
    topic: 'Favourite place',
    cue: 'Describe a place you enjoy visiting.',
    bullets: ['Where the place is', 'How often you go there', 'What you do there', 'Why you like it so much'],
    followUp: 'Would you recommend this place to others? Why?',
  },
  {
    topic: 'Skill or talent',
    cue: 'Describe a skill or talent you would like to learn.',
    bullets: ['What the skill is', 'Why you want to learn it', 'How you would go about learning it', 'What you would use it for'],
    followUp: 'Do you think it is ever too late to learn a new skill?',
  },
  {
    topic: 'Interesting book/film',
    cue: 'Describe a book or film you found interesting.',
    bullets: ['What it was about', 'When you read/watched it', 'What you found interesting about it', 'Would you recommend it?'],
    followUp: 'Do you think films or books are more educational?',
  },
];

const P3_QUESTIONS: { topic: string; qs: string[] }[] = [
  { topic: 'Технологии и общество', qs: [
    'How has technology changed the way people communicate compared to the past?',
    'Do you think social media brings people together or drives them apart?',
    'What are the disadvantages of people relying too much on technology?',
    'How might technology change education in the future?',
  ]},
  { topic: 'Окружающая среда', qs: [
    'What do you think are the most serious environmental problems today?',
    'Should individuals or governments be responsible for protecting the environment?',
    'How can people be encouraged to use public transport instead of cars?',
    'Do you think the younger generation cares more about the environment than older people?',
  ]},
  { topic: 'Работа и карьера', qs: [
    'What qualities make a good employer, in your opinion?',
    'Do you think it is better to have one career throughout your life or change careers?',
    'How important is work-life balance? Do people achieve it nowadays?',
    'How do you think the workplace will change in the next 20 years?',
  ]},
  { topic: 'Образование', qs: [
    'What are the advantages and disadvantages of studying abroad?',
    'Should education be free for everyone? Why or why not?',
    'How important are practical skills compared to academic knowledge?',
    'Do you think teachers or technology play a greater role in learning?',
  ]},
];

const TIPS = [
  { icon: '💬', text: 'Well, that\'s an interesting question…' },
  { icon: '🔗', text: 'This is because… / For example…' },
  { icon: '↔️', text: 'On the one hand… On the other hand…' },
  { icon: '💡', text: 'What I mean is… / It\'s a kind of…' },
  { icon: '🎯', text: 'Personally, I think… / In my view,…' },
  { icon: '↩️', text: 'Having said that, / Nevertheless,' },
];

function useTimer(initial: number) {
  const [secs, setSecs] = useState(initial);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSecs((s) => {
          if (s <= 1) { setRunning(false); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const start = () => { setSecs(initial); setRunning(true); };
  const stop = () => setRunning(false);
  const reset = () => { setRunning(false); setSecs(initial); };
  const fmt = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return { secs, running, start, stop, reset, fmt, done: secs === 0 };
}

function TimerBadge({ seconds, label }: { seconds: number; label: string }) {
  const t = useTimer(seconds);
  return (
    <div className="flex items-center gap-2">
      <div className={`font-mono text-lg font-bold tabular-nums ${t.done ? 'text-[var(--color-danger)]' : t.running ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'}`}>
        {t.fmt}
      </div>
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
      {!t.running
        ? <button onClick={t.start} className="rounded-lg bg-[var(--color-surface2)] p-1.5"><Play size={14} /></button>
        : <button onClick={t.stop} className="rounded-lg bg-[var(--color-surface2)] p-1.5"><Square size={14} /></button>
      }
      <button onClick={t.reset} className="rounded-lg bg-[var(--color-surface2)] p-1.5"><RotateCcw size={14} /></button>
    </div>
  );
}

function P1Tab() {
  const [openTopic, setOpenTopic] = useState<string | null>(P1_QUESTIONS[0].topic);
  return (
    <div className="space-y-3">
      <div className="card text-sm">
        <p className="font-semibold">Как отвечать на Part 1</p>
        <p className="mt-1 text-[var(--color-muted)]">2–3 предложения: Answer → Reason → Example. <span className="text-[var(--color-danger)]">Не односложно!</span> Раскрой вопрос → ответь голосом или текстом → AI разберёт.</p>
        <TimerBadge seconds={30} label="≈ 30 сек на ответ" />
      </div>
      {P1_QUESTIONS.map((t) => (
        <div key={t.topic} className="card !p-0 overflow-hidden">
          <button className="flex w-full items-center justify-between px-4 py-3 font-semibold"
            onClick={() => setOpenTopic(openTopic === t.topic ? null : t.topic)}>
            {t.topic}
            {openTopic === t.topic ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {openTopic === t.topic && (
            <ul className="border-t border-[var(--color-bg2)] px-4 pb-3 pt-2 space-y-2">
              {t.qs.map((q) => <AnswerableQuestion key={q} q={q} />)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function P2Tab() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'prep' | 'speak' | 'follow'>('prep');
  const cue = P2_CUES[idx];

  function next() {
    setIdx((i) => (i + 1) % P2_CUES.length);
    setPhase('prep');
  }

  return (
    <div className="space-y-3">
      <div className="card !bg-[color-mix(in_srgb,var(--color-amber)_10%,var(--color-surface))]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-amber)]">{cue.topic}</p>
            <p className="mt-1 text-sm font-semibold leading-snug">{cue.cue}</p>
          </div>
          <button onClick={next} className="shrink-0 rounded-xl bg-[var(--color-surface2)] px-3 py-1.5 text-xs font-semibold">Следующая</button>
        </div>
        <ul className="mt-3 space-y-1.5">
          {cue.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-[var(--color-muted)]">
              <span className="font-bold text-[var(--color-amber)]">{'▸'}</span>{b}
            </li>
          ))}
        </ul>
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide text-xs">Таймер</p>
        <div className="flex flex-col gap-2">
          <TimerBadge seconds={60} label="1 мин — подготовка" />
          <TimerBadge seconds={120} label="2 мин — монолог" />
        </div>
      </div>

      <div>
        <p className="mb-1.5 px-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Твой монолог — скажи или напиши, и проверь</p>
        <WritingChecker key={idx} mode="speaking" task={cue.cue} voice placeholder="Запиши свой 2-минутный ответ (🎙 Голос или текстом)…" />
      </div>

      {phase !== 'follow' && (
        <button onClick={() => setPhase('follow')}
          className="btn btn-ghost w-full text-sm">
          Показать follow-up вопрос
        </button>
      )}
      {phase === 'follow' && (
        <div className="card !bg-[color-mix(in_srgb,var(--color-sky)_10%,var(--color-surface))] text-sm">
          <p className="font-semibold text-[var(--color-sky)]">Follow-up</p>
          <p className="mt-1">{cue.followUp}</p>
        </div>
      )}
    </div>
  );
}

function P3Tab() {
  const [openTopic, setOpenTopic] = useState<string | null>(P3_QUESTIONS[0].topic);
  return (
    <div className="space-y-3">
      <div className="card text-sm">
        <p className="font-semibold">Как отвечать на Part 3</p>
        <p className="mt-1 text-[var(--color-muted)]">Развёрнуто: позиция → причина → пример → контраргумент. Используй академические фразы.</p>
        <div className="mt-2">
          <TimerBadge seconds={60} label="≈ 1 мин на ответ" />
        </div>
      </div>
      {P3_QUESTIONS.map((t) => (
        <div key={t.topic} className="card !p-0 overflow-hidden">
          <button className="flex w-full items-center justify-between px-4 py-3 font-semibold"
            onClick={() => setOpenTopic(openTopic === t.topic ? null : t.topic)}>
            {t.topic}
            {openTopic === t.topic ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {openTopic === t.topic && (
            <ul className="border-t border-[var(--color-bg2)] px-4 pb-3 pt-2 space-y-2">
              {t.qs.map((q) => <AnswerableQuestion key={q} q={q} />)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export function Speaking() {
  const [tab, setTab] = useState<Part>('p2');

  return (
    <div>
      <Header back title="IELTS Speaking" />

      <div className="mb-3 flex rounded-2xl bg-[var(--color-bg2)] p-1">
        {([['p1', 'Part 1'], ['p2', 'Part 2'], ['p3', 'Part 3']] as [Part, string][]).map(([p, label]) => (
          <button key={p} onClick={() => setTab(p)}
            className={`flex flex-1 items-center justify-center rounded-xl py-2 text-xs font-semibold transition
              ${tab === p ? 'bg-[var(--color-surface2)] text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TIPS.map((t) => (
          <span key={t.text} className="rounded-xl bg-[var(--color-surface2)] px-2.5 py-1.5 text-xs leading-tight">
            <span className="mr-1">{t.icon}</span>{t.text}
          </span>
        ))}
      </div>

      {tab === 'p1' && <P1Tab />}
      {tab === 'p2' && <P2Tab />}
      {tab === 'p3' && <P3Tab />}

      <div className="mt-4">
        <Link to="/lessons/ielts-speaking" className="card flex items-center gap-3 active:scale-[0.98]">
          <Mic size={20} className="shrink-0 text-[var(--color-primary)]" />
          <div className="flex-1 text-sm font-semibold">Урок: Speaking — фразы и стратегии</div>
          <ArrowRight size={16} className="shrink-0 text-[var(--color-muted)]" />
        </Link>
      </div>
    </div>
  );
}
