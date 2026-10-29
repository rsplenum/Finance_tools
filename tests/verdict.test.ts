/**
 * One verdict pattern across the tools (UXR3, UXR1's S5): every verdict the DSCR, the CMA and the report show starts with
 * the words of `verdictWords`, and none of the old patterns is left in the site's code.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { ALL_ANSWERED, VERDICT_PATTERN, verdictWords, workWords } from '../site/src/verdict';
import { PMEGP_SHED, pmegpConditions } from '../site/src/report/model';
import { STORY_TYPED, STORY_LONGER } from '../site/src/home/story';

describe('the verdict words', () => {
  it('one pattern for a meet, a miss and a wait', () => {
    const said = [
      verdictWords('target', 1, 0), verdictWords('target', 2, 0), verdictWords('target', 1, 1), verdictWords('target', 2, 1),
      verdictWords('benchmark', 8, 0), verdictWords('benchmark', 8, 3), verdictWords('benchmark', 8, 0, 2),
    ];
    expect(said).toEqual(['Meets the target', 'Meets both targets', 'Misses the target', 'Misses 1 of 2 targets',
      'Meets all 8 benchmarks', 'Misses 3 of 8 benchmarks', 'Meets 6 of 8 benchmarks; 2 not read yet']);
    for (const v of said) expect(v).toMatch(VERDICT_PATTERN);
  });
  it('the DSCR verdicts start with it', () => {
    for (const v of [STORY_TYPED.verdict, STORY_LONGER.verdict]) expect(v.split(':')[0]).toMatch(VERDICT_PATTERN);
  });
  it('no old pattern is left in the site', () => {
    const files = (d: string): string[] => readdirSync(d).flatMap((f: string): string[] => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? files(p) : /\.(tsx?|astro)$/.test(f) ? [p] : []; });
    const old = /\} still to answer`|Below the target|Meets the target:|Misses the benchmarks|Meets the benchmarks|Meets your benchmarks|It misses \$\{|It meets every \$\{/;
    expect(files('site/src').filter((f) => old.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
});

// Words for common people (OR3, the owner's O1, O2, O7 and O8): a plain verdict apart from the status, and the scheme's
// conditions only where they apply.
describe('words for common people', () => {
  it('the verdict says whether it works, apart from the status', () => {
    expect([workWords(0), workWords(1), workWords(2), workWords(0, 1)])
      .toEqual(['Works', 'Does not work yet: 1 ratio short', 'Does not work yet: 2 ratios short', 'Works so far: 1 ratio not read yet']);
    // Cash running out is a result, not a question (OR11's O1): it joins the verdict with its first year (D-UX-247).
    expect([workWords(4, 0, '2027-28'), workWords(0, 0, '2027-28'), workWords(0, 1, '2027-28')]).toEqual(['Does not work yet: 4 ratios short and cash runs out in 2027-28',
      'Does not work yet: cash runs out in 2027-28', 'Does not work yet: cash runs out in 2027-28']);
    expect(ALL_ANSWERED).toBe('All questions answered');
  });
  it('PMEGP shows the conditions that apply: no trading one for a maker, the shed under the building', () => {
    const made = pmegpConditions({ activity: 'manufacturing' });
    expect(made).toHaveLength(3);
    expect(made.some((c) => /trading|shed/i.test(c))).toBe(false);
    expect(pmegpConditions({ activity: 'trading' }).some((c) => /^A trading business/.test(c))).toBe(true);
    expect(PMEGP_SHED).toBe("Renting a ready-built shed? Up to 3 years' rent counts in the project cost, not the shed.");
    expect(pmegpConditions({ activity: 'service' }, 'guideline')[0]).toMatch(/^The project buys fixed assets/);
  });
  it('no page calls a loan sanctioned before it is, nor says "Complete" for answered', () => {
    const page = readFileSync('site/src/report/Report.tsx', 'utf8');
    expect(page).not.toMatch(/Term loan sanctioned|limit sought/);
    const files = ['report/model.ts', 'cma/model.ts', 'dscr/model.ts', 'estimate/model.ts', 'estimate/plan-model.ts'].map((f) => readFileSync(`site/src/${f}`, 'utf8'));
    for (const f of files) expect(f).not.toMatch(/: 'Complete'|`Complete, on/);
  });
});
