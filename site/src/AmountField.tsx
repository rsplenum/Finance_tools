/** Loan amount typed the Indian way (70 L, 1.2 Cr, 70,00,000), read back in figures and words as you type. */
import { readBack } from './amount';
import { INPUT, LABEL, useDraft } from './fields';

export function AmountField({ value = '', onCommit = () => {} }: { value?: string; onCommit?: (text: string) => void }) {
  const d = useDraft(value, onCommit);
  const said = readBack(d.value);
  return <div>
    <label for="fld-loanAmount" class={LABEL}>Loan amount</label>
    <input id="fld-loanAmount" type="text" autocomplete="off" spellcheck={false} enterkeyhint="done" placeholder="70 L, 1.2 Cr or 70,00,000"
      aria-invalid={said.startsWith('Not understood') || said.startsWith('Enter') || undefined} {...d}
      class={`mt-1 ${INPUT} border-slate-300 dark:border-slate-600`} />
    <p data-testid="amount-read" aria-live="polite" class="mt-2 min-h-6 text-sm break-words text-slate-700 dark:text-slate-300">{said}</p>
  </div>;
}
