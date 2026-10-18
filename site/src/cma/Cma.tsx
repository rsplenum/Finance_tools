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
import { BUTTON, CellInput, Choice, FILLED, HINT, Section, TextField, toAnswer } from '../fields';
import { printable } from '../doc/pdf';
import { isoDate, save, type FileKind } from '../download';
import { cmaDoc, docNeeds, docStatus, fileName } from './document';
import { ReadStatement } from './Read';
import { Levels } from './Levels';
import { CASE_CHOICES, COLLATERAL_HINT, applyCmaPlan, levelsOf, undoCmaPlan, type CmaChange, type CmaLevers } from './levers';
import {
  ASSUMPTIONS, HEADS, amountOf, columnsOf, emptyState, exampleState, preview, startYearOf, statusText, tidyAmount,
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
  const shown = Boolean(p.view || typed);
  const cols = columnsOf(s.startYear);
  // "Use this plan" (MV4): the fields it wrote, each marked with what it was, until undone or kept.
  const [used, setUsed] = useState<CmaChange[]>([]);
  const use = (l: CmaLevers) => { const a = applyCmaPlan(s, l); setS(a.s); setUsed(a.changes); };
  const undo = () => { setS((x) => undoCmaPlan(x, used)); setUsed([]); };
  const was = (field: string) => { const c = used.find((u) => u.field === field); return c ? `Changed by the plan; it was ${c.was || 'empty'}.` : undefined; };
  return <div>
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
        <TextField id="fld-cma-existing" label="Working-capital limit you have now, from all banks (0 if none)" inputMode="decimal" value={s.existingLimit}
          tidy={tidyAmount} placeholder="like 70 L" invalid={bad(s.existingLimit)} said={bad(s.existingLimit) ? 'Not understood. Type 70,00,000 or 70 L.' : undefined}
          onCommit={(existingLimit) => update((x) => ({ ...x, existingLimit }))} />
      </div>
      <Choice name="fld-cma-case" legend="The limit you ask for" options={CASE_CHOICES} value={s.loanCase || undefined} columns
        onChange={(loanCase) => update((x) => ({ ...x, loanCase }))} />
    </Section>
    <Grid form="II" title="Profit and loss (Form II)" s={s} update={update} was={was} />
    <Grid form="III" title="Balance sheet (Form III)" s={s} update={update} was={was} />
    <details id="more-options" class="mt-12">
      <summary class="flex min-h-11 cursor-pointer items-center rounded-card bg-surface px-4 py-3 font-medium text-link">More options: promoters’ loans, collateral</summary>
      <div class="pt-4 pb-4">
        <label class="flex items-start gap-2 text-ink">
          <input id="fld-cma-quasi" type="checkbox" class="mt-1" checked={s.quasi} onChange={(e) => { const quasi = (e.currentTarget as HTMLInputElement).checked; update((x) => ({ ...x, quasi })); }} />
          <span>Count unsecured loans from promoters as the owners’ funds<span class={`block text-sm ${MUTED}`}>{was('fld-cma-quasi') ?? 'Only when they stay in the business till the bank’s loan is repaid.'}</span></span>
        </label>
        <div class="mt-4 max-w-sm">
          <TextField id="fld-cma-collateral" label="Collateral’s market value (0 if none)" hint={was('fld-cma-collateral') ?? COLLATERAL_HINT} inputMode="decimal" value={s.collateral}
            tidy={tidyAmount} placeholder="like 50 L" invalid={bad(s.collateral)} said={bad(s.collateral) ? 'Not understood. Type 50,00,000 or 50 L.' : undefined}
            onCommit={(collateral) => update((x) => ({ ...x, collateral }))} />
        </div>
      </div>
    </details>
    <Result s={s} p={p} update={update} use={use} used={used} undo={undo} keep={() => setUsed([])} />
    <Section id="assumed" title="Assumed until changed">
      <ul data-testid="cma-assumed" class="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
        {ASSUMPTIONS.map((a) => <li key={a.id}><span class="font-medium text-ink">{a.what}:</span> {a.shown}. <span class={MUTED}>{a.why}.</span></li>)}
      </ul>
    </Section>
    <Download s={s} p={p} update={update} />
    {/* The limit and its status on every screen of the forms (review finding 4), as the DSCR's answer bar. */}
    {/* In the page from load, empty and unseen, so its first answer is a change and is read out (UX5b). */}
    <div class={shown ? 'sticky bottom-0 z-10 -mx-4 mt-10 flex items-center gap-2 border-t border-line bg-canvas px-4 sm:-mx-8 sm:px-8' : 'sr-only'}>
      <p data-testid="cma-answer-bar" data-answer-echo aria-live="polite" class={shown ? 'flex-1 py-2 text-sm font-medium text-ink' : undefined}>{shown ? barText(p, s) : ''}</p>
      {shown && <a href="#result" aria-label="To the CMA data" onClick={toAnswer} class="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface"><span aria-hidden="true">↓</span></a>}
    </div>
  </div>;
}

/** The answer bar's words (D-UX-84), as the report's: the limit, whether it meets a lender's levels, the status; never
 * "Complete" alone under a miss (UX5b critic, finding 1). */
function barText(p: CmaPreview, s: CmaState) {
  if (!p.view) return statusText(p);
  const n = levelsOf(s)?.missCount;
  const said = n === undefined ? undefined : n ? (n > 1 ? 'Misses lender’s levels' : 'Misses a lender’s level') : 'Meets a lender’s levels';
  return [`Limit ${p.view.key[0]?.value}`, said, statusText(p)].filter(Boolean).join(' · ');
}

/** Each column of a form spans its heads and the years' line (11 + 1 and 14 + 1), so the rows line up across the years. */
const SPAN = { II: 'sm:row-span-12', III: 'sm:row-span-15' } as const;

/** The figures of one form. From 640 px heads down and years across; below, a card a year, each cell named by its row
 * (review finding 13; docs/DESIGN.md, Table). One set of fields serves both, a year at a time down its column, so Tab
 * follows the eye at every width (F19); the cells keep `px-2` and `min-w-28`, so a typed figure is never cut (finding 1). */
function Grid({ form, title, s, update, was }: { form: 'II' | 'III'; title: string; s: CmaState; update: Update; was: (field: string) => string | undefined }) {
  const cols = columnsOf(s.startYear), heads = HEADS.filter((h) => h.form === form);
  const hint = (h: (typeof heads)[number]) => 'hint' in h && h.hint ? <span class={`block text-xs ${MUTED}`}>{h.hint}</span> : null;
  return <Section id={`form-${form}`} title={title}>
    <div class="mt-3 sm:overflow-x-auto">
      <div data-testid={`cma-input-${form}`} class="space-y-3 text-sm sm:grid sm:grid-flow-col sm:gap-x-2 sm:space-y-0">
        <div class={`max-sm:hidden sm:grid sm:grid-rows-subgrid ${SPAN[form]} sm:min-w-44`}>
          <p class="flex items-end border-b border-line py-2 pr-3 font-medium text-ink-muted">Rupees</p>
          {heads.map((h) => <p key={h.id} class="flex flex-col justify-center border-b border-line py-1.5 pr-3 text-ink">{h.label}{hint(h)}</p>)}
        </div>
        {cols.map((c) => <div key={c.id} role="group" aria-label={`${c.fy}, ${KIND[c.kind]}`} data-testid={`cma-input-${form}-${c.id}`}
          class={`rounded-card bg-surface p-3 sm:grid sm:grid-rows-subgrid ${SPAN[form]} sm:rounded-none sm:bg-transparent sm:p-0`}>
          <p class="font-medium text-ink sm:flex sm:flex-col sm:items-end sm:justify-end sm:border-b sm:border-line sm:py-2 sm:whitespace-nowrap sm:text-ink-muted">{c.fy}
            <span class={`ml-2 text-xs font-normal ${MUTED} sm:ml-0`}>{KIND[c.kind]}</span></p>
          {heads.map((h) => { const id = `fld-cma-${c.id}-${h.id}`, v = s.figures[c.id][h.id]; return <div key={h.id}
            class="mt-2 flex items-center justify-between gap-3 sm:mt-0 sm:border-b sm:border-line sm:py-1">
            <label for={id} class="text-ink sm:hidden">{h.label}{hint(h)}</label>
            <div class="w-36 shrink-0 sm:w-full">
              <CellInput id={id} name={`${h.label}, ${c.fy}`} value={v} decimal tidy={tidyAmount} invalid={bad(v)} changed={was(id)}
                onCommit={(t) => update((x) => ({ ...x, figures: { ...x.figures, [c.id]: { ...x.figures[c.id], [h.id]: t } } }))} />
            </div>
          </div>; })}
        </div>)}
      </div>
    </div>
  </Section>;
}

/** One of the forms, its years across; it scrolls sideways inside itself on a phone. */
function FormTable({ t }: { t: ViewTable }) {
  const cols = t.columns.length + 1;
  return <details open={t.id === 'form1' || t.id === 'form5'} class="paper shadow-paper mt-4 rounded-card">
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

function Result({ s, p, update, use, used, undo, keep }: { s: CmaState; p: CmaPreview; update: Update; use: (l: CmaLevers) => void; used: CmaChange[]; undo: () => void; keep: () => void }) {
  const v = p.view;
  return <Section id="result" title="The CMA data">
    <p data-testid="cma-status" data-answer data-result={p.blocked ? 'blocked' : p.needs.length ? 'provisional' : 'ready'} class={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${p.needs.length || p.blocked
      ? 'bg-warn-tint text-warn' : 'bg-good-tint text-good'}`}>{statusText(p)}</p>
    {p.blocked && <p class="mt-2 text-sm text-bad">{p.blocked}</p>}
    {used.length > 0 && <div data-testid="cma-used" role="status" class="mt-3 rounded-control border-l-4 border-accent bg-accent/10 p-3">
      <p class="font-medium text-ink">The plan is used: these figures above changed.</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink tabular-nums">{used.map((c) => <li key={c.key}>{c.label}: {c.was || 'none'} → {c.now}</li>)}</ul>
      <div class="mt-2 flex flex-wrap gap-2">
        <button type="button" data-testid="cma-undo" class={BUTTON} onClick={undo}>Undo</button>
        <button type="button" data-testid="cma-keep" class={BUTTON} onClick={keep}>Keep these</button>
      </div>
    </div>}
    {p.needs.length > 0 && <ul data-testid="cma-needs" class="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">
      {p.needs.slice(0, 8).map((n) => <li key={n}>{n}</li>)}{p.needs.length > 8 && <li>and {p.needs.length - 8} more</li>}</ul>}
    {v && <>
      <dl class="paper shadow-paper mt-4 grid gap-3 rounded-card p-4 sm:grid-cols-3 sm:p-6">
        {v.key.map((k, i) => <div key={k.label}>
          <dt class={`text-sm ${MUTED}`}>{k.label}</dt>
          <dd data-testid={`cma-key-${i}`} class="figure text-2xl text-ink">{k.value}</dd>
          {k.note && <dd class={`text-sm ${MUTED}`}>{k.note}</dd>}
        </div>)}
      </dl>
      {!p.blocked && <Levels s={s} update={update} use={use} />}
      {v.flags.length > 0 && <div class="mt-4">
        <h3 class="text-title text-ink">To look at</h3>
        <ul data-testid="cma-flags" class="mt-1 max-w-prose list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{v.flags.map((f) => <li key={f}>{f}</li>)}</ul>
      </div>}
      {v.tables.map((t) => <FormTable key={t.id} t={t} />)}
    </>}
  </Section>;
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
  return <Section id="download" title="Download the CMA data">
    <p class={`mt-2 ${HINT}`}>A PDF for the lender and an Excel copy whose Check sheet redoes the main figures by formulas, made in your browser.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      {field('name', 'Business’s name')}
      {field('preparedBy', 'Prepared by, if any', 'Your name or your firm’s.')}
    </div>
    {ready
      ? <div class="mt-5">
        <p data-testid="cma-doc-status" class={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${own.length
          ? 'bg-warn-tint text-warn' : 'bg-good-tint text-good'}`}>{docStatus(s, p)}</p>
        {own.length > 0 && <ul data-testid="cma-doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="cma-download-pdf" class={FILLED} onClick={() => go('pdf')}>Download PDF</button>
          <button type="button" data-testid="cma-download-xlsx" class={BUTTON} onClick={() => go('xlsx')}>Download Excel</button>
        </div>
      </div>
      : <p data-testid="cma-doc-wait" class={`mt-4 ${HINT}`}>{p.blocked ? 'No document while the two computations disagree.' : 'The document can be made once the forms show figures.'}</p>}
  </Section>;
}
