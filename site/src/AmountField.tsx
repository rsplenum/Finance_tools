/** Loan amount typed the Indian way (70 L, 1.2 Cr, 70,00,000), read back in figures and words as you type. */
import { readBack } from './amount';
import { INPUT, LABEL, useDraft } from './fields';

export function AmountField({ value = '', onCommit = () => {} }: { value?: string; onCommit?: (text: string) => void }) {
  const d = useDraft(value, onCommit);
  const said = readBack(d.value);
  return <div>
    <label for="fld-loanAmount" class={LABEL}>Loan amount</label>
    {/* "Rs." inside the box, no example there (UX9, review finding 6): the read-back below says how to type it. */}
    <div class="relative mt-1"><span id="fld-loanAmount-pre" class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted">Rs.</span>
      <input id="fld-loanAmount" type="text" autocomplete="off" spellcheck={false} enterkeyhint="done" aria-describedby="fld-loanAmount-pre amount-read"
        aria-invalid={said.startsWith('Not understood') || said.startsWith('Enter') || undefined} {...d}
        class={`${INPUT.replace('px-3', 'pl-11 pr-3')} border-line`} /></div>
    <p id="amount-read" data-testid="amount-read" aria-live="polite" class="mt-2 min-h-6 text-sm break-words text-ink-muted">{said || 'Like 70 L, 1.2 Cr or 70,00,000.'}</p>
  </div>;
}
