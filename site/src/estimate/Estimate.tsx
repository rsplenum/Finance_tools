/**
 * The construction or renovation estimate. What it is for sets the heads; then the building's area, the items (each
 * under a head: what it is, how much, the unit, the rate), where the rates come from, GST and contingency; then the
 * estimate as the engine works it out, provisional while anything is missing; last, the document's own facts and the
 * three downloads. Figures: engine/estimate.ts only, via model.ts.
 */
import { useMemo, useState } from 'preact/hooks';
import { BUTTON, Choice, HINT, Section, SelectField, TextField } from '../fields';
import { printable } from '../doc/pdf';
import { isoDate, save, type FileKind } from '../download';
import { docNeeds, docStatus, estimateDoc, fileName } from './document';
import {
  EMPTY, FAMILY_CHOICES, KIND_CHOICES, QUOTE_GST, QUOTE_RULE, QUOTE_WHY, UNIT_CHOICES, blankItem, fromBill, headsOf, plainOf, preview, quoteView, rateOf, statusText, tidyRate, withHead,
  type EstimateFacts, type EstimatePreview, type EstimateState, type ItemText, type QuoteView,
} from './model';
import { sharedPlan } from './shared';

type Update = (f: (s: EstimateState) => EstimateState) => void;
const MUTED = 'text-slate-600 dark:text-slate-300';
const bad = (t: string, read: (t: string) => unknown) => !!t.trim() && read(t) === undefined;

export function EstimateCalculator() {
  const [s, setS] = useState<EstimateState>(EMPTY);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => preview(s), [s]);
  const q = useMemo(() => quoteView(s), [s]);
  return <div>
    <FromBill s={s} update={update} />
    <Choice name="fld-kind" legend="What is the estimate for?" options={KIND_CHOICES} value={s.kind}
      onChange={(kind) => update((x) => ({ ...x, kind, items: x.items.map((it) => ({ ...it, head: headsOf(kind).some((h) => h.id === it.head) ? it.head : '' })) }))} />
    {s.kind && <>
      <Section id="building" title="The building">
        <TextField id="fld-area" class="mt-4 max-w-xs" label={s.kind === 'construction' ? 'Built-up area (sq ft)' : 'Built-up area (sq ft), if the cost per sq ft is wanted'}
          inputMode="decimal" value={s.area} placeholder="like 1,200" invalid={bad(s.area, plainOf)} said={bad(s.area, plainOf) ? 'Not understood. Type a number, like 1,200.' : undefined}
          onCommit={(area) => update((x) => ({ ...x, area }))} />
      </Section>
      <Items s={s} update={update} p={p} q={q} />
      {q && <Against q={q} />}
      <Section id="rates" title="Rates, GST and contingency">
        <TextField id="fld-basis" class="mt-4" label="Where the rates come from" hint="Lenders ask for it. Like “Contractor’s quotation of 25-09-2026” or “PWD schedule of rates 2025-26”."
          value={s.basis} onCommit={(basis) => update((x) => ({ ...x, basis }))} />
        <Choice name="fld-gst" legend="GST" value={s.gst} onChange={(gst) => update((x) => ({ ...x, gst }))}
          options={[{ value: 'included', label: 'The rates include GST' }, { value: 'add', label: 'Add GST to the rates' }]} />
        {s.gst === 'add' && <TextField id="fld-gstPct" class="mt-3 max-w-xs" label="GST rate (%)" inputMode="decimal" value={s.gstPct} placeholder="like 18"
          invalid={bad(s.gstPct, plainOf)} onCommit={(gstPct) => update((x) => ({ ...x, gstPct }))} />}
        <Choice name="fld-contingency" legend="Contingency, for unforeseen work" value={s.contingency} onChange={(contingency) => update((x) => ({ ...x, contingency }))}
          options={[{ value: 'none', label: 'None' }, { value: 'add', label: 'Add a percentage' }]} />
        {s.contingency === 'add' && <TextField id="fld-contingencyPct" class="mt-3 max-w-xs" label="Contingency (%)" inputMode="decimal" value={s.contingencyPct}
          placeholder="like 3" invalid={bad(s.contingencyPct, plainOf)} onCommit={(contingencyPct) => update((x) => ({ ...x, contingencyPct }))} />}
      </Section>
      <Result p={p} />
      <Download s={s} p={p} update={update} />
    </>}
  </div>;
}

/** The items, each a card: its head, what it is, the quantity and unit, the rate; its amount once the estimate works out. */
function Items({ s, update, p, q }: { s: EstimateState; update: Update; p: EstimatePreview; q?: QuoteView }) {
  const heads = headsOf(s.kind), set = (i: number, patch: Partial<ItemText>) => update((x) => ({ ...x, items: x.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) }));
  return <Section id="items" title="Items">
    <p class={`mt-2 ${HINT}`}>One card per item. The amount is the quantity × the rate.</p>
    <ol class="mt-4 space-y-4">
      {s.items.map((it, i) => {
        const head = heads.find((h) => h.id === it.head), n = i + 1;
        return <li key={i} data-testid={`item-${n}`} class="rounded-lg border border-slate-300 p-4 dark:border-slate-700">
          <div class="flex items-center justify-between gap-2">
            <p class="font-medium text-slate-900 dark:text-slate-100">Item {n}{it.no && <span class={`font-normal ${MUTED}`}> · No. {it.no} on the bill</span>}</p>
            {s.items.length > 1 && <button type="button" data-testid={`remove-item-${n}`} class={BUTTON}
              onClick={() => update((x) => ({ ...x, items: x.items.filter((_, k) => k !== i) }))}>Remove</button>}
          </div>
          <div class="mt-2 grid gap-3 sm:grid-cols-2">
            <SelectField id={`fld-item-${n}-head`} label="Head" value={it.head} placeholder="Choose a head" options={heads.map((h) => ({ value: h.id, label: h.label }))}
              onChange={(h) => update((x) => withHead(x, i, h))} />
            <TextField id={`fld-item-${n}-description`} label="What it is" value={it.description} placeholder={head ? `like ${head.example}` : undefined}
              onCommit={(description) => set(i, { description })} />
            <TextField id={`fld-item-${n}-quantity`} label="Quantity" inputMode="decimal" value={it.quantity} invalid={bad(it.quantity, plainOf)}
              said={bad(it.quantity, plainOf) ? 'Not understood. Type a number, like 45 or 12.5.' : undefined} onCommit={(quantity) => set(i, { quantity })} />
            <SelectField id={`fld-item-${n}-unit`} label="Unit" value={it.unit} placeholder="Choose a unit" options={UNIT_CHOICES} onChange={(unit) => set(i, { unit })} />
            <TextField id={`fld-item-${n}-rate`} label={`Rate (Rs.${it.unit ? ` per ${it.unit}` : ''})`} inputMode="decimal" value={it.rate} tidy={tidyRate}
              invalid={bad(it.rate, rateOf)} said={bad(it.rate, rateOf) ? 'Not understood. Type 9,500 or 1.85 L.' : undefined} onCommit={(rate) => set(i, { rate })} />
            <p class="self-end text-sm text-slate-700 dark:text-slate-300">Amount: <span data-testid={`item-${n}-amount`} class="font-medium tabular-nums">
              {p.amounts[i] ? `Rs. ${p.amounts[i]}` : '—'}</span></p>
          </div>
          {q?.lines[i] && <p data-testid={`item-${n}-check`} class={`mt-3 text-sm ${q.lines[i].flagged ? 'font-medium text-amber-800 dark:text-amber-300' : MUTED}`}>{q.lines[i].text}</p>}
          {q && !it.from && (q.lines[i]?.where === 'not-matched' || it.pick) && <SelectField id={`fld-item-${n}-pick`} class="mt-2 max-w-sm" label="What it is in the library"
            value={it.pick ?? ''} placeholder="Choose one" options={FAMILY_CHOICES} onChange={(pick) => set(i, { pick: pick || undefined })} />}
        </li>;
      })}
    </ol>
    <button type="button" data-testid="add-item" class={`mt-4 ${BUTTON}`} onClick={() => update((x) => ({ ...x, items: [...x.items, blankItem()] }))}>Add an item</button>
  </Section>;
}

/**
 * Start from the bill (E4b): the planning estimate's bill of quantities as the items, for the contractor's rates. It
 * replaces the items typed so far, after asking.
 */
function FromBill({ s, update }: { s: EstimateState; update: Update }) {
  const [said, setSaid] = useState('');
  const go = () => {
    const typed = s.items.some((it) => it.description.trim() || it.quantity.trim() || it.rate.trim());
    if (typed && !window.confirm('Replace the items typed so far with the bill’s lines?')) return;
    const next = fromBill(s, sharedPlan());
    if (typeof next === 'string') { setSaid(next); return; }
    setSaid('');
    update(() => next);
  };
  return <div class="mb-6">
    <p class={HINT}>Asked contractors to quote on the bill of quantities above? Start from it: its lines filled in, for you to type one contractor’s rates and see each against the library.</p>
    <button type="button" data-testid="from-bill" class={`mt-2 ${BUTTON}`} onClick={go}>Start from the bill</button>
    {said && <p data-testid="from-bill-said" class="mt-2 text-sm text-amber-800 dark:text-amber-300">{said}</p>}
  </div>;
}

/** Each rate against the library's band at its line's level (E4b): the lines to check, those left out and those not matched; the rule and the GST line. */
function Against({ q }: { q: QuoteView }) {
  const list = (id: string, title: string, xs: string[]) => xs.length > 0 && <div class="mt-3">
    <p class="text-sm font-medium text-slate-900 dark:text-slate-100">{title}: {xs.length}</p>
    <ul data-testid={id} class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{xs.map((x, k) => <li key={k}>{x}</li>)}</ul>
  </div>;
  return <Section id="against" title="Against the library">
    <p data-testid="quote-gst" class="mt-2 text-sm text-slate-800 dark:text-slate-200">{QUOTE_GST}</p>
    <p data-testid="quote-rule" class={`mt-2 text-sm ${MUTED}`}>{QUOTE_RULE} {QUOTE_WHY}</p>
    {q.blocked && <p class="mt-2 text-sm text-red-700 dark:text-red-300">{q.blocked}</p>}
    {!q.blocked && !q.flagged.length && !q.leftOut.length && !q.unmatched.length && <p data-testid="quote-clear" class="mt-3 text-sm text-slate-800 dark:text-slate-200">No rate to check, and nothing left out.</p>}
    {list('quote-flagged', 'Rates to check', q.flagged)}
    {list('quote-left-out', 'Left out of the quotation (no rate)', q.leftOut)}
    {list('quote-unmatched', 'Not matched to the library', q.unmatched)}
  </Section>;
}

/** The estimate as the engine works it out: the abstract of cost, the total and the cost per sq ft; or what is still needed. */
function Result({ p }: { p: EstimatePreview }) {
  const v = p.view;
  return <Section id="result" title="The estimate">
    <p data-testid="est-status" class={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${p.needs.length || p.blocked
      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'}`}>{statusText(p)}</p>
    {p.blocked && <p class="mt-2 text-sm text-red-700 dark:text-red-300">{p.blocked}</p>}
    {p.needs.length > 0 && <ul data-testid="est-needs" class="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{p.needs.map((n) => <li key={n}>{n}</li>)}</ul>}
    {v && <>
      <table data-testid="est-abstract" class="mt-4 w-full border-collapse text-sm">
        <thead><tr class="border-b border-slate-300 dark:border-slate-700">
          <th scope="col" class="py-2 pr-3 text-left font-medium text-slate-700 dark:text-slate-200">Abstract of cost</th>
          <th scope="col" class="py-2 text-right font-medium text-slate-700 dark:text-slate-200">Rupees</th>
        </tr></thead>
        <tbody>
          {v.heads.map((h) => <tr key={h.no} class="border-b border-slate-100 dark:border-slate-800">
            <th scope="row" class="py-1.5 pr-3 text-left font-normal text-slate-800 dark:text-slate-200">{h.no}. {h.label}</th>
            <td data-testid={`head-${h.no}`} class="py-1.5 text-right tabular-nums text-slate-800 dark:text-slate-200">{h.amount}</td>
          </tr>)}
          {v.totals.map((t) => <tr key={t.id} class={t.id === 'works' || t.id === 'total' ? 'border-t border-slate-400 dark:border-slate-500' : ''}>
            <th scope="row" class={`py-1.5 pr-3 text-left ${t.id === 'works' || t.id === 'total' ? 'font-semibold' : 'font-normal'} text-slate-900 dark:text-slate-100`}>{t.label}</th>
            <td data-testid={`est-${t.id}`} class={`py-1.5 text-right tabular-nums ${t.id === 'works' || t.id === 'total' ? 'font-semibold' : ''} text-slate-900 dark:text-slate-100`}>{t.amount}</td>
          </tr>)}
        </tbody>
      </table>
      {v.perSqft && <p class="mt-3 text-slate-900 dark:text-slate-100">Cost per sq ft of built-up area: <span data-testid="est-per-sqft" class="font-semibold tabular-nums">Rs. {v.perSqft}</span></p>}
      <p class={`mt-2 text-sm ${MUTED}`}>Each item's amount is on its card; the download lists them all.</p>
    </>}
  </Section>;
}

/** The document's own facts, asked once, then the PDF, the Excel copy and the Word copy. */
function Download({ s, p, update }: { s: EstimateState; p: EstimatePreview; update: Update }) {
  const f = s.doc, set = (patch: Partial<EstimateFacts>) => update((x) => ({ ...x, doc: { ...x.doc, ...patch } }));
  const english = (t: string) => (t.trim() && !printable(t) ? 'The document is in English: type this in English letters.' : undefined);
  const own = docNeeds(f), ready = !!p.view && !p.blocked;
  const go = (kind: FileKind) => {
    const now = new Date();
    save(estimateDoc(s, p, isoDate(now)), kind, fileName(s, p, kind), now);
  };
  const field = (id: keyof EstimateFacts, label: string, hint?: string) =>
    <TextField id={`fld-est-${id}`} label={label} hint={hint} value={f[id]} said={english(f[id])} invalid={!!english(f[id])} onCommit={(t) => set({ [id]: t })} />;
  return <Section id="download" title="Download the estimate">
    <p class={`mt-2 ${HINT}`}>A PDF for the lender, an Excel copy and a Word copy to edit, made in your browser from the figures above.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      {field('borrower', 'Borrower’s name')}
      {field('property', 'Property’s address')}
      {field('lender', 'Lender, if known')}
      {field('preparedBy', 'Prepared by', 'The engineer or architect, with registration number, if any.')}
    </div>
    {ready
      ? <div class="mt-5">
        <p data-testid="est-doc-status" class={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${own.length
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'}`}>{docStatus(s, p)}</p>
        {own.length > 0 && <ul data-testid="est-doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="est-download-pdf" class={BUTTON} onClick={() => go('pdf')}>Download PDF</button>
          <button type="button" data-testid="est-download-xlsx" class={BUTTON} onClick={() => go('xlsx')}>Download Excel</button>
          <button type="button" data-testid="est-download-docx" class={BUTTON} onClick={() => go('docx')}>Download Word</button>
        </div>
      </div>
      : <p data-testid="est-doc-wait" class={`mt-4 ${HINT}`}>{p.blocked ? 'No document while the two computations disagree.' : 'The document can be made once the estimate shows figures.'}</p>}
  </Section>;
}
