import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../api';
import { Header } from '../components/Header';
import { Spinner, SpeakButton } from '../components/ui';
import type { Word } from '../types';

type Tab = 'verbs' | 'plurals' | 'compare' | 'spelling';

const IRREGULAR_PLURALS: [string, string, string][] = [
  ['man', 'men', 'мужчина'],
  ['woman', 'women', 'женщина'],
  ['child', 'children', 'ребёнок'],
  ['person', 'people', 'человек'],
  ['foot', 'feet', 'нога (ступня)'],
  ['tooth', 'teeth', 'зуб'],
  ['mouse', 'mice', 'мышь'],
  ['goose', 'geese', 'гусь'],
  ['fish', 'fish', 'рыба'],
  ['sheep', 'sheep', 'овца'],
  ['deer', 'deer', 'олень'],
  ['leaf', 'leaves', 'лист'],
  ['knife', 'knives', 'нож'],
  ['wife', 'wives', 'жена'],
  ['life', 'lives', 'жизнь'],
];

const IRREGULAR_COMPARE: [string, string, string, string][] = [
  ['good', 'better', 'the best', 'хороший'],
  ['bad', 'worse', 'the worst', 'плохой'],
  ['far', 'further / farther', 'the furthest', 'далёкий'],
  ['little', 'less', 'the least', 'мало'],
  ['much / many', 'more', 'the most', 'много'],
  ['old', 'older / elder', 'the oldest / eldest', 'старый'],
];

function Table({ head, rows }: { head: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="card !p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-bg2)] text-left text-xs text-[var(--color-muted)]">
            {head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--color-bg2)] last:border-0">
              {r.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Exceptions() {
  const [tab, setTab] = useState<Tab>('verbs');
  const [verbs, setVerbs] = useState<Word[] | null>(null);

  useEffect(() => {
    if (tab === 'verbs' && !verbs) {
      api.vocabWords({ category: 'irregular-verbs', limit: 200 }).then((r) => setVerbs(r.words));
    }
  }, [tab, verbs]);

  return (
    <div>
      <Header back title="Исключения" subtitle="то, что нужно запомнить наизусть" />

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {([['verbs', 'Глаголы'], ['plurals', 'Множ. число'], ['compare', 'Сравнения'], ['spelling', 'Написание']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition
              ${tab === t ? 'bg-[var(--color-primary)] text-[#160f33]' : 'bg-[var(--color-surface2)] text-[var(--color-muted)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'verbs' && (
        <div className="space-y-3">
          <div className="card flex items-start gap-2 !bg-[color-mix(in_srgb,var(--color-amber)_10%,var(--color-surface))] text-sm">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--color-amber)]" />
            <span>Неправильные глаголы не подчиняются правилу <b>+ed</b>. Учи тройками: <b>infinitive → past → past participle</b>.</span>
          </div>
          {!verbs ? <Spinner /> : (
            <div className="card !p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-bg2)] text-left text-xs text-[var(--color-muted)]">
                    <th className="px-3 py-2 font-semibold">Глагол</th>
                    <th className="px-2 py-2 font-semibold">Past</th>
                    <th className="px-2 py-2 font-semibold">V3 (pp)</th>
                    <th className="px-3 py-2 font-semibold">Перевод</th>
                  </tr>
                </thead>
                <tbody>
                  {verbs.map((w) => (
                    <tr key={w.id} className="border-b border-[var(--color-bg2)] last:border-0">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 font-semibold">{w.word}<SpeakButton text={w.word} className="!h-5 !w-5" /></span>
                      </td>
                      <td className="px-2 py-2 text-[var(--color-amber)]">{w.forms?.past || '—'}</td>
                      <td className="px-2 py-2 text-[var(--color-sky)]">{(w.forms as any)?.pp || '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-muted)]">{w.ru}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'plurals' && (
        <div className="space-y-3">
          <div className="card text-sm">
            <p>Обычно множественное число = <b>+s</b> (cat → cats). Но эти слова меняются по-особенному:</p>
          </div>
          <Table head={['Ед. число', 'Множ. число', 'Перевод']}
            rows={IRREGULAR_PLURALS.map(([s, p, ru]) => [
              <span className="font-semibold">{s}</span>,
              <span className="font-semibold text-[var(--color-amber)]">{p}</span>,
              <span className="text-[var(--color-muted)]">{ru}</span>,
            ])} />
        </div>
      )}

      {tab === 'compare' && (
        <div className="space-y-3">
          <div className="card text-sm">
            <p>Обычно: <b>+er / the +est</b> (big → bigger → the biggest). Но есть исключения:</p>
          </div>
          <Table head={['Прилаг.', 'Сравнит.', 'Превосх.', 'Перевод']}
            rows={IRREGULAR_COMPARE.map(([a, b, c, ru]) => [
              <span className="font-semibold">{a}</span>,
              <span className="font-semibold text-[var(--color-amber)]">{b}</span>,
              <span className="font-semibold text-[var(--color-sky)]">{c}</span>,
              <span className="text-[var(--color-muted)]">{ru}</span>,
            ])} />
        </div>
      )}

      {tab === 'spelling' && (
        <div className="space-y-3">
          <div className="card space-y-2 text-sm">
            <p className="font-semibold">Правописание окончаний</p>
            <ul className="space-y-1.5 text-[var(--color-muted)]">
              <li><b className="text-[var(--color-text)]">-s → -es</b> после -o, -ch, -sh, -ss, -x: go → go<b>es</b>, watch → watch<b>es</b>, box → box<b>es</b></li>
              <li><b className="text-[var(--color-text)]">согл. + y → -ies</b>: study → stud<b>ies</b>, try → tr<b>ies</b> (но: play → play<b>s</b>)</li>
              <li><b className="text-[var(--color-text)]">удвоение согласной</b> перед -ing/-ed: run → ru<b>nn</b>ing, stop → sto<b>pp</b>ed, big → bi<b>gg</b>er</li>
              <li><b className="text-[var(--color-text)]">немая -e</b> исчезает перед -ing: make → mak<b>ing</b>, write → writ<b>ing</b></li>
              <li><b className="text-[var(--color-text)]">-ie → -y</b> перед -ing: lie → l<b>ying</b>, die → d<b>ying</b></li>
            </ul>
          </div>
          <div className="card space-y-2 text-sm">
            <p className="font-semibold">a / an</p>
            <p className="text-[var(--color-muted)]"><b className="text-[var(--color-text)]">an</b> ставится перед <b>звуком</b> гласного, не буквой: <b>an</b> hour, <b>an</b> MBA, но <b>a</b> university, <b>a</b> European.</p>
          </div>
        </div>
      )}
    </div>
  );
}
