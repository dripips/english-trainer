import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, ChevronDown, ChevronUp, BookOpen, ArrowRight } from 'lucide-react';
import { Header } from '../components/Header';

type Tab = 'task1' | 'task2';

const TASK1_PHRASES = [
  { cat: 'Рост', items: ['rose / increased / grew sharply', 'climbed / surged dramatically', 'doubled / tripled', 'peaked at … in …', 'there was a significant rise in'] },
  { cat: 'Падение', items: ['fell / dropped / declined sharply', 'plunged / plummeted dramatically', 'halved', 'bottomed out at …', 'there was a marked decrease in'] },
  { cat: 'Стабильность', items: ['remained stable / constant', 'levelled off at …', 'there was little change in', 'stayed at approximately …', 'showed no significant variation'] },
  { cat: 'Сравнение', items: ['compared to / in comparison with', 'while / whereas', 'X was twice as high as Y', 'X accounted for the largest share', 'the figures for X were significantly higher than those for Y'] },
  { cat: 'Введение', items: ['The line graph illustrates…', 'The bar chart compares…', 'The pie chart shows the proportion of…', 'The table provides data on…', 'The diagram illustrates the process of…'] },
  { cat: 'Обзор', items: ['Overall, it is clear that…', 'In general, the most notable feature is…', 'The most striking trend is…', 'It is evident that…', 'As an overall trend,…'] },
];

const TASK2_PHRASES = [
  { cat: 'Введение', items: ['In recent years / decades,…', 'It is widely believed that…', 'There is growing concern about…', 'The issue of … has become increasingly important.', 'This essay will argue that…'] },
  { cat: 'Добавление', items: ['Furthermore, / Moreover, / In addition,', 'Another key point is that…', 'It is also worth noting that…', 'Not only … but also…', 'What is more,…'] },
  { cat: 'Контраст', items: ['However, / Nevertheless, / On the other hand,', 'Although / Even though / Despite this,', 'Critics argue that…; however,…', 'In contrast, / Conversely,', 'While some believe…, others argue…'] },
  { cat: 'Примеры', items: ['For example, / For instance,', 'This is illustrated by…', 'A clear example of this is…', 'Research suggests / indicates that…', 'Studies have shown that…'] },
  { cat: 'Вывод', items: ['In conclusion, / To conclude,', 'Overall, it is clear that…', 'Taking everything into account,…', 'I would argue / maintain that…', 'Governments / individuals should… in order to…'] },
  { cat: 'Позиция', items: ['I strongly believe that…', 'I am convinced that…', 'In my view, / In my opinion,', 'I would argue that…', 'The advantages outweigh the disadvantages.'] },
];

const PROMPTS: { type: string; task: 'task1' | 'task2'; q: string; tips: string[] }[] = [
  {
    task: 'task2', type: 'Agree/Disagree',
    q: 'Some people believe that children should begin learning a foreign language as early as possible. Others argue that this puts too much pressure on young learners. To what extent do you agree or disagree?',
    tips: ['State your position clearly in the intro', 'Paragraph 1: benefits of early learning (brain plasticity, accent)', 'Paragraph 2: potential drawbacks or counter-view', 'Conclude with a clear recommendation'],
  },
  {
    task: 'task2', type: 'Advantages/Disadvantages',
    q: 'More and more people are choosing to work from home. What are the advantages and disadvantages of this trend?',
    tips: ['Paragraph 1: advantages (flexibility, no commute, productivity)', 'Paragraph 2: disadvantages (isolation, blurred work-life balance)', 'Give a balanced conclusion'],
  },
  {
    task: 'task2', type: 'Problem/Solution',
    q: 'Traffic congestion in cities is a major problem. What are the main causes of this problem, and what measures can be taken to address it?',
    tips: ['Paragraph 1: causes (car ownership, poor public transport, urban design)', 'Paragraph 2: solutions (congestion charge, invest in transport, cycle lanes)', 'Be specific with examples'],
  },
  {
    task: 'task2', type: 'Discuss both views',
    q: 'Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe that there are better alternatives. Discuss both views and give your own opinion.',
    tips: ['View 1: longer sentences as deterrent', 'View 2: rehabilitation, education, community service', 'Your opinion: which is more effective and why?'],
  },
  {
    task: 'task1', type: 'Line graph',
    q: 'The graph below shows the percentage of households in three countries that had access to the internet between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    tips: ['Intro: paraphrase the title', 'Overview: all three rose; which was highest/lowest?', 'Details: figures for each country at start, end, any peaks'],
  },
  {
    task: 'task1', type: 'Bar chart',
    q: 'The bar chart below shows the amount of money spent on fast food in four countries (UK, USA, France, Japan) in 1990 and 2020. Summarise the information and make comparisons where relevant.',
    tips: ['Compare 1990 vs 2020 for each country', 'Highlight biggest increase and highest spender', 'Use: rose by, fell from … to …, compared to'],
  },
];

function PhraseSection({ cats }: { cats: { cat: string; items: string[] }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {cats.map((c) => (
        <div key={c.cat} className="card !p-0 overflow-hidden">
          <button
            className="flex w-full items-center justify-between px-4 py-3 font-semibold"
            onClick={() => setOpen(open === c.cat ? null : c.cat)}
          >
            {c.cat}
            {open === c.cat ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {open === c.cat && (
            <ul className="border-t border-[var(--color-bg2)] px-4 pb-3 pt-2 space-y-1.5">
              {c.items.map((p) => (
                <li key={p} className="rounded-lg bg-[var(--color-bg2)] px-3 py-2 text-sm font-mono">{p}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function PromptCard({ p }: { p: typeof PROMPTS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card !p-0 overflow-hidden">
      <button
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mt-0.5 shrink-0 rounded-md bg-[var(--color-surface2)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">{p.type}</span>
        <span className="flex-1 text-sm leading-snug line-clamp-2">{p.q}</span>
        {open ? <ChevronUp size={16} className="mt-0.5 shrink-0" /> : <ChevronDown size={16} className="mt-0.5 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-[var(--color-bg2)] px-4 pb-4 pt-3 space-y-3">
          <p className="text-sm leading-relaxed">{p.q}</p>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Подсказки</p>
            <ul className="space-y-1">
              {p.tips.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--color-muted)]">
                  <span className="shrink-0 font-bold text-[var(--color-primary)]">{i + 1}.</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function Writing() {
  const [tab, setTab] = useState<Tab>('task2');

  return (
    <div>
      <Header title="IELTS Writing" />

      <div className="mb-4 flex rounded-2xl bg-[var(--color-bg2)] p-1">
        {(['task1', 'task2'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition
              ${tab === t ? 'bg-[var(--color-surface2)] text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}>
            {t === 'task1' ? 'Task 1 — Графики' : 'Task 2 — Эссе'}
          </button>
        ))}
      </div>

      {tab === 'task1' && (
        <div className="space-y-4">
          <div className="card !bg-[color-mix(in_srgb,var(--color-sky)_10%,var(--color-surface))]">
            <p className="text-sm font-semibold">Структура Task 1</p>
            <ol className="mt-2 space-y-1 text-sm text-[var(--color-text)]">
              <li><span className="font-bold text-[var(--color-sky)]">§1</span> Перефразируй задание (1–2 предл.)</li>
              <li><span className="font-bold text-[var(--color-sky)]">§2</span> Overview — главные тенденции, начни с «Overall,…»</li>
              <li><span className="font-bold text-[var(--color-sky)]">§3</span> Детали А — конкретные цифры (группа 1)</li>
              <li><span className="font-bold text-[var(--color-sky)]">§4</span> Детали Б — конкретные цифры (группа 2)</li>
            </ol>
            <p className="mt-2 text-xs text-[var(--color-danger)]">❌ Никакого личного мнения! Только факты.</p>
          </div>

          <div>
            <p className="mb-2 px-0.5 text-sm font-semibold text-[var(--color-muted)]">Банк фраз</p>
            <PhraseSection cats={TASK1_PHRASES} />
          </div>

          <div>
            <p className="mb-2 px-0.5 text-sm font-semibold text-[var(--color-muted)]">Задания для практики</p>
            <div className="space-y-2">
              {PROMPTS.filter((p) => p.task === 'task1').map((p, i) => <PromptCard key={i} p={p} />)}
            </div>
          </div>

          <Link to="/lessons/ielts-task1" className="card flex items-center gap-3 active:scale-[0.98]">
            <BookOpen size={20} className="shrink-0 text-[var(--color-primary)]" />
            <div className="flex-1 text-sm font-semibold">Урок: IELTS Task 1 — словарь и упражнения</div>
            <ArrowRight size={16} className="shrink-0 text-[var(--color-muted)]" />
          </Link>
        </div>
      )}

      {tab === 'task2' && (
        <div className="space-y-4">
          <div className="card !bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))]">
            <p className="text-sm font-semibold">Типы эссе Task 2</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              {[
                ['Agree/Disagree', 'To what extent do you agree?'],
                ['Both views', 'Discuss both views and give your opinion'],
                ['Adv/Disadv', 'What are the advantages and disadvantages?'],
                ['Problem/Solution', 'What are the causes? What can be done?'],
              ].map(([type, hint]) => (
                <div key={type} className="rounded-lg bg-[var(--color-bg2)] p-2">
                  <p className="font-bold text-[var(--color-primary)]">{type}</p>
                  <p className="text-[var(--color-muted)]">{hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card space-y-2">
            <p className="text-sm font-semibold">Структура PEEL (один абзац)</p>
            {[
              ['P — Point', 'Тема абзаца: «One key advantage is…»'],
              ['E — Explain', 'Объясни: «This means that…»'],
              ['E — Evidence', 'Пример/факт: «For instance, studies show…»'],
              ['L — Link', 'Связь с тезисом: «This demonstrates that…»'],
            ].map(([t, d]) => (
              <div key={t} className="flex gap-2 text-sm">
                <span className="w-24 shrink-0 font-bold text-[var(--color-primary)]">{t}</span>
                <span className="text-[var(--color-muted)]">{d}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-2 px-0.5 text-sm font-semibold text-[var(--color-muted)]">Банк фраз</p>
            <PhraseSection cats={TASK2_PHRASES} />
          </div>

          <div>
            <p className="mb-2 px-0.5 text-sm font-semibold text-[var(--color-muted)]">Задания для практики</p>
            <div className="space-y-2">
              {PROMPTS.filter((p) => p.task === 'task2').map((p, i) => <PromptCard key={i} p={p} />)}
            </div>
          </div>

          <Link to="/lessons/ielts-task2" className="card flex items-center gap-3 active:scale-[0.98]">
            <PenLine size={20} className="shrink-0 text-[var(--color-primary)]" />
            <div className="flex-1 text-sm font-semibold">Урок: IELTS Task 2 — структура эссе</div>
            <ArrowRight size={16} className="shrink-0 text-[var(--color-muted)]" />
          </Link>
        </div>
      )}
    </div>
  );
}
