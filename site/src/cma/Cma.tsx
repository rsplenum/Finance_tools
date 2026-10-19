/**
 * CMA data (C1): the borrower's figures typed in, heads down and years across (three audited years, the estimate for the
 * year now running and the projection for the next), and the working-capital limit now. Then Forms I to VI and the
 * ratios as the engine works them out, provisional while anything is missing; what it assumes; and the downloads.
 * Or the audited years read from the statement's PDF, each figure ticked by the borrower (Read.tsx, D-UX-48).
 * Whether the limit is fresh or a renewal sets a lender's levels, read as bars with "Make it viable" (Levels.tsx, MV4).
 * Promoters' loans as the owners' funds and the collateral sit under one closed "More options". Figures: engine/cma.ts and
 * engine/cma-plan.ts only, via model.ts and levers.ts.
 */
import { useMemo, useState } from 'preact/hooks';
import { AnswerBar, BUTTON, CellInput, Choice, Counter, Dash, FILLED, Folded, HINT, Ledger, Section, STATE, TextField, Tick, InAppNote } from '../fields';
import { printable } from '../doc/pdf';
import { inr } from '../../../engine/util';
import { isoDate, save, type FileKind } from '../download';
import { cmaDoc, docNeeds, docStatus, fileName } from './document';
import { ReadStatement } from './Read';
import { Levels } from './Levels';
import { CASE_CHOICES, COLLATERAL_HINT, applyCmaPlan, levelsOf, undoCmaPlan, type CmaChange, type CmaLevers } from './levers';
import {
  ASSUMPTIONS, HEADS, amountOf, columnsOf, emptyState, exampleState, preview, startYearOf, statusText, subtotals, tidyAmount,
  type CmaFacts, type CmaPreview, type CmaState, type ViewTable,
} from './model';

type Update = (f: (s: CmaState) => CmaState) => void;
const MUTED = 'text-ink-muted';
const KIND = { audited: 'audited', estimate: 'estimate', projection: 'projection' } as const;
const bad = (t: string) => !!t.trim() && amountOf(t) === undefined;

export function CmaCalculator() {
  const blank = () => emptyState(startYearOf(new Date()));
  const [s, setS] = useState<CmaState>(blank);
  // Clear all on a 131-field page, with an undo until the next figure is typed (review finding 7).
  const [cleared, setCleared] = useState<CmaState>();
  const typed = JSON.stringify(s) !== JSON.stringify(blank());
  const update: Update = (f) => setS(f);
  const p = useMemo(() => preview(s), [s]);
  const cols = columnsOf(s.startYear);
  // "Use this plan" (MV4): the fields it wrote, each marked with what it was, until undone or kept.
  const [used, setUsed] = useState<CmaChange[]>([]);
  const use = (l: CmaLevers) => { const a = applyCmaPlan(s, l); setS(a.s); setUsed(a.changes); };
  const undo = () => { setS((x) => undoCmaPlan(x, used)); setUsed([]); };
  const was = (field: string) => { const c = used.find((u) => u.field === field); return c ? `Changed by the plan; it was ${c.was || 'empty'}.` : undefined; };
  // The answer beside the questions from 1024 px (UX8, D-UX-106); the forms, what is assumed and the downloads under both.
  return <div class="lg:grid lg:grid-cols-tool-grid lg:gap-x-10">
    <div class="lg:col-start-1 lg:row-start-1">
    <p data-testid="cma-years" class={`mt-2 ${HINT}`}>
      Years: {cols.map((c) => `${c.fy} (${KIND[c.kind]})`).join(', ')}. Type in rupees, or like 12 L or 1.2 Cr. Leave the oldest years empty if the business is younger.
    </p>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" data-testid="cma-example" class={BUTTON} onClick={() => update((x) => exampleState(x))}>Fill with the worked example</button>
      {typed && <button type="button" data-testid="cma-clear" class={BUTTON} onClick={() => { setCleared(s); setS(blank()); setUsed([]); }}>Clear all</button>}
      {cleared && !typed && <p role="status" class="flex items-center gap-2 text-sm text-ink">Cleared.
        <button type="button" data-testid="cma-clear-undo" class={BUTTON} onClick={() => { setS(cleared); setCleared(undefined); }}>Undo</button></p>}
    </div>
    <ReadStatement s={s} update={update} />
    <Section id="limit" title="The limit now">
      <div class="mt-4 max-w-sm">
        <TextField id="fld-cma-existing" label="Working-capital limit you have now, from all banks (0 if none)" unit="Rs." inputMode="decimal" value={s.existingLimit}
          tidy={tidyAmount} invalid={bad(s.existingLimit)} said={bad(s.existingLimit) ? 'Not understood. Type 70,00,000 or 70 L.' : undefined}
          onCommit={(existingLimit) => update((x) => ({ ...x, existingLimit }))} />
      </div>
      <Choice name="fld-cma-case" legend="The limit you ask for" options={CASE_CHOICES} value={s.loanCase || undefined} columns
        onChange={(loanCase) => update((x) => ({ ...x, loanCase }))} />
    </Section>
    </div>
    <Result s={s} p={p} update={update} use={use} used={used} undo={undo} keep={() => setUsed([])} />
    {/* The five years across the full width from 1024 px (UX9, review finding 3); the answer bar shows while the panel is out of view. */}
    <div class="lg:col-span-2 lg:row-start-2">
      <div id="cma-figures">
        <Grid form="II" title="Profit and loss (Form II)" s={s} update={update} was={was} />
        <Grid form="III" title="Balance sheet (Form III)" s={s} update={update} was={was} />
      </div>
      <details id="more-options" class="mt-12">
        <summary class="flex min-h-11 cursor-pointer items-center rounded-card bg-surface px-4 py-3 font-medium text-link">More options: promoters’ loans, collateral</summary>
        <div class="pt-4 pb-4">
          <label class="flex items-start gap-2 text-ink">
            <input id="fld-cma-quasi" type="checkbox" class="mt-1" checked={s.quasi} onChange={(e) => { const quasi = (e.currentTarget as HTMLInputElement).checked; update((x) => ({ ...x, quasi })); }} />
            <span>Count unsecured loans from promoters as the owners’ funds<span class={`block text-sm ${MUTED}`}>{was('fld-cma-quasi') ?? 'Only when they stay in the business till the bank’s loan is repaid.'}</span></span>
          </label>
          <div class="mt-4 max-w-sm">
            <TextField id="fld-cma-collateral" label="Collateral’s market value (0 if none)" hint={was('fld-cma-collateral') ?? COLLATERAL_HINT} unit="Rs." inputMode="decimal" value={s.collateral}
              tidy={tidyAmount} invalid={bad(s.collateral)} said={bad(s.collateral) ? 'Not understood. Type 50,00,000 or 50 L.' : undefined}
              onCommit={(collateral) => update((x) => ({ ...x, collateral }))} />
          </div>
        </div>
      </details>
    </div>
    <div class="lg:col-span-2 lg:row-start-3">
    {p.view && <Forms p={p} />}
    <Ledger id="assumed" testid="cma-assumed" title="Assumed until changed" rows={ASSUMPTIONS.map((a) => ({ ...a,
      ...(a.id === 'quasi' ? { to: 'fld-cma-quasi', go: (e: Event) => { e.preventDefault(); (document.getElementById('more-options') as HTMLDetailsElement).open = true; document.getElementById('fld-cma-quasi')?.focus(); } } : {}) }))} />
    <Download s={s} p={p} update={update} />
    </div>
    {/* The limit and its status on every screen of the forms (review finding 4), as the DSCR's answer bar, from load. */}
    <AnswerBar to="result" label="To the CMA data" testid="cma-answer-bar" text={barText(p, s)} />
  </div>;
}

/** The answer bar's words (D-UX-84), as the report's: the limit, whether it meets a lender's levels, the status; never
 * "Complete" alone under a miss (UX5b critic, finding 1). */
function barText(p: CmaPreview, s: CmaState) {
  if (!p.view) return statusText(p);
  const l = levelsOf(s), n = l?.missCount;
  const said = n === undefined ? undefined : n ? (n > 1 ? 'Misses the benchmarks' : 'Misses a benchmark') : l?.benchmarks ? 'Meets your benchmarks' : 'Meets the benchmarks';
  return [`Limit ${p.view.key[0]?.value}`, said, statusText(p)].filter(Boolean).join(' · ');
}

/** Each column of a form spans its heads and its subtotals (11 + 2 and 14 + 3), so the rows line up across the years; the
 * years' line is the strip above them. */
const SPAN = { II: 'lg:row-span-13', III: 'lg:row-span-17' } as const;
const SUBTOTALS = { II: ['Gross profit', 'Net profit'], III: ['Total liabilities', 'Total assets', 'Balance sheet'] } as const;
/** How sure a year's figures are, drawn on its head (UX9, review finding 3): audited solid, the estimate dashed, the
 * projection dashed and lighter, as the answer's rule is solid once final (docs/DESIGN-SITE.md). */
const SURE = { audited: 'border-ink', estimate: 'border-dashed border-ink', projection: 'border-dashed border-ink-muted' } as const;
const rs = (n: number) => `Rs. ${inr(n, Number.isInteger(n) ? 0 : 2)}`;

/** The figures of one form, the full width from 1024 px, heads down and years across (UX9, review finding 3); below, a
 * card a year, each cell named by its row (review finding 13; docs/DESIGN.md, Table). One set of fields serves both, a
 * year at a time down its column, so Tab follows the eye at every width (F19); the cells keep `px-2` and `min-w-28`, so
 * a typed figure is never cut (finding 1). Under each year its subtotals from the engine, "—" until their figures are in,
 * and once the balance sheet's are, whether it balances. */
function Grid({ form, title, s, update, was }: { form: 'II' | 'III'; title: string; s: CmaState; update: Update; was: (field: string) => string | undefined }) {
  const cols = columnsOf(s.startYear), heads = HEADS.filter((h) => h.form === form);
  const hint = (h: (typeof heads)[number]) => 'hint' in h && h.hint ? <span class={`block text-xs ${MUTED}`}>{h.hint}</span> : null;
  const sums = cols.map((c) => subtotals(s, c.id)), blocked = sums.find((t) => t.blocked)?.blocked;
  const ROW = 'mt-2 flex items-center justify-between gap-3 lg:mt-0 lg:border-b lg:border-line lg:py-1';
  // From 1024 px the years' heads are one strip that stays under the top bar while the form is in view, so the eighteen
  // rows of Form III keep their years (UX9b, the UX9 critic); each year's group is named for a screen reader, and below
  // 1024 px each card carries its own head.
  const head = (c: (typeof cols)[number]) => <><span aria-hidden="true" class={`absolute inset-x-0 top-0 border-t-2 ${SURE[c.kind]}`} />{c.fy}</>;
  return <Section id={`form-${form}`} title={title}>
    <div aria-hidden="true" data-years-strip data-testid={`cma-years-${form}`} class="sticky top-18 z-10 mt-3 hidden bg-canvas text-sm lg:grid lg:grid-cols-years lg:gap-x-3">
      <p class="flex items-end border-b border-line py-2 pr-3 font-medium text-ink-muted">Rs.</p>
      {cols.map((c) => <p key={c.id} class="relative flex flex-col items-end justify-end border-b border-line pt-2 pb-2 font-medium whitespace-nowrap text-ink-muted">
        {head(c)}<span class={`text-xs font-normal ${MUTED}`}>{KIND[c.kind]}</span></p>)}
    </div>
    <div data-years-grid data-testid={`cma-input-${form}`} class="mt-3 space-y-3 text-sm lg:mt-0 lg:grid lg:grid-flow-col lg:grid-cols-years lg:gap-x-3 lg:space-y-0">
      <div class={`max-lg:hidden lg:grid lg:grid-rows-subgrid ${SPAN[form]}`}>
        {heads.map((h) => <p key={h.id} class="flex flex-col justify-center border-b border-line py-1.5 pr-3 text-ink">{h.label}{hint(h)}</p>)}
        {SUBTOTALS[form].map((l, i) => <p key={l} class={`flex items-center py-1.5 pr-3 font-semibold text-ink ${i ? '' : 'border-t border-t-ink/25'} border-b border-line`}>{l}</p>)}
      </div>
      {cols.map((c, k) => { const t = sums[k], d = t.assets !== undefined ? t.assets - (t.liabilities as number) : undefined;
        const fig = (n: number | undefined, what: string) => n === undefined || t.blocked ? <Dash what={`${what}, ${c.fy}`} />
          : <span class={c.kind === 'projection' ? MUTED : 'text-ink'}>{rs(n)}</span>;
        const cells = form === 'II' ? [fig(t.grossProfit, 'Gross profit'), fig(t.netProfit, 'Net profit')]
          : [fig(t.liabilities, 'Total liabilities'), fig(t.assets, 'Total assets'), d === undefined || t.blocked ? <Dash what={`Whether the balance sheet balances, ${c.fy}`} />
            : Math.abs(d) < 0.005 ? <span data-testid={`cma-balance-${c.id}`} class={`${STATE} justify-end text-ink`}><Tick />Balances</span>
            : <span data-testid={`cma-balance-${c.id}`} class={`${STATE} justify-end text-warn`}>Differs by {rs(Math.abs(d))}</span>];
        return <div key={c.id} role="group" aria-label={`${c.fy}, ${KIND[c.kind]}`} data-testid={`cma-input-${form}-${c.id}`}
          class={`rounded-card bg-surface p-3 lg:grid lg:grid-rows-subgrid ${SPAN[form]} lg:rounded-none lg:bg-transparent lg:p-0`}>
          <p class="relative pt-2 font-medium text-ink lg:hidden">{head(c)}<span class={`ml-2 text-xs font-normal ${MUTED}`}>{KIND[c.kind]}</span></p>
          {heads.map((h) => { const id = `fld-cma-${c.id}-${h.id}`, v = s.figures[c.id][h.id]; return <div key={h.id} class={ROW}>
            <label for={id} class="text-ink lg:hidden">{h.label}{hint(h)}</label>
            <div class="w-36 shrink-0 lg:w-full">
              <CellInput id={id} name={`${h.label}, ${c.fy}`} value={v} decimal tidy={tidyAmount} invalid={bad(v)} changed={was(id)}
                onCommit={(t) => update((x) => ({ ...x, figures: { ...x.figures, [c.id]: { ...x.figures[c.id], [h.id]: t } } }))} />
            </div>
          </div>; })}
          {cells.map((x, i) => <div key={i} data-testid={`cma-sum-${form}-${c.id}-${i}`} class={`${ROW} py-1 tabular-nums ${i ? '' : 'border-t border-t-ink/25 pt-2 lg:pt-1'}`}>
            <span class="font-semibold text-ink lg:hidden">{SUBTOTALS[form][i]}</span><span class="text-right font-semibold lg:w-full lg:px-2">{x}</span>
          </div>)}
        </div>; })}
    </div>
    {blocked && <p class="mt-2 text-sm text-bad">{blocked}</p>}
  </Section>;
}

/** One of the forms, its years across; it scrolls sideways inside itself on a phone. */
function FormTable({ t }: { t: ViewTable }) {
  const cols = t.columns.length + 1;
  // A sheet lying flat: only the answer's casts the shadow (UX8, D-UX-106).
  return <details open={t.id === 'form1' || t.id === 'form5'} class="paper mt-4 rounded-card">
    <summary class="flex min-h-11 cursor-pointer items-center px-4 py-2 font-medium text-ink">{t.title}</summary>
    <div class="overflow-x-auto px-4 pb-4" tabIndex={0} role="region" aria-label={t.title}>
      <table data-testid={`cma-${t.id}`} class="w-full border-collapse text-sm">
        <thead><tr class="border-b border-line">
          <th scope="col" class="py-2 pr-3 text-left font-medium text-ink-muted">{t.first}</th>
          {t.columns.map((c) => <th key={c} scope="col" class="px-2 py-2 text-right font-medium whitespace-nowrap text-ink-muted">{c}</th>)}
        </tr></thead>
        <tbody>
          {t.rows.map((r, i) => r.kind === 'head'
            ? <tr key={i}><th colSpan={cols} scope="colgroup" class="pt-3 pb-1 text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">{r.label}</th></tr>
            : <tr key={i} class={`border-b border-line ${r.kind ? 'border-t border-t-ink/25' : ''}`}>
              <th scope="row" class={`min-w-48 py-1.5 pr-3 text-left ${r.kind ? 'font-semibold' : 'font-normal'} text-ink`}>{r.label}</th>
              {r.values.map((x, k) => <td key={k} class={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums ${r.kind ? 'font-semibold' : ''} text-ink`}>{x}</td>)}
            </tr>)}
        </tbody>
      </table>
    </div>
  </details>;
}

/**
 * The answer, pinned beside the figures from 1024 px (UX8, D-UX-106) and there from load: one counter of what is still
 * needed, opening to the list; the limit, the limit now and the current ratio with "—" until known, never 0 (review
 * finding 2); then the plan used and the lender's levels.
 */
function Result({ s, p, update, use, used, undo, keep }: { s: CmaState; p: CmaPreview; update: Update; use: (l: CmaLevers) => void; used: CmaChange[]; undo: () => void; keep: () => void }) {
  const v = p.view, last = columnsOf(s.startYear).at(-1)?.fy ?? '';
  const outline = [`Limit by the turnover method, ${last}`, 'Limit now', `Current ratio, ${last}`];
  const now = amountOf(s.existingLimit);
  return <div class="lg:col-start-2 lg:row-start-1"><section id="result" aria-labelledby="result-h" class="answer-panel mt-10 lg:mt-4">
    <h2 id="result-h" class="sr-only">The CMA data</h2>
    <div class="paper shadow-paper rounded-card p-4 sm:p-6">
      <Counter id="cma-status" result={p.blocked ? 'blocked' : p.needs.length ? 'provisional' : 'ready'} text={statusText(p)} rule answer>
        {p.needs.length > 0 && <ul data-testid="cma-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">
          {p.needs.slice(0, 8).map((n) => <li key={n}>{n}</li>)}{p.needs.length > 8 && <li>and {p.needs.length - 8} more</li>}</ul>}
      </Counter>
      {p.blocked && <p class="mt-2 text-sm text-bad">{p.blocked}</p>}
      <dl class="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {(v?.key ?? outline.map((label) => ({ label, value: undefined, note: undefined }))).map((k, i) => <div key={k.label}>
          <dt class={`text-sm ${MUTED}`}>{k.label}</dt>
          <dd data-testid={`cma-key-${i}`} class="figure text-2xl text-ink">{k.value ?? (i === 1 && now !== undefined ? `Rs. ${s.existingLimit}`
            : <Dash what={k.label} to={i === 1 ? 'fld-cma-existing' : 'cma-figures'} />)}</dd>
          {k.note && <dd class={`text-sm ${MUTED}`}>{k.note}</dd>}
        </div>)}
      </dl>
    </div>
    {used.length > 0 && <div data-testid="cma-used" role="status" class="mt-3 rounded-control border-l-4 border-ink bg-surface p-3">
      <p class="font-medium text-ink">The plan is used: these figures above changed.</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink tabular-nums">{used.map((c) => <li key={c.key}>{c.label}: {c.was || 'none'} → {c.now}</li>)}</ul>
      <div class="mt-2 flex flex-wrap gap-2">
        <button type="button" data-testid="cma-undo" class={BUTTON} onClick={undo}>Undo</button>
        <button type="button" data-testid="cma-keep" class={BUTTON} onClick={keep}>Keep these</button>
      </div>
    </div>}
    {v && !p.blocked && <Levels s={s} update={update} use={use} />}
  </section></div>;
}

/** The forms under the answer, full width from 1024 px: what to look at, then Forms I to VI and the ratios. */
function Forms({ p }: { p: CmaPreview }) {
  const v = p.view;
  if (!v) return null;
  return <section id="cma-forms" aria-label="Forms I to VI">
    {v.flags.length > 0 && <div class="mt-10">
      <h3 class="text-title text-ink">To look at</h3>
      <ul data-testid="cma-flags" class="mt-1 max-w-prose list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{v.flags.map((f) => <li key={f}>{f}</li>)}</ul>
    </div>}
    {v.tables.map((t) => <FormTable key={t.id} t={t} />)}
  </section>;
}

function Download({ s, p, update }: { s: CmaState; p: CmaPreview; update: Update }) {
  const f = s.doc, set = (patch: Partial<CmaFacts>) => update((x) => ({ ...x, doc: { ...x.doc, ...patch } }));
  const english = (t: string) => (t.trim() && !printable(t) ? 'The document is in English: type this in English letters.' : undefined);
  const own = docNeeds(f), ready = !!p.view && !p.blocked;
  const go = (kind: FileKind) => {
    const now = new Date();
    save(cmaDoc(s, p, isoDate(now)), kind, fileName(s, p, kind), now);
  };
  const field = (id: keyof CmaFacts, label: string, hint?: string) =>
    <TextField id={`fld-cma-${id}`} label={label} hint={hint} value={f[id]} said={english(f[id])} invalid={!!english(f[id])} onCommit={(t) => set({ [id]: t })} />;
  // Before the forms show figures the section is one line (UX8, review finding 9).
  if (!ready) return <Folded id="download" title="Download the CMA data"><span data-testid="cma-doc-wait">{p.blocked
    ? 'No document while the two computations disagree.' : 'A PDF and an Excel copy, once the forms show figures.'}</span></Folded>;
  return <Section id="download" title="Download the CMA data">
    <p class={`mt-2 ${HINT}`}>A PDF for the lender and an Excel copy whose Check sheet redoes the main figures by formulas, made in your browser.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      {field('name', 'Business’s name')}
      {field('preparedBy', 'Prepared by, if any', 'Your name or your firm’s.')}
    </div>
    {ready
      ? <div class="mt-5">
        <p data-testid="cma-doc-status" class={`${STATE} ${own.length ? 'text-warn' : 'text-ink'}`}>{!own.length && <Tick />}{docStatus(s, p)}</p>
        {own.length > 0 && <ul data-testid="cma-doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="cma-download-pdf" class={FILLED} onClick={() => go('pdf')}>Download PDF</button>
          <button type="button" data-testid="cma-download-xlsx" class={BUTTON} onClick={() => go('xlsx')}>Download Excel</button>
        </div>
        <InAppNote id="cma-in-app" />
      </div>
      : null}
  </Section>;
}
