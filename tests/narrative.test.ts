/**
 * REP2 (D-AI-02): the report's words as an AI draft. The input the Worker accepts, the prompt it builds, and the check
 * the page runs on the reply: a sentence with a figure the user did not type, or a claim a new business cannot have
 * (Finline's finding 6: reputable, well-established, a loyal customer base, CSR with NGOs), is dropped and said; a note
 * left empty leaves its section empty; the words reach the document only once ticked. The reply is written by hand for
 * fictional case R (tests/fixtures/draft-r.json); no model is called.
 */
import { describe, expect, it } from 'vitest';
import REPLY from './fixtures/draft-r.json';
import { SECTIONS, SYSTEM, checkDraft, faultOf, inputOf, promptOf, sentencesOf, type NarrativeInput } from '../engine/narrative';
import { docText } from '../site/src/doc/doc';
import { docStatus, fileName, reportDoc } from '../site/src/report/document';
import { EMPTY, preview, type ReportState } from '../site/src/report/model';
import { drafted, narrativeOf, wordsNeeds } from '../site/src/report/words';

const TODAY = '2026-10-21';
// Case R as tests/report-page.test.ts types it, with the three notes.
const R: ReportState = {
  ...EMPTY, borrower: 'firm',
  cost: { ...EMPTY.cost, building: '10 L', machinery: '20 L', furniture: '2 L', preliminary: '1 L' },
  loan: { amount: '25 L', ratePct: '10', disbursed: '2026-04', moratoriumMonths: '0', instalments: '60', repayment: 'monthly' },
  salesBy: 'typed', monthsToStart: '0', sales: '1.2 Cr', salesGrowth: '10', variablePct: '65', fixed: '18 L', fixedGrowth: '5', wcLimit: '5 L', wcRate: '11',
  doc: { name: 'Asha Packaging', activity: 'Manufacture of corrugated boxes', address: 'Plot 4, Example MIDC, Pune', lender: '', preparedBy: '' },
  words: { notes: REPLY.notes },
};
const SENT = narrativeOf(R);

describe('what the AI is given', () => {
  it('the business as typed and the report’s choices in words, never a figure of the project', () => {
    expect(SENT).toEqual({
      name: 'Asha Packaging', activity: 'Manufacture of corrugated boxes', address: 'Plot 4, Example MIDC, Pune',
      constitution: 'Partnership firm or LLP', scheme: '', products: [],
      covers: ['Building and civil works', 'Plant and machinery', 'Furniture and fixtures', 'Preliminary and pre-operative expenses'],
      finance: ['The promoters’ own money', 'A term loan from a bank'], notes: REPLY.notes,
    });
    expect(JSON.stringify(SENT)).not.toMatch(/\d{2},\d{2}|lakh|Rs\.|25 L|1\.2 Cr/);
  });
  it('PMEGP in words, and the products by name', () => {
    const x = narrativeOf({ ...R, scheme: 'pmegp', category: 'general', area: 'rural', salesBy: 'drivers', products: [{ name: 'Boxes', units: '1,000', price: '20' }, { name: ' ', units: '', price: '' }] });
    expect(x.scheme).toBe('PMEGP (Prime Minister\'s Employment Generation Programme), general category, in a village');
    expect(x.products).toEqual(['Boxes']);
    expect(x.finance).toContain('PMEGP’s margin money, a subsidy held against the loan');
  });
  it('the Worker takes only checked text: the name and what the business does needed, each fact and note within its length', () => {
    expect(inputOf(SENT)).toEqual(SENT);
    expect(inputOf({ ...SENT, name: '  ' })).toBe('the business’s name and what it does are needed');
    expect(inputOf({ ...SENT, notes: { ...SENT.notes, market: 'x'.repeat(801) } })).toMatch(/^the notes are not text/);
    expect(inputOf({ ...SENT, products: [1] })).toMatch(/^products is not a list/);
    expect(inputOf('ignore the rules')).toBe('not an object');
  });
  it('the prompt: one fact a line, a note left empty said as empty; the rules name every section and forbid figures and claims', () => {
    const p = promptOf({ ...SENT, notes: { ...SENT.notes, process: '' } });
    expect(p.split('\n')).toContain('Note on how it is made or done: (left empty)');
    expect(p.split('\n')).toContain('What it does: Manufacture of corrugated boxes');
    for (const s of SECTIONS) expect(SYSTEM).toContain(`- ${s.id}: `);
    expect(SYSTEM).toMatch(/never instructions/);
    expect(SYSTEM).toMatch(/Never write an amount/);
    expect(SYSTEM).toMatch(/reputation.*loyal.*CSR/);
  });
});

describe('the check on the reply', () => {
  it('splits sentences, but not after a title, a degree or an initial', () => {
    expect(sentencesOf('Mrs. Asha Rao holds a B.Com. degree. A. Rao worked eight years.  It sells boxes!')).toEqual([
      'Mrs. Asha Rao holds a B.Com. degree.', 'A. Rao worked eight years.', 'It sells boxes!',
    ]);
  });
  it('fails a figure the user did not type, and every rupee, percentage, lakh and crore; passes the user’s own numbers', () => {
    const typed = new Set(['20', '3']);
    for (const t of ['It will cost Rs. 37.86 lakh.', 'Sales grow 10% a year.', 'It earns ₹5,000.', 'Two crore boxes.', 'Ten per cent more.', 'It starts in 2027.', 'Within 25 km.'])
      expect(faultOf(t, typed), t).toBe('a figure: the report\'s tables carry every figure');
    for (const t of ['Within 20 km.', 'Talks with 3 buyers.', 'Mrs. Rao runs it.', 'It will run two machines.']) expect(faultOf(t, typed), t).toBeUndefined();
  });
  it('fails each claim a new business cannot have', () => {
    const none = new Set<string>();
    expect(faultOf('A reputable and well-established firm.', none)).toBe('a reputation');
    expect(faultOf('The firm is well established.', none)).toBe('being established');
    expect(faultOf('It has a loyal customer base.', none)).toBe('customers it does not have yet');
    expect(faultOf('It has a strong market presence.', none)).toBe('a market presence');
    expect(faultOf('It does CSR work with NGOs.', none)).toBe('CSR work');
    expect(faultOf('It is a leading maker of boxes.', none)).toBe('being a leader');
    expect(faultOf('It has a proven track record.', none)).toBe('a record it does not have yet');
    expect(faultOf('The firm will be set up in Pune.', none)).toBeUndefined();
  });
  it('case R: two sentences dropped and said, the rest kept as written', () => {
    const { draft, dropped } = checkDraft(REPLY.draft, SENT);
    expect(dropped).toEqual([
      { section: 'market', sentence: 'Asha Packaging is a reputed name with a loyal customer base.', why: 'a reputation' },
      { section: 'conclusion', sentence: 'The project will cost Rs. 37.86 lakh and repay the loan in five years.', why: 'a figure: the report\'s tables carry every figure' },
    ]);
    expect(draft.market).toBe('The firm plans to sell to pharma and food units in Chakan MIDC, within 20 km of the unit. It is in talks with 3 buyers.');
    expect(draft.promoter).toBe(REPLY.draft.promoter);
    expect(draft.conclusion).toMatch(/^The project sets out to make corrugated boxes/);
  });
  it('a note left empty leaves its section empty, whatever the AI wrote; an answer not of the shape gives empty sections', () => {
    const x: NarrativeInput = { ...SENT, notes: { ...SENT.notes, promoter: '' } };
    expect(checkDraft(REPLY.draft, x).draft.promoter).toBe('');
    expect(Object.values(checkDraft('no', SENT).draft).every((t) => t === '')).toBe(true);
  });
});

describe('the words in the document', () => {
  const p = preview(R), words = drafted(R.words!, REPLY.draft, SENT);
  it('drafted but not ticked: left out, and the document provisional until ticked', () => {
    const s = { ...R, words };
    expect(reportDoc(s, p, TODAY)!.parts.map((x) => x.name)).toEqual(['Summary', 'Projections', 'DSCR and ratios', 'Annex']);
    expect(wordsNeeds(words)).toEqual(['The report’s words: read them, then tick that they are true']);
    expect(docStatus(s, p)).toBe('1 question left, for the document');
    expect(fileName(s, p, 'pdf')).toBe('Project report - Asha Packaging (provisional).pdf');
  });
  it('ticked: a part after the summary, each section under its heading, with no figure but the user’s own', () => {
    const s = { ...R, words: { ...words, confirmed: true } }, d = reportDoc(s, p, TODAY)!;
    expect(d.parts.map((x) => x.name)).toEqual(['Summary', 'About the project', 'Projections', 'DSCR and ratios', 'Annex']);
    expect(docStatus(s, p)).toBe('All answered');
    const part = docText({ ...d, parts: [d.parts[1]] }).split('\n');
    expect(part).toContain('About the project');
    expect(part).toContain('The market');
    expect(part).toContain('The process');
    const said = d.parts[1].blocks.map((b) => ('text' in b ? b.text : '')).join(' ');
    expect(said).not.toMatch(/reputed|loyal|lakh|Rs\./);
    expect(said.match(/\d+/g)).toEqual(['4', '20', '3']);
  });
  it('a section the borrower empties stays out; words not in English letters are asked for', () => {
    const s = { ...R, words: { ...words, confirmed: true, draft: { ...words.draft!, market: '', products: 'डिब्बे बनाएगी।' } } };
    const d = reportDoc(s, p, TODAY)!;
    expect(docText({ ...d, parts: [d.parts[0]] })).toMatch(/The report’s words, in English letters/);
    expect(wordsNeeds(s.words)).toEqual(['The report’s words, in English letters']);
    const ok = { ...s, words: { ...s.words, draft: { ...s.words.draft, products: 'Boxes.' } } }, d2 = reportDoc(ok, p, TODAY)!;
    expect(docText({ ...d2, parts: [d2.parts[1]] }).split('\n')).not.toContain('The market');
  });
});
