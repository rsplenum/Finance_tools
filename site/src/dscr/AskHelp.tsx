/**
 * The room under each question put to work (Rahul, 21-11-2026: "the whole page is empty, it can be used to explain or
 * help the user in entering the correct data"). Each question shows where its answer is found: a small copy of the paper
 * the borrower already has (the profit and loss account, the bank's letter, the bank statement), the line to read marked
 * with the highlighter, and one sentence. Grey bars stand for amounts: the pictures carry no figures (rule 12).
 */
import type { ComponentChildren } from 'preact';
import { BORROWER_CHOICES } from './model';
import type { FactId } from './worked';
import { N } from './words';

const H = N.help;

/** A line of a paper: its words, a grey bar for its amount, marked when it holds the answer; `sign` in the margin. */
function Line({ label, mark, sign, w = 3.5, n = 0, rule }: { label: string; mark?: boolean; sign?: string; w?: number; n?: number; rule?: boolean }) {
  return <div class={`flex items-center gap-2 py-1 ${rule ? 'border-t border-current/20 font-semibold' : ''}`}>
    <span class="w-3 shrink-0 text-center font-semibold">{sign}</span>
    <span class={`flex flex-1 items-center justify-between gap-3 rounded-[0.2em] px-1 ${mark ? 'ask-mark' : ''}`} style={mark ? { '--n': n } : undefined}>
      <span>{label}</span><span class="h-1.5 rounded-full bg-current opacity-30" style={{ width: `${w}rem` }} />
    </span>
  </div>;
}

/** A small copy of a paper the borrower holds, a little askew, as if laid on the desk. */
function Paper({ title, children, tilt = -1 }: { title: string; children: ComponentChildren; tilt?: number }) {
  return <div aria-hidden="true" class="paper shadow-paper mx-auto w-full max-w-[20rem] rounded-[3px] px-4 pt-3 pb-4 text-sm" style={{ rotate: `${tilt}deg` }}>
    <p class="mb-1.5 border-b border-current/20 pb-1.5 text-xs font-semibold tracking-wide uppercase opacity-70">{title}</p>
    {children}
  </div>;
}

function Card({ title, children, say }: { title: string; children: ComponentChildren; say: ComponentChildren }) {
  return <figure class="grid gap-4">
    <p class="text-sm font-semibold tracking-wide text-ink-muted uppercase">{title}</p>
    {children}
    <figcaption class="text-base text-ink-muted text-pretty">{say}</figcaption>
  </figure>;
}

/** Profit and loss, with the lines a question reads marked. */
const Accounts = ({ marks }: { marks: string[] }) => {
  const m = (k: string) => marks.indexOf(k);
  return <Paper title={H.pl.title}>
    <Line label={H.pl.sales} w={5} />
    <Line label={H.pl.costs} w={4.25} />
    <Line label={H.pl.interest} mark={m('interest') >= 0} n={m('interest')} sign={marks.length > 1 ? '+' : ''} w={1.75} />
    <Line label={H.pl.depreciation} mark={m('depreciation') >= 0} n={m('depreciation')} sign={marks.length > 1 ? '+' : ''} w={1.5} />
    <Line label={H.pl.pbt} w={2.5} rule />
    <Line label={H.pl.tax} mark={m('tax') >= 0} n={m('tax')} sign={marks.length > 1 ? '+' : ''} w={1.25} />
    <Line label={H.pl.pat} mark={m('pat') >= 0} n={m('pat')} w={2} rule />
  </Paper>;
};

/** The bank's letter or quote, with one line marked. */
const Letter = ({ mark }: { mark: 'amount' | 'rate' | 'years' }) => <Paper title={H.letter.title} tilt={1}>
  <Line label={H.letter.amount} mark={mark === 'amount'} w={3.5} />
  <Line label={H.letter.rate} mark={mark === 'rate'} w={1.5} />
  <Line label={H.letter.years} mark={mark === 'years'} w={2} />
  <Line label={H.letter.fee} w={1.75} />
</Paper>;

/** Who borrows decides two things: the tax on the profit, and which EMIs count. The engine's own words for each. */
function Borrowers() {
  return <Card title={H.borrower.title} say={H.borrower.say}>
    <dl class="grid gap-px overflow-hidden rounded-card border border-line bg-line text-sm">
      {BORROWER_CHOICES.map((b) => <div key={b.id} class="grid gap-1 bg-surface px-4 py-3">
        <dt class="text-base font-semibold text-ink">{b.label}</dt>
        <dd class="text-ink-muted"><span class="font-medium text-ink">{H.borrower.tax}</span> {b.tax}</dd>
        <dd class="text-ink-muted"><span class="font-medium text-ink">{H.borrower.emis}</span> {H.borrower.counts[b.id as keyof typeof H.borrower.counts] ?? b.emis}</dd>
      </div>)}
    </dl>
  </Card>;
}

/** Sales over the years, each a step up: the step is what is asked. No figures, only the shape. */
function Growth() {
  const bars = [52, 64, 78];
  return <Card title={H.growth.title} say={H.growth.say}>
    <div aria-hidden="true" class="mx-auto flex h-28 w-full max-w-[20rem] items-end gap-4 border-b border-line px-4">
      {bars.map((h, i) => <div key={i} class="flex flex-1 flex-col items-center justify-end" style={{ height: `${h}%` }}>
        {i > 0 && <span class="ask-mark mb-0 w-full rounded-t-[3px]" style={{ height: `${((h - bars[i - 1]) / h) * 100}%`, '--n': i - 1 }} />}
        <span class="w-full flex-1 rounded-t-[3px] bg-ink/25" style={i > 0 ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : undefined} />
      </div>)}
    </div>
    <div aria-hidden="true" class="mx-auto -mt-2 flex w-full max-w-[20rem] gap-4 px-4 text-center text-sm text-ink-muted">
      {H.growth.years.map((y) => <span key={y} class="flex-1">{y}</span>)}
    </div>
  </Card>;
}

/** The cost, the share the borrower puts in, and the loan: only the loan is asked. */
function Share() {
  return <Card title={H.amount.title} say={H.amount.say}>
    <div aria-hidden="true" class="mx-auto grid w-full max-w-[20rem] gap-1.5 text-sm">
      <div class="flex h-10 overflow-hidden rounded-control">
        <span class="flex w-1/4 items-center justify-center bg-ink/15 text-ink">{H.amount.yours}</span>
        <span class="ask-mark flex flex-1 items-center justify-center font-semibold text-ink">{H.amount.loan}</span>
      </div>
      <div class="flex items-center gap-2 text-ink-muted"><span class="h-px flex-1 bg-line" />{H.amount.cost}<span class="h-px flex-1 bg-line" /></div>
    </div>
  </Card>;
}

/** The loan's life: paid out, then an EMI each month from the first to the last; the span is what is asked. */
function Span() {
  return <Card title={H.years.title} say={H.years.say}>
    <div aria-hidden="true" class="mx-auto grid w-full max-w-[20rem] gap-1 text-sm text-ink-muted">
      <div class="flex items-center gap-1">
        <span class="size-2.5 shrink-0 rounded-full border-2 border-ink/50" />
        <span class="ask-mark flex h-6 flex-1 items-center justify-between rounded-[3px] px-1">
          {Array.from({ length: 12 }, (_, i) => <span key={i} class="h-3 w-0.5 rounded-full bg-ink/60" />)}
        </span>
      </div>
      <div class="flex justify-between pl-3.5"><span>{H.years.first}</span><span>{H.years.last}</span></div>
    </div>
  </Card>;
}

/** A bank statement with the loan debits marked: the same debit each month. */
function Statement({ borrower }: { borrower?: string }) {
  const rows = [H.emis.upi, H.emis.emi, H.emis.cash, H.emis.emi2, H.emis.upi];
  const say = H.emis.say[borrower as keyof typeof H.emis.say] ?? H.emis.say.any;
  return <Card title={H.emis.title} say={say}>
    <Paper title={H.emis.paper} tilt={-0.8}>
      {rows.map((r, i) => <Line key={i} label={r} mark={r === H.emis.emi || r === H.emis.emi2} n={r === H.emis.emi2 ? 1 : 0} w={[2.5, 2, 3, 1.5, 1.75][i]} />)}
    </Paper>
  </Card>;
}

export function AskHelp({ id, borrower }: { id: FactId; borrower?: string }) {
  switch (id) {
    case 'borrower': return <Borrowers />;
    case 'profit': return <Card title={H.where} say={H.profit}><Accounts marks={['pat', 'tax', 'depreciation', 'interest']} /></Card>;
    case 'growth': return <Growth />;
    case 'amount': return <Share />;
    case 'rate': return <Card title={H.where} say={H.rate}><Letter mark="rate" /></Card>;
    case 'years': return <Span />;
    case 'emis': return <Statement borrower={borrower} />;
    case 'depreciation': return <Card title={H.where} say={H.depreciation}><Accounts marks={['depreciation']} /></Card>;
  }
}
