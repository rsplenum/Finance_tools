/**
 * Reading an audited statement (U1, D-UX-48). The PDF is read into text lines on the phone; only the lines go to the
 * Worker, whose AI points to where each head is printed; engine/read.ts copies the digits, applies the units and checks
 * the sums against the statement's printed totals. Each figure is shown with its page and line, and nothing enters the
 * forms until the borrower ticks it. "Confirm all" for a year appears only when every check of that year ties, so a
 * figure in a check that fails is ticked on its own.
 */
import { useMemo, useState } from 'preact/hooks';
import { BUTTON, HINT, Section, SelectField } from '../fields';
import { READ, place, type Answer, type Line, type ReadFigure } from '../../../engine/read';
import { HEADS, tidyAmount, type CmaState } from './model';
import { linesOfFile } from './pdf-lines';

type Update = (f: (s: CmaState) => CmaState) => void;
type Stage = { kind: 'idle' } | { kind: 'busy'; what: string } | { kind: 'said'; text: string } | { kind: 'read'; lines: Line[]; answer: Answer; name: string };
const LABEL = Object.fromEntries(HEADS.map((h) => [h.id, h.label]));
const API = `${import.meta.env.PUBLIC_API_URL ?? ''}/api/read`;
const textOf = (f: ReadFigure) => tidyAmount(String(f.value));
const LIST = 'mt-2 space-y-1 text-sm text-ink-muted';

async function ask(lines: Line[]): Promise<Answer | string> {
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lines }) });
    const body = await r.json().catch(() => ({})) as { answer?: Answer; error?: string };
    if (r.ok && body.answer) return body.answer;
    // No reader behind the site yet (the Worker not deployed): the page itself answers 404 or 405.
    return body.error ?? (r.status === 404 || r.status === 405 ? 'Reading statements is not switched on yet: type the figures.' : 'The statement could not be read just now: type the figures, or try again.');
  } catch { return 'The reader could not be reached: type the figures, or try again.'; }
}

export function ReadStatement({ s, update }: { s: CmaState; update: Update }) {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [unit, setUnit] = useState<number>();
  const got = stage.kind === 'read' ? stage : undefined;
  const r = useMemo(() => (got ? place(got.lines, got.answer, s.startYear, unit) : undefined), [got, s.startYear, unit]);

  const choose = async (file?: File) => {
    if (!file) return;
    setUnit(undefined);
    setStage({ kind: 'busy', what: 'Opening the PDF on this device…' });
    const lines = await linesOfFile(file);
    if (typeof lines === 'string') return setStage({ kind: 'said', text: lines });
    setStage({ kind: 'busy', what: `Finding the figures in ${lines.length} lines…` });
    const answer = await ask(lines);
    setStage(typeof answer === 'string' ? { kind: 'said', text: answer } : { kind: 'read', lines, answer, name: file.name });
  };
  const ticked = (f: ReadFigure) => s.figures[f.year][f.head] === textOf(f);
  const tick = (fs: ReadFigure[], on: boolean) => update((x) => {
    const figures = { ...x.figures };
    for (const f of fs) figures[f.year] = { ...figures[f.year], [f.head]: on ? textOf(f) : '' };
    return { ...x, figures };
  });

  return <Section id="read" title="Or read your audited statement">
    <p class={HINT}>A text PDF from your CA. Only its text leaves this device; each figure is shown with its page and line, and counts only once you tick it.</p>
    <label class={`mt-3 inline-block cursor-pointer ${BUTTON}`}>
      Read a statement (PDF)
      <input id="read-file" data-testid="read-file" type="file" accept="application/pdf,.pdf" class="sr-only"
        onChange={(e) => { const i = e.currentTarget as HTMLInputElement; void choose(i.files?.[0]); i.value = ''; }} />
    </label>
    {stage.kind === 'busy' && <p data-testid="read-busy" class={HINT} role="status">{stage.what}</p>}
    {stage.kind === 'said' && <p data-testid="read-said" class="mt-2 text-sm font-medium text-warn" role="alert">{stage.text}</p>}
    {got && r && <div data-testid="read-result" class="mt-3">
      <p class={HINT}>{got.name}: {r.figures.length} figures found{r.unit ? `, in ${r.unit.word}${r.unit.from === 'chosen' ? ' as you said' : ' as the statement says'}` : ''}. None counts until ticked.</p>
      {(!r.unit || r.unit.from === 'chosen') && <div class="mt-2 max-w-xs">
        <SelectField id="read-unit" label="The statement's figures are in" value={unit === undefined ? '' : String(unit)} placeholder="Choose"
          options={READ.unitChoices.map((u) => ({ value: String(u.mult), label: u.word }))} onChange={(v) => setUnit(v ? Number(v) : undefined)} />
      </div>}
      {r.years.map((y) => {
        const fs = r.figures.filter((f) => f.year === y.year), open = fs.filter((f) => !ticked(f));
        const failing = new Set(y.checks.filter((c) => c.state === 'differs').flatMap((c) => c.heads));
        return <div key={y.year} data-testid={`read-year-${y.year}`} class="mt-4">
          <h3 class="font-medium text-ink">{y.fy}: {fs.length} figures, {fs.length - open.length} ticked</h3>
          <ul data-testid={`read-checks-${y.year}`} class={LIST}>{y.checks.map((c) => <li key={c.id} data-state={c.state}>
            {c.state === 'ties' ? '✓ ' : '✗ '}{c.what}
            {c.state === 'differs' && `: off by ₹${tidyAmount(String(Math.abs(c.diff ?? 0)))} (₹${tidyAmount(String(c.sum))} against ₹${tidyAmount(String(c.printed))} printed). Look at these figures before ticking.`}
            {c.state === 'missing' && `: not checked, as ${c.missing.join(', ')} ${c.missing.length > 1 ? 'were' : 'was'} not found.`}
          </li>)}</ul>
          {y.ties && open.length > 0 && <button type="button" data-testid={`read-all-${y.year}`} class={`mt-2 ${BUTTON}`} onClick={() => tick(open, true)}>Confirm all {open.length} for {y.fy}</button>}
          <ul class="mt-2 divide-y divide-line">{fs.map((f) => <li key={f.head} class="py-1.5">
            <label class="flex items-start gap-2 text-sm">
              <input id={`read-${f.year}-${f.head}`} data-testid={`read-${f.year}-${f.head}`} type="checkbox" class="mt-1" checked={ticked(f)}
                onChange={(e) => tick([f], (e.currentTarget as HTMLInputElement).checked)} />
              <span><span class="font-medium text-ink">{LABEL[f.head]}: ₹{textOf(f)}</span>
                {failing.has(f.head) && <span class="ml-1 text-warn">(in a check that does not tie)</span>}
                {f.at.map((a) => <span key={`${a.page}:${a.line}:${a.n}`} class="block text-ink-muted">page {a.page}, line {a.line}: {a.text}</span>)}</span>
            </label>
          </li>)}</ul>
        </div>;
      })}
      {r.notes.length > 0 && <ul data-testid="read-notes" class={`list-disc pl-5 ${LIST}`}>{r.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    </div>}
  </Section>;
}
