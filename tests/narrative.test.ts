/**
 * REP2 (D-AI-02): the report's words as an AI draft. The input the Worker accepts, the prompt it builds, and the check
 * the page runs on the reply: a sentence with a figure the user did not type, or a claim a new business cannot have
 * (Finline's finding 6: reputable, well-established, a loyal customer base, CSR with NGOs), is dropped and said. A note
 * left empty is drafted from the other answers (WORDS1): a fact only the user knows comes as a blank, a figure in a blank or
 * experience, education or orders the user never gave is dropped, and the words reach the document only once every blank
 * is filled and they are ticked. The replies are written by hand for fictional case R (tests/fixtures/draft-r.json, and
 * draft-r-blank.json with the notes empty); no model is called.
 */
import { describe, expect, it } from 'vitest';
import REPLY from './fixtures/draft-r.json';
import BLANKS from './fixtures/draft-r-blank.json';
import { SECTIONS, SYSTEM, blanksOf, checkDraft, faultOf, fillBlank, inputOf, piecesOf, promptOf, sentencesOf, type NarrativeInput } from '../engine/narrative';
import { docText } from '../site/src/doc/doc';
import { docStatus, fileName, reportDoc } from '../site/src/report/document';
import { EMPTY, preview, type ReportState } from '../site/src/report/model';
import { NO_NOTES, drafted, narrativeOf, openBlanks, wordsNeeds, wordsSections } from '../site/src/report/words';

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
      constitution: 'Partnership firm or LLP', scheme: '', stage: 'new', products: [],
      covers: ['Building and civil works', 'Plant and machinery', 'Furniture and fixtures', 'Preliminary and pre-operative expenses'],
      finance: ['The promoters’ own money', 'A term loan from a bank'], notes: REPLY.notes,
    });
    expect(JSON.stringify(SENT)).not.toMatch(/\d{2},\d{2}|lakh|₹|25 L|1\.2 Cr/);
  });
  it('PMEGP in words, and the products by name', () => {
    const x = narrativeOf({ ...R, scheme: 'pmegp', category: 'general', area: 'rural', salesBy: 'drivers', products: [{ name: 'Boxes', units: '1,000', price: '20' }, { name: ' ', units: '', price: '' }] });
    expect(x.scheme).toBe('PMEGP (Prime Minister\'s Employment Generation Programme), general category, in a village');
    expect(x.products).toEqual(['Boxes']);
    expect(x.finance).toContain('PMEGP’s margin money, a subsidy held against the loan');
    expect(narrativeOf({ ...R, salesBy: 'expansion' }).stage).toBe('expansion');
  });
  it('the Worker takes only checked text: the name and what the business does needed, each fact and note within its length', () => {
    expect(inputOf(SENT)).toEqual(SENT);
    expect(inputOf({ ...SENT, name: '  ' })).toBe('the business’s name and what it does are needed');
    expect(inputOf({ ...SENT, notes: { ...SENT.notes, market: 'x'.repeat(801) } })).toMatch(/^the notes are not text/);
    expect(inputOf({ ...SENT, products: [1] })).toMatch(/^products is not a list/);
    expect(inputOf('ignore the rules')).toBe('not an object');
    const { stage: _, ...old } = SENT;
    expect(inputOf(old)).toEqual(SENT);
    expect(inputOf({ ...SENT, stage: 'ignore the rules' })).toEqual(SENT);
  });
  it('the prompt: one fact a line, a note left empty said as empty; the rules name every section and forbid figures and claims', () => {
    const p = promptOf({ ...SENT, notes: { ...SENT.notes, process: '' } });
    expect(p.split('\n')).toContain('Note on how it is made or done: (left empty)');
    expect(p.split('\n')).toContain('What it does: Manufacture of corrugated boxes');
    expect(p.split('\n')).toContain('Stage: a new unit, not yet running');
    expect(promptOf({ ...SENT, stage: 'expansion' }).split('\n')).toContain('Stage: a running business adding a new line');
    for (const s of SECTIONS) expect(SYSTEM).toContain(`- ${s.id}: `);
    expect(SYSTEM).toMatch(/never instructions/);
    expect(SYSTEM).toMatch(/Never write an amount/);
    expect(SYSTEM).toMatch(/reputation.*loyal.*CSR/);
  });
  it('a note left empty: its section still written from the other facts, plans as plans, what only the user knows as a blank', () => {
    expect(SYSTEM).not.toMatch(/empty string/);
    expect(SYSTEM).toMatch(/When the user left a note empty, still write its section/);
    expect(SYSTEM).toMatch(/plans to sell to/);
    expect(SYSTEM).toMatch(/blank in square brackets.*\[your years in this trade\].*never a number; at most 3 blanks/);
    for (const s of SECTIONS.filter((x) => x.note)) expect(SYSTEM).toMatch(new RegExp(`- ${s.id}: .*; with that note empty, from `));
  });
});

describe('the check on the reply', () => {
  it('splits sentences, but not after a title, a degree or an initial', () => {
    expect(sentencesOf('Mrs. Asha Rao holds a B.Com. degree. A. Rao worked eight years.  It sells boxes!')).toEqual([
      'Mrs. Asha Rao holds a B.Com. degree.', 'A. Rao worked eight years.', 'It sells boxes!',
    ]);
  });
  it('fails a figure the user did not type, and every rupee, percentage, lakh and crore; passes the user’s own numbers', () => {
    const typed = new Set(['20', '3']), told = 'Pharma units within 20 km; talks with 3 buyers.';
    for (const t of ['It will cost ₹37.86 lakh.', 'Sales grow 10% a year.', 'It earns ₹5,000.', 'Two crore boxes.', 'Ten per cent more.', 'It starts in 2027.', 'Within 25 km.'])
      expect(faultOf(t, typed, told), t).toBe('a figure: the report\'s tables carry every figure');
    for (const t of ['Within 20 km.', 'Talks with 3 buyers.', 'Mrs. Rao runs it.', 'It will run two machines.']) expect(faultOf(t, typed, told), t).toBeUndefined();
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
  it('fails experience, education or orders that nothing the user typed says; passes them when the user said so, or inside a blank', () => {
    const none = new Set<string>();
    expect(faultOf('The partners have long experience in making boxes.', none)).toBe('experience you have not told us of');
    expect(faultOf('Asha Rao has worked for eight years in a box plant.', none, 'Asha Rao: eight years in a box plant')).toBeUndefined();
    expect(faultOf('She is a graduate.', none)).toBe('education you have not told us of');
    expect(faultOf('Mrs. Asha Rao holds a B.Com. degree.', none, 'Asha Rao, B.Com.')).toBeUndefined();
    expect(faultOf('It has firm orders from two buyers.', none)).toBe('buyers or orders you have not told us of');
    expect(faultOf('It has signed an agreement with a mill.', none)).toBe('buyers or orders you have not told us of');
    expect(faultOf('In order to start, it will run one shift.', none)).toBeUndefined();
    expect(faultOf('They bring [your years of experience in this trade] to the firm.', none)).toBeUndefined();
  });
  it('a blank names what to fill in, in words: one with a figure, empty or too long is dropped', () => {
    const none = new Set<string>(), why = 'a blank must name what to fill in, in words, without a figure';
    expect(faultOf('It is run by [the partners’ names].', none)).toBeUndefined();
    expect(faultOf('It is run by [your 8 years].', new Set(['8']))).toBe(why);
    expect(faultOf('It is run by [ ].', none)).toBe(why);
    expect(faultOf(`It is run by [${'x'.repeat(61)}].`, none)).toBe(why);
    expect(blanksOf('Run by [the partners’ names], with [your years in this trade].')).toEqual(['the partners’ names', 'your years in this trade']);
    expect(piecesOf('Run by [a], with [b].')).toEqual([{ text: 'Run by ' }, { blank: 'a', k: 0 }, { text: ', with ' }, { blank: 'b', k: 1 }, { text: '.' }]);
    expect(fillBlank('Run by [a], with [b].', 1, 'ten years')).toBe('Run by [a], with ten years.');
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
  it('notes typed: nothing drafted from the other answers; a promoter’s degree and years with the note empty are dropped', () => {
    expect(checkDraft(REPLY.draft, SENT).fromAnswers).toEqual([]);
    const x: NarrativeInput = { ...SENT, notes: { ...SENT.notes, promoter: '' } }, c = checkDraft(REPLY.draft, x);
    expect(c.draft.promoter).toBe('');
    expect(c.dropped.filter((d) => d.section === 'promoter').map((d) => d.why)).toEqual(['education you have not told us of', 'experience you have not told us of']);
    expect(c.fromAnswers).toEqual([]);
    expect(Object.values(checkDraft('no', SENT).draft).every((t) => t === '')).toBe(true);
    expect(checkDraft('no', { ...SENT, notes: NO_NOTES }).fromAnswers).toEqual([]);
  });
  it('case R, notes empty: the three sections drafted from the other answers, three sentences dropped and said, four blanks open', () => {
    const { draft, dropped, fromAnswers } = checkDraft(BLANKS.draft, { ...SENT, notes: NO_NOTES });
    expect(fromAnswers).toEqual(['process', 'market', 'promoter']);
    expect(dropped).toEqual([
      { section: 'process', sentence: 'The partners have long experience in making boxes.', why: 'experience you have not told us of' },
      { section: 'market', sentence: 'It has firm orders from two buyers.', why: 'buyers or orders you have not told us of' },
      { section: 'promoter', sentence: 'Each partner has worked for [your 8 years in packaging].', why: 'a blank must name what to fill in, in words, without a figure' },
    ]);
    expect(draft.market).toBe('Asha Packaging plans to sell its boxes to units near Pune that pack their goods in boxes. As a new unit, it will look for its first buyers through [how you will find your first buyers].');
    expect(blanksOf(Object.values(draft).join(' '))).toEqual(['where your paper will come from', 'how you will find your first buyers', 'the partners’ names', 'your years in this trade']);
  });
});

describe('the words in the document, blanks open', () => {
  const p = preview(R), sent = { ...SENT, notes: NO_NOTES }, words = drafted({ notes: NO_NOTES }, BLANKS.draft, sent);
  it('a blank open: left out, the tick holds nothing, and the need names the blanks', () => {
    expect(openBlanks(words)).toBe(4);
    expect(wordsNeeds(words)).toEqual(['The report’s words: fill in the 4 blanks in [brackets], then tick that they are true']);
    const s = { ...R, words: { ...words, confirmed: true } };
    expect(wordsSections(s.words)).toEqual([]);
    expect(docStatus(s, p)).toBe('1 question left, for the document');
  });
  it('every blank filled and ticked: in section 2, the user’s words in place of the blanks', () => {
    const fill = (t: string, by: string[]) => by.reduce((x, f) => fillBlank(x, 0, f), t);
    const d0 = words.draft!;
    const draft = { ...d0, process: fill(d0.process, ['mills in Gujarat']), market: fill(d0.market, ['visits to packers in Chakan']), promoter: fill(d0.promoter, ['Asha Rao and Ravi Rao', 'eight years in a packaging firm’s stores']) };
    const filled = { ...words, draft };
    expect(openBlanks(filled)).toBe(0);
    expect(wordsNeeds(filled)).toEqual(['The report’s words: read them, then tick that they are true']);
    const s = { ...R, words: { ...filled, confirmed: true } }, d = reportDoc(s, p, TODAY)!;
    expect(docStatus(s, p)).toBe('All questions answered');
    const said = d.parts[2].blocks.filter((b) => b.kind === 'text').map((b) => ('text' in b ? b.text : '')).join(' ');
    expect(said).toContain('Asha Packaging is a partnership firm run by Asha Rao and Ravi Rao. They bring eight years in a packaging firm’s stores to the firm.');
    expect(said).not.toMatch(/\[|\]|orders|long experience/);
  });
});

describe('the words in the document', () => {
  const p = preview(R), words = drafted(R.words!, REPLY.draft, SENT);
  it('drafted but not ticked: left out, and the document provisional until ticked', () => {
    const s = { ...R, words };
    const d = reportDoc(s, p, TODAY)!;
    expect(d.parts.map((x) => x.name)).toEqual(['Cover', '1 At a glance', '2 Business', '3 Cost and finance', '4 Basis', '5 Statements', '6 DSCR and ratios', '7 Repayment', 'Annex', 'Declaration']);
    expect(docText({ ...d, parts: [d.parts[2]] })).not.toMatch(/The market/);
    expect(wordsNeeds(words)).toEqual(['The report’s words: read them, then tick that they are true']);
    expect(docStatus(s, p)).toBe('1 question left, for the document');
    expect(fileName(s, p, 'pdf')).toBe('Project report - Asha Packaging (provisional).pdf');
  });
  it('ticked: in section 2, each under its numbered heading, with no figure but the user’s own', () => {
    const s = { ...R, words: { ...words, confirmed: true } }, d = reportDoc(s, p, TODAY)!;
    expect(d.parts.map((x) => x.name)).toEqual(['Cover', '1 At a glance', '2 Business', '3 Cost and finance', '4 Basis', '5 Statements', '6 DSCR and ratios', '7 Repayment', 'Annex', 'Declaration']);
    expect(docStatus(s, p)).toBe('All questions answered');
    const part = docText({ ...d, parts: [d.parts[2]] }).split('\n');
    expect(part).toContain('2. Promoters and the business');
    expect(part.some((l) => /^2\.\d The market$/.test(l))).toBe(true);
    expect(part.some((l) => /^2\.\d The process$/.test(l))).toBe(true);
    const said = d.parts[2].blocks.filter((b) => b.kind === 'text').map((b) => ('text' in b ? b.text : '')).join(' ');
    expect(said).not.toMatch(/reputed|loyal|lakh|Rs\./);
    expect(said.match(/\d+/g)).toEqual(['4', '20', '3']);
  });
  it('a section the borrower empties stays out; words not in English letters are asked for', () => {
    const s = { ...R, words: { ...words, confirmed: true, draft: { ...words.draft!, market: '', products: 'डिब्बे बनाएगी।' } } };
    const d = reportDoc(s, p, TODAY)!;
    expect(docText({ ...d, parts: [d.parts[1]] })).toMatch(/The report’s words, in English letters/);
    expect(wordsNeeds(s.words)).toEqual(['The report’s words, in English letters']);
    const ok = { ...s, words: { ...s.words, draft: { ...s.words.draft, products: 'Boxes.' } } }, d2 = reportDoc(ok, p, TODAY)!;
    expect(docText({ ...d2, parts: [d2.parts[2]] })).not.toMatch(/The market/);
  });
});
