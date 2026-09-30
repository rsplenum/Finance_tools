/** Loan amount typed the Indian way (70 L, 1.2 Cr, 70,00,000), read back in figures and words as you type. */
import { useState } from 'preact/hooks';
import { readBack } from './amount';

export function AmountField() {
  const [text, setText] = useState('');
  return <div>
    <label for="fld-loanAmount" class="block font-medium text-slate-900 dark:text-slate-100">Loan amount</label>
    <input id="fld-loanAmount" type="text" autocomplete="off" spellcheck={false} enterkeyhint="done" placeholder="70 L, 1.2 Cr or 70,00,000"
      value={text} onInput={(e) => setText(e.currentTarget.value)}
      class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" />
    <p data-testid="amount-read" aria-live="polite" class="mt-2 min-h-6 text-sm break-words text-slate-700 dark:text-slate-300">{readBack(text)}</p>
  </div>;
}
