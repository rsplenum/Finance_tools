/**
 * The DSCR made new (NEW1, docs/WORKED-PAGE.md §4): what the worked page shows, built from the state and the engine's
 * preview, with no markup, so it is tested as data. Every figure comes from the engine (`preview`, `maxLoanAmount` by way
 * of `p.largest`, `dscrOptions` by way of `optionsOf`); this file only says them in words and marks whose each fact is.
 *
 * Ink, pencil, print (§3): a fact is ink once the borrower typed or confirmed it (`mine`), pencil while it is the
 * example's (to be replaced or confirmed before the paper is complete) or a stated assumption (may stand). Rule 14 as
 * Rahul read it (D-UX-358): a figure shows from the first fact, marked with what it leaves out.
 */
import { inr, lakhCrore, rs } from '../../../engine/util';
import { amountOf, BORROWER_CHOICES, frontDoor, numberOf, preview, tidyAmount, withBorrower, withFrontNeeds, yearsOf, type Preview, type State } from './model';
import { optionsOf, setupOf, termWords, writeTerms } from './rounds';
import type { LinkTerms } from '../../../engine/dscr-linked';
import { N } from './words';

/** The facts, in the ladder's order (§7 NEW1): the walk asks the first six; the last two are stated assumptions that may stand. */
export type FactId = 'profit' | 'amount' | 'years' | 'rate' | 'borrower' | 'growth' | 'emis' | 'depreciation';
export const WALK: FactId[] = ['profit', 'amount', 'years', 'rate', 'borrower', 'growth'];
export const FACTS: FactId[] = [...WALK, 'emis', 'depreciation'];
/** A stated assumption (`engine/data/defaults.json`: otherLoans, and the front door's depreciation left out). */
export const ASSUMED_FACTS: FactId[] = ['emis', 'depreciation'];

/** The page's whole state: the answers, and which facts are the borrower's own. Kept on the device under a version. */
export interface Case { s: State; mine: FactId[] }

/**
 * The example (§7 NEW1: fictional, round figures, passes). A partnership firm earning ₹6,00,000 a year before
 * interest, depreciation and tax, sales growing 5% a year, borrows ₹12,00,000 at 12% over 5 years (60 EMIs), drawn
 * in `month`; no other loans, no depreciation. Worked twice in tests/dscr-worked.test.ts.
 */
export function exampleState(month: string): State {
  const s = withBorrower(frontDoor(month), 'firm');
  return {
    ...s, cells: { ...s.cells, pbdit: ['6,00,000'] }, modes: { ...s.modes, pbdit: 'grow' }, rates: { ...s.rates, pbdit: '5' },
    loan: { ...s.loan, amount: '12,00,000', ratePct: '12', instalments: '60' },
  };
}
export const exampleCase = (month: string): Case => ({ s: exampleState(month), mine: [] });

const perYear = (s: State) => (s.loan.repayment === 'quarterly' ? 4 : 12);

/** A fact as its field holds it. */
export function factText(s: State, id: FactId): string {
  switch (id) {
    case 'profit': return s.cells.pbdit?.[0] ?? '';
    case 'growth': return s.rates.pbdit ?? '';
    case 'amount': return s.loan.amount;
    case 'rate': return s.loan.ratePct;
    case 'years': { const k = numberOf(s.loan.instalments); return k === undefined ? '' : String(+(k / perYear(s)).toFixed(2)); }
    case 'borrower': return s.borrower ?? '';
    case 'emis': return s.modes.otherLoans === 'emi' ? s.running[0]?.emi ?? '' : '';
    case 'depreciation': return s.modes.depreciation === 'none' ? '' : s.cells.depreciation?.[0] ?? '';
  }
}

/** The largest figure a field takes: past it the figure is said back as not taken (twenty 9s, §4). */
const MOST: Partial<Record<FactId, number>> = { profit: 1e11, amount: 1e11, emis: 1e10, depreciation: 1e11 };
const RANGE: Partial<Record<FactId, [number, number]>> = { years: [0.25, 30], rate: [0.01, 40], growth: [-50, 100] };

/** What is wrong with a fact as typed, in words, or undefined when it is taken. Empty is taken for EMIs and depreciation (none). */
export function factProblem(id: FactId, t: string): string | undefined {
  if (id === 'borrower') return undefined;
  if (!t.trim()) return id === 'emis' || id === 'depreciation' ? undefined : N.sheet.empty;
  const money = id === 'profit' || id === 'amount' || id === 'emis' || id === 'depreciation';
  const n = money ? amountOf(t) : numberOf(t);
  if (n === undefined || !Number.isFinite(n)) return money ? N.sheet.notMoney : N.sheet.notNumber;
  if (money) {
    if (n < 0 && id !== 'profit') return N.sheet.negative;
    if (n === 0 && id === 'amount') return N.sheet.zeroLoan;
    if (Math.abs(n) > (MOST[id] ?? Infinity)) return N.sheet.tooLarge;
    return undefined;
  }
  const [lo, hi] = RANGE[id] ?? [-Infinity, Infinity];
  return n < lo || n > hi ? N.sheet.range(lo, hi) : undefined;
}

/** Writes a fact as the front door does (`Calculator.tsx` FrontDoor), so For professionals shows it too. */
export function writeFact(s: State, id: FactId, t: string): State {
  switch (id) {
    case 'profit': return { ...s, cells: { ...s.cells, pbdit: [tidyAmount(t), ...(s.cells.pbdit ?? []).slice(1)] }, modes: { ...s.modes, pbdit: 'grow' } };
    case 'growth': return { ...s, rates: { ...s.rates, pbdit: t } };
    case 'amount': return { ...s, loan: { ...s.loan, amount: tidyAmount(t) } };
    case 'rate': return { ...s, loan: { ...s.loan, ratePct: t.replace(/%\s*$/, '').trim() } };
    case 'years': { const n = numberOf(t); return { ...s, loan: { ...s.loan, instalments: n === undefined ? t : String(Math.round(n * perYear(s))) } }; }
    case 'borrower': return withBorrower(s, t);
    case 'emis': return t.trim()
      ? { ...s, modes: { ...s.modes, otherLoans: 'emi' }, running: [{ emi: tidyAmount(t), last: s.running[0]?.last ?? '' }, ...s.running.slice(1)] }
      : { ...s, modes: { ...s.modes, otherLoans: 'none' } };
    case 'depreciation': return t.trim()
      ? { ...s, cells: { ...s.cells, depreciation: [tidyAmount(t), ...(s.cells.depreciation ?? []).slice(1)] }, modes: { ...s.modes, depreciation: 'same' } }
      : { ...s, modes: { ...s.modes, depreciation: 'none' } };
  }
}

/** Facts whose value differs between two states: what a change made in For professionals or by an option touched. */
export const changedFacts = (a: State, b: State) => FACTS.filter((id) => factText(a, id) !== factText(b, id));
export const withMine = (mine: FactId[], add: FactId[]) => FACTS.filter((id) => mine.includes(id) || add.includes(id));

/** An amount for skimming: whole lakh or crore when it is one (₹6 lakh, ₹12.5 lakh), else every rupee. */
export function money(n: number): string {
  const r = Math.round(n);
  if (Math.abs(r) >= 1e5 && r % 1000 === 0) { try { return lakhCrore(r, { about: false }); } catch { /* every rupee */ } }
  return `₹${inr(r)}`;
}

export type Kind = 'ink' | 'example' | 'assumed';
export interface FactView {
  id: FactId; kind: Kind; text: string; label: string; spoken: string;
  /** The words around the figure in the sentence. */
  before?: string; after?: string;
}
/** The sentence's order, which is not the ladder's. */
const SENTENCE: FactId[] = ['borrower', 'profit', 'growth', 'amount', 'rate', 'years', 'emis', 'depreciation'];
const kindOf = (id: FactId, mine: FactId[]): Kind => (mine.includes(id) ? 'ink' : ASSUMED_FACTS.includes(id) ? 'assumed' : 'example');

/** The facts as one sentence (§4 part 5): "A firm earning ₹6 lakh a year, growing 5% a year, borrows ₹12 lakh at 12% over 5 years." */
export function factsOf(c: Case): FactView[] {
  const { s, mine } = c, own = s.source !== 'plan';
  const n = (t: string) => amountOf(t);
  const who = BORROWER_CHOICES.find((b) => b.id === s.borrower);
  const k = numberOf(s.loan.instalments), months = k === undefined ? undefined : Math.round(k * (12 / perYear(s)));
  const emi = n(factText(s, 'emis')), dep = n(factText(s, 'depreciation'));
  const shown: Record<FactId, { text: string; before?: string; after?: string }> = {
    borrower: { text: who ? N.who[who.id as keyof typeof N.who] : N.who.none },
    profit: own ? { text: N.facts.ownYears, before: ' with ' } : { text: n(factText(s, 'profit')) === undefined ? '—' : money(n(factText(s, 'profit'))!), before: ' earning ', after: ' a year' },
    growth: { text: `${factText(s, 'growth') || '—'}%`, before: ', growing ', after: ' a year' },
    amount: { text: n(s.loan.amount) === undefined ? '—' : money(n(s.loan.amount)!), before: ', borrows ' },
    rate: { text: `${s.loan.ratePct || '—'}%`, before: ' at ' },
    years: { text: months === undefined ? '—' : termWords(months), before: ' over ', after: '.' },
    emis: emi ? { text: `${money(emi)} a month`, before: ' ', after: N.facts.onOther } : { text: N.facts.noLoans, before: ' ' },
    depreciation: dep ? { text: money(dep), before: '; ', after: N.facts.depreciation } : { text: N.facts.noDep, before: '; ', after: '.' },
  };
  const ids = own ? SENTENCE.filter((id) => id !== 'growth') : SENTENCE;
  return ids.map((id) => {
    const kind = own && id === 'profit' ? 'ink' : kindOf(id, mine), v = shown[id];
    return { id, kind, ...v, label: N.label[id], spoken: `${N.label[id]}: ${v.text}, ${N.kindSpoken[kind]}` };
  });
}

/** What the reading still rests on (rule 14): the facts that are the example's. */
export const exampleFacts = (c: Case) => WALK.filter((id) => !c.mine.includes(id) && !(c.s.source !== 'plan' && (id === 'profit' || id === 'growth')));

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The mark beside the reading: whose the figures are (§3, rule 14). Undefined once nothing is the example's. */
export function markOf(c: Case): string | undefined {
  const left = exampleFacts(c);
  if (!left.length) return undefined;
  const yours = FACTS.filter((id) => c.mine.includes(id));
  if (!yours.length) return N.mark.example;
  return N.mark.part(list(yours.map((id) => N.name[id])), list(left.map((id) => N.name[id])));
}

export type ReadingState = 'carries' | 'short' | 'cannot' | 'wait';
export interface Reading { state: ReadingState; text: string; banker?: string }

/** The page's preview: the engine's, with what the front door leaves unanswered listed as needed. */
export function previewOf(s: State): Preview {
  return withFrontNeeds(s, preview(s), yearsOf(s).years[0]);
}

/** The reading (§4 part 2): the cash first, the banker's term second; three states, never a bare ratio. */
export function readingOf(c: Case, p: Preview): Reading {
  const { s } = c;
  if (p.blocked) return { state: 'wait', text: p.blocked };
  if (p.needs.length || !p.statement || !p.verdict) return { state: 'wait', text: N.reading.wait(list(p.needs.map((x) => x.replace(/\.$/, '').toLowerCase()))) };
  const asked = amountOf(s.loan.amount) ?? 0, most = p.largest?.amount;
  const noun = BORROWER_CHOICES.find((b) => b.id === s.borrower) ? N.noun[s.borrower as keyof typeof N.noun] : N.noun.none;
  const who = c.mine.length || s.source !== 'plan' ? N.reading.yours : N.reading.example(noun);
  const t = s.target, banker = p.average && p.lowest
    ? N.reading.banker(p.average, p.lowest, p.lowestYear ?? '', t.average.trim() && t.minimum.trim() ? [t.average, t.minimum] : undefined) : undefined;
  if (p.verdict.meets) {
    return { state: 'carries', text: most && most > asked ? N.reading.carriesMore(who, lakhCrore(most), money(asked)) : N.reading.carries(who, money(asked)), banker };
  }
  if (most && most > 0) return { state: 'short', text: N.reading.short(who, lakhCrore(most), money(asked)), banker };
  return { state: 'cannot', text: N.reading.cannot(who), banker };
}

/** One year of the picture: the cash the business has for the loan against what it must repay, on one scale. */
export interface Bar { fy: string; cash: number; service: number; cashText: string; serviceText: string; tight: boolean; part?: string; counted: boolean }
const inLakh = (n: number) => (n / 1e5).toFixed(2);
export function barsOf(p: Preview): Bar[] {
  const st = p.statement;
  if (!st) return [];
  const cash = st.lines.find((l) => l.id === 'available'), service = st.lines.find((l) => l.id === 'service');
  if (!cash?.n || !service?.n) return [];
  return st.years.map((fy, i) => ({
    fy, cash: cash.n![i] ?? 0, service: service.n![i] ?? 0, cashText: inLakh(cash.n![i] ?? 0), serviceText: inLakh(service.n![i] ?? 0),
    tight: fy === p.lowestYear, part: p.partYears?.[fy], counted: st.counted[i] !== false,
  }));
}

/** A whole option that works (D-UX-346), as was → becomes; applied in one tap. */
export interface OptionCard { id: string; title: string; terms: LinkTerms; rows: { label: string; was?: string; now: string }[]; more: string }
export function optionsFor(s: State, p: Preview): OptionCard[] {
  const u = setupOf(s);
  if (!u) return [];
  const per = 12 / perYear(s), was: Record<string, string> = {
    'Repay over': termWords(u.typed.instalments * per), 'The loan': rs(u.typed.amount), 'Your own money': 'None',
    'Each instalment': p.loanLine?.instalment.replace(/^EMI /, '') ?? '', 'Interest over the loan': p.loanLine?.totalInterest ?? '',
  };
  return optionsOf(u, u.typed.amount).map((o) => ({
    id: o.id, title: o.title, terms: o.terms, more: o.more,
    rows: o.lines.filter(([label]) => label !== 'Total you pay out').map(([label, now]) => ({ label, now, ...(was[label] && was[label] !== now ? { was: was[label] } : {}) })),
  }));
}
export const applyOption = (c: Case, o: OptionCard): Case => {
  const s = writeTerms(c.s, o.terms);
  return { s, mine: withMine(c.mine, changedFacts(c.s, s)) };
};

export type NextKind = 'own' | 'continue' | 'options' | 'change' | 'paper';
/** The one next step (§4 part 4): the borrower's own figures, the options when it falls short, else the paper. */
export function nextOf(c: Case, r: Reading, options: number): { kind: NextKind; label: string } {
  // Once the borrower has begun, the walk comes first: ways to make it work are only worth offering on their own facts.
  const left = exampleFacts(c);
  if (left.length && c.mine.length) return { kind: 'continue', label: N.next.continue(N.name[left[0]]) };
  if (r.state === 'short' || r.state === 'cannot') return options ? { kind: 'options', label: N.next.options } : { kind: 'change', label: N.next.change };
  if (r.state === 'wait') return { kind: 'change', label: N.next.change };
  if (left.length) return { kind: 'own', label: N.next.own };
  return { kind: 'paper', label: N.next.paper };
}

/** What the paper must say while a fact is the example's: listed as still needed, so every file is marked (§3). */
export const exampleNeeds = (c: Case) => exampleFacts(c).map((id) => N.needs(N.name[id]));
