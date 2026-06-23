import { useMemo, useState } from 'react';
import { Ear, Volume2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Header } from '../components/Header';
import { SpeakButton } from '../components/ui';
import { speak } from '../lib/speech';

type Contrast = { id: string; title: string; ru: string; pairs: [string, string][] };

const CONTRASTS: Contrast[] = [
  { id: 'i-ii', title: '/ɪ/ vs /iː/', ru: 'короткий «и» против долгого «ии»',
    pairs: [['ship', 'sheep'], ['bit', 'beat'], ['sit', 'seat'], ['live', 'leave'], ['fit', 'feet'], ['chip', 'cheap'], ['it', 'eat'], ['fill', 'feel']] },
  { id: 'ae-e', title: '/æ/ vs /e/', ru: 'открытый «э» против «е»',
    pairs: [['bad', 'bed'], ['man', 'men'], ['sat', 'set'], ['had', 'head'], ['bat', 'bet'], ['pan', 'pen'], ['land', 'lend']] },
  { id: 'u-ae', title: '/ʌ/ vs /æ/', ru: '«а» (cup) против «э» (cap)',
    pairs: [['cup', 'cap'], ['cut', 'cat'], ['run', 'ran'], ['bug', 'bag'], ['fun', 'fan'], ['hut', 'hat'], ['uncle', 'ankle']] },
  { id: 'th-s', title: '/θ/ vs /s/', ru: 'межзубный «th» против «с»',
    pairs: [['think', 'sink'], ['thick', 'sick'], ['thing', 'sing'], ['mouth', 'mouse'], ['path', 'pass'], ['thumb', 'sum']] },
  { id: 'v-w', title: '/v/ vs /w/', ru: '«в» (зубы-губа) против «у» (губы трубочкой)',
    pairs: [['vest', 'west'], ['vine', 'wine'], ['verse', 'worse'], ['veal', 'wheel'], ['vary', 'wary']] },
  { id: 'l-r', title: '/l/ vs /r/', ru: '«л» против «р»',
    pairs: [['light', 'right'], ['lead', 'read'], ['glass', 'grass'], ['collect', 'correct'], ['long', 'wrong'], ['alive', 'arrive']] },
];

function Browse() {
  return (
    <div className="space-y-4">
      <div className="card text-sm text-[var(--color-muted)]">Нажми на слово, чтобы услышать. Слушай разницу между парами — это «минимальные пары», которые путают чаще всего.</div>
      {CONTRASTS.map((c) => (
        <div key={c.id} className="card">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="display font-bold">{c.title}</span>
            <span className="text-xs text-[var(--color-muted)]">{c.ru}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {c.pairs.map(([a, b]) => (
              <div key={a + b} className="contents">
                <button onClick={() => speak(a)} className="flex items-center justify-between rounded-xl bg-[var(--color-bg2)] px-3 py-2 text-sm active:scale-[0.97]">
                  <span className="font-semibold">{a}</span><Volume2 size={15} className="text-[var(--color-sky)]" />
                </button>
                <button onClick={() => speak(b)} className="flex items-center justify-between rounded-xl bg-[var(--color-bg2)] px-3 py-2 text-sm active:scale-[0.97]">
                  <span className="font-semibold">{b}</span><Volume2 size={15} className="text-[var(--color-mint)]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Quiz() {
  const all = useMemo(() => CONTRASTS.flatMap((c) => c.pairs), []);
  const [pair, setPair] = useState<[string, string]>(() => all[Math.floor(Math.random() * all.length)]);
  const [target, setTarget] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });

  function newRound(play = true) {
    const p = all[Math.floor(Math.random() * all.length)];
    const t = Math.random() < 0.5 ? 0 : 1;
    setPair(p); setTarget(t); setPicked(null);
    if (play) setTimeout(() => speak(p[t]), 120);
  }
  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    setScore((s) => ({ ok: s.ok + (i === target ? 1 : 0), total: s.total + 1 }));
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between">
        <span className="text-sm text-[var(--color-muted)]">Какое слово ты услышал?</span>
        <span className="display font-bold">{score.ok}/{score.total}</span>
      </div>
      <button onClick={() => speak(pair[target])} className="card flex w-full items-center justify-center gap-2 py-6 active:scale-[0.98]">
        <Volume2 size={28} className="text-[var(--color-sky)]" /> <span className="font-semibold">Прослушать</span>
      </button>
      <div className="grid grid-cols-2 gap-3">
        {pair.map((w, i) => {
          const isTarget = i === target;
          let cls = 'bg-[var(--color-surface2)]';
          if (picked !== null) {
            if (isTarget) cls = '!bg-[color-mix(in_srgb,var(--color-success)_22%,transparent)] !border-[var(--color-success)]';
            else if (i === picked) cls = '!bg-[color-mix(in_srgb,var(--color-danger)_22%,transparent)] !border-[var(--color-danger)]';
          }
          return (
            <button key={w} onClick={() => pick(i)} disabled={picked !== null}
              className={`card flex items-center justify-center gap-2 border py-5 text-lg font-bold active:scale-[0.97] ${cls}`}>
              {w}
              {picked !== null && isTarget && <CheckCircle2 size={18} className="text-[var(--color-success)]" />}
              {picked !== null && i === picked && !isTarget && <XCircle size={18} className="text-[var(--color-danger)]" />}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm">
            <SpeakButton text={pair[target]} size={16} className="!h-8 !w-8" />
            <span className="text-[var(--color-muted)]">правильно: <b className="text-[var(--color-text)]">{pair[target]}</b></span>
          </div>
          <button onClick={() => newRound()} className="btn btn-primary w-full">Дальше <ArrowRight size={18} /></button>
        </div>
      )}
    </div>
  );
}

export function Pronunciation() {
  const [tab, setTab] = useState<'browse' | 'quiz'>('browse');
  return (
    <div>
      <Header back title="Произношение" subtitle="минимальные пары — слушай разницу" />
      <div className="mb-4 flex rounded-2xl bg-[var(--color-bg2)] p-1">
        {([['browse', 'Слушай и сравни', Volume2], ['quiz', 'Угадай на слух', Ear]] as [string, string, typeof Ear][]).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t as 'browse' | 'quiz')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition
              ${tab === t ? 'bg-[var(--color-surface2)] text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      {tab === 'browse' ? <Browse /> : <Quiz />}
    </div>
  );
}
