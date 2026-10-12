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
import { BUTTON, CellInput, Choice, HINT, Section, TextField } from '../fields';
import { printable } from '../doc/pdf';
import { isoDate, save, type FileKind } from '../download';
import { cmaDoc, docNeeds, docStatus, fileName } from './document';
import { ReadStatement } from './Read';
import { Levels } from './Levels';
import { CASE_CHOICES, COLLATERAL_HINT, applyCmaPlan, undoCmaPlan, type CmaChange, type CmaLevers } from './levers';
import {
  ASSUMPTIONS, HEADS, amountOf, columnsOf, emptyState, exampleState, preview, startYearOf, statusText, tidyAmount,
  type CmaFacts, type CmaPreview, type CmaState, type ViewTable,
} from './model';

type Update = (f: (s: CmaState) => CmaState) => void;
const MUTED = 'text-slate-600 dark:text-slate-300';
const KIND = { audited: 'audited', estimate: 'estimate', projection: 'projection' } as const;
const bad = (t: string) => !!t.trim() && amountOf(t) === undefined;

export function CmaCalculator() {
  const [s, setS] = useState<CmaState>(() => emptyState(startYearOf(new Date())));
  const update: Update = (f) => setS(f);
  const p = useMemo(() => preview(s), [s]);
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
    <div class="mt-3"><button type="button" data-testid="cma-example" class={BUTTON} onClick={() => update((x) => exampleState(x))}>Fill with the worked example</button></div>
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
    <details id="more-options" class="mt-6 rounded-lg border border-slate-200 dark:border-slate-800">
      <summary class="cursor-pointer px-4 py-3 font-medium text-teal-800 dark:text-teal-300">More options: promoters’ loans, collateral</summary>
      <div class="px-4 pb-4">
        <label class="flex items-start gap-2 text-slate-900 dark:text-slate-100">
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
      <ul data-testid="cma-assumed" class="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
        {ASSUMPTIONS.map((a) => <li key={a.id}><span class="font-medium text-slate-900 dark:text-slate-100">{a.what}:</span> {a.shown}. <span class={MUTED}>{a.why}.</span></li>)}
      </ul>
    </Section>
    <Download s={s} p={p} update={update} />
  </div>;
}

/** The figures of one form, heads down and years across; it scrolls sideways inside itself on a phone. */
function Grid({ form, title, s, update, was }: { form: 'II' | 'III'; title: string; s: CmaState; update: Update; was: (field: string) => string | undefined }) {
  const cols = columnsOf(s.startYear);
  return <Section id={`form-${form}`} title={title}>
    <div class="mt-3 overflow-x-auto">
      <table data-testid={`cma-input-${form}`} class="w-full border-collapse text-sm">
        <thead><tr class="border-b border-slate-300 dark:border-slate-700">
          <th scope="col" class="py-2 pr-3 text-left font-medium text-slate-700 dark:text-slate-200">Rupees</th>
          {cols.map((c) => <th key={c.id} scope="col" class="px-1 py-2 text-right font-medium whitespace-nowrap text-slate-700 dark:text-slate-200">{c.fy}<span class={`block text-xs font-normal ${MUTED}`}>{KIND[c.kind]}</span></th>)}
        </tr></thead>
        <tbody>
          {HEADS.filter((h) => h.form === form).map((h) => <tr key={h.id} class="border-b border-slate-100 dark:border-slate-800">
            <th scope="row" class="min-w-44 py-1.5 pr-3 text-left font-normal text-slate-800 dark:text-slate-200">{h.label}
              {'hint' in h && h.hint && <span class={`block text-xs ${MUTED}`}>{h.hint}</span>}</th>
            {cols.map((c) => { const v = s.figures[c.id][h.id]; return <td key={c.id} class="px-1 py-1">
              <CellInput id={`fld-cma-${c.id}-${h.id}`} name={`${h.label}, ${c.fy}`} value={v} decimal tidy={tidyAmount} invalid={bad(v)} changed={was(`fld-cma-${c.id}-${h.id}`)}
                onCommit={(t) => update((x) => ({ ...x, figures: { ...x.figures, [c.id]: { ...x.figures[c.id], [h.id]: t } } }))} />
            </td>; })}
          </tr>)}
        </tbody>
      </table>
    </div>
  </Section>;
}

/** One of the forms, its years across; it scrolls sideways inside itself on a phone. */
function FormTable({ t }: { t: ViewTable }) {
  const cols = t.columns.length + 1;
  return <details open={t.id === 'form1' || t.id === 'form5'} class="mt-4 rounded-lg border border-slate-200 dark:border-slate-800">
    <summary class="cursor-pointer px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{t.title}</summary>
    <div class="overflow-x-auto px-3 pb-3">
      <table data-testid={`cma-${t.id}`} class="w-full border-collapse text-sm">
        <thead><tr class="border-b border-slate-300 dark:border-slate-700">
          <th scope="col" class="py-2 pr-3 text-left font-medium text-slate-700 dark:text-slate-200">{t.first}</th>
          {t.columns.map((c) => <th key={c} scope="col" class="px-2 py-2 text-right font-medium whitespace-nowrap text-slate-700 dark:text-slate-200">{c}</th>)}
        </tr></thead>
        <tbody>
          {t.rows.map((r, i) => r.kind === 'head'
            ? <tr key={i}><th colSpan={cols} scope="colgroup" class="pt-3 pb-1 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300">{r.label}</th></tr>
            : <tr key={i} class={`border-b border-slate-100 dark:border-slate-800 ${r.kind ? 'border-t border-t-slate-300 dark:border-t-slate-600' : ''}`}>
              <th scope="row" class={`min-w-48 py-1.5 pr-3 text-left ${r.kind ? 'font-semibold' : 'font-normal'} text-slate-800 dark:text-slate-200`}>{r.label}</th>
              {r.values.map((x, k) => <td key={k} class={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums ${r.kind ? 'font-semibold' : ''} text-slate-800 dark:text-slate-200`}>{x}</td>)}
            </tr>)}
        </tbody>
      </table>
    </div>
  </details>;
}

function Result({ s, p, update, use, used, undo, keep }: { s: CmaState; p: CmaPreview; update: Update; use: (l: CmaLevers) => void; used: CmaChange[]; undo: () => void; keep: () => void }) {
  const v = p.view;
  return <Section id="result" title="The CMA data">
    <p data-testid="cma-status" class={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${p.needs.length || p.blocked
      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'}`}>{statusText(p)}</p>
    {p.blocked && <p class="mt-2 text-sm text-red-700 dark:text-red-300">{p.blocked}</p>}
    {used.length > 0 && <div data-testid="cma-used" role="status" class="mt-3 rounded-lg border border-teal-600 bg-teal-50 p-3 dark:border-teal-500 dark:bg-teal-950">
      <p class="font-medium text-slate-900 dark:text-slate-100">The plan is used: these figures above changed.</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800 tabular-nums dark:text-slate-200">{used.map((c) => <li key={c.key}>{c.label}: {c.was || 'none'} → {c.now}</li>)}</ul>
      <div class="mt-2 flex flex-wrap gap-2">
        <button type="button" data-testid="cma-undo" class={BUTTON} onClick={undo}>Undo</button>
        <button type="button" data-testid="cma-keep" class={BUTTON} onClick={keep}>Keep these</button>
      </div>
    </div>}
    {p.needs.length > 0 && <ul data-testid="cma-needs" class="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
      {p.needs.slice(0, 8).map((n) => <li key={n}>{n}</li>)}{p.needs.length > 8 && <li>and {p.needs.length - 8} more</li>}</ul>}
    {v && <>
      <dl class="mt-4 grid gap-3 sm:grid-cols-3">
        {v.key.map((k, i) => <div key={k.label} class="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
          <dt class={`text-sm ${MUTED}`}>{k.label}</dt>
          <dd data-testid={`cma-key-${i}`} class="text-xl font-semibold text-slate-900 tabular-nums dark:text-slate-100">{k.value}</dd>
          {k.note && <dd class={`text-sm ${MUTED}`}>{k.note}</dd>}
        </div>)}
      </dl>
      {!p.blocked && <Levels s={s} update={update} use={use} />}
      {v.flags.length > 0 && <div class="mt-4">
        <h3 class="font-medium text-slate-900 dark:text-slate-100">To look at</h3>
        <ul data-testid="cma-flags" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{v.flags.map((f) => <li key={f}>{f}</li>)}</ul>
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
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'}`}>{docStatus(s, p)}</p>
        {own.length > 0 && <ul data-testid="cma-doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="cma-download-pdf" class={BUTTON} onClick={() => go('pdf')}>Download PDF</button>
          <button type="button" data-testid="cma-download-xlsx" class={BUTTON} onClick={() => go('xlsx')}>Download Excel</button>
        </div>
      </div>
      : <p data-testid="cma-doc-wait" class={`mt-4 ${HINT}`}>{p.blocked ? 'No document while the two computations disagree.' : 'The document can be made once the forms show figures.'}</p>}
  </Section>;
}
