/**
 * Works a downloaded workbook's formulas again, from the file alone: reads its sheets, shared strings and cells (formula
 * and the value cached beside it), then evaluates each formula from the inputs up, so a test can check that every
 * cached figure is what its formula gives and that every difference on Checks is 0 (WORKED-PAGE §5, PAPER1). It knows
 * only the functions the DSCR model uses; any other throws, so a new one cannot pass unchecked. Written for the tests,
 * independently of site/src/doc/xlsx.ts: it parses the XML the file holds, not the writer's formula grammar.
 */
import { zipPart } from '../scripts/read-doc.mjs';

export type Value = number | string | boolean;
type Cell = { formula?: string; cached?: Value };
type Range = { sheet: string; c1: number; r1: number; c2: number; r2: number };
type Arg = Value | Range;

const unxml = (t: string) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const colOf = (letters: string) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const letters = (c: number): string => (c > 26 ? letters(Math.floor((c - 1) / 26)) : '') + String.fromCharCode(65 + ((c - 1) % 26));
const EPOCH = Date.UTC(1899, 11, 30);

export class Book {
  readonly sheets: string[] = [];
  private cells = new Map<string, Map<string, Cell>>();
  private memo = new Map<string, Value>();
  private busy = new Set<string>();

  static async read(bytes: Uint8Array): Promise<Book> {
    const b = new Book(), book = (await zipPart(bytes, 'xl/workbook.xml')) ?? '';
    const strings = [...((await zipPart(bytes, 'xl/sharedStrings.xml')) ?? '').matchAll(/<si>(.*?)<\/si>/gs)]
      .map((m) => unxml([...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((t) => t[1]).join('')));
    const names = [...book.matchAll(/<sheet [^>]*name="([^"]*)"/g)].map((m) => unxml(m[1]));
    for (const [i, name] of names.entries()) {
      const x = (await zipPart(bytes, `xl/worksheets/sheet${i + 1}.xml`)) ?? '', cells = new Map<string, Cell>();
      for (const m of x.matchAll(/<c ([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
        const ref = /r="([A-Z]+\d+)"/.exec(m[1])![1], t = /t="(\w+)"/.exec(m[1])?.[1], inner = m[2] ?? '';
        const f = /<f>(.*?)<\/f>/s.exec(inner)?.[1], v = /<v>(.*?)<\/v>/s.exec(inner)?.[1];
        const cached: Value | undefined = v === undefined ? undefined : t === 's' ? strings[Number(v)] : t === 'str' ? unxml(v) : t === 'b' ? v === '1' : Number(v);
        cells.set(ref, { ...(f !== undefined ? { formula: unxml(f) } : {}), ...(cached !== undefined ? { cached } : {}) });
      }
      b.sheets.push(name);
      b.cells.set(name, cells);
    }
    return b;
  }

  /** Every cell of a sheet that holds a formula, as [ref, formula, cached value]. */
  formulas(sheet: string): [string, string, Value | undefined][] {
    return [...(this.cells.get(sheet) ?? new Map<string, Cell>()).entries()].filter(([, c]) => c.formula !== undefined)
      .map(([ref, c]) => [ref, c.formula!, c.cached]);
  }

  /** The cached value of a cell (what the file shows before any program works it again). */
  cached(sheet: string, ref: string): Value | undefined {
    return this.cells.get(sheet)?.get(ref)?.cached;
  }

  /**
   * The worked values to the right of a label (the first cell that reads exactly `label`, in the table under `after`
   * when given), up to the first empty cell: a line's figure for each year, or an answer's figure.
   */
  line(sheet: string, label: string, after?: string): Value[] {
    const at = (text: string, from = 0) => [...(this.cells.get(sheet) ?? [])].map(([ref, c]) => ({ m: /^([A-Z]+)(\d+)$/.exec(ref)!, c }))
      .filter(({ m, c }) => c.cached === text && Number(m[2]) > from).sort((a, b) => Number(a.m[2]) - Number(b.m[2]))[0]?.m;
    const m = at(label, after === undefined ? 0 : Number(at(after)?.[2] ?? Infinity));
    if (!m) throw new Error(`No line "${label}" on ${sheet}`);
    const out: Value[] = [];
    for (let c = colOf(m[1]) + 1; this.cells.get(sheet)!.has(`${letters(c)}${m[2]}`); c++) out.push(this.value(sheet, `${letters(c)}${m[2]}`));
    return out;
  }

  /** The worked values to the right of every cell whose text starts with `prefix`, one list for each such row. */
  lines(sheet: string, prefix: string): Value[][] {
    const out: Value[][] = [], cells = this.cells.get(sheet) ?? new Map<string, Cell>();
    for (const [ref, c] of cells) {
      if (typeof c.cached !== 'string' || !c.cached.startsWith(prefix)) continue;
      const m = /^([A-Z]+)(\d+)$/.exec(ref)!, row: Value[] = [];
      for (let k = colOf(m[1]) + 1; cells.has(`${letters(k)}${m[2]}`); k++) row.push(this.value(sheet, `${letters(k)}${m[2]}`));
      out.push(row);
    }
    return out;
  }

  /** Types a figure over a cell, as a reader of the workbook would; every value is then worked again. */
  set(sheet: string, ref: string, v: Value) {
    this.cells.get(sheet)!.set(ref, { cached: v });
    this.memo.clear();
  }

  /** The cell holding a labelled input's figure: the next cell to the right of the label. */
  inputAt(sheet: string, label: string): string {
    const hit = [...(this.cells.get(sheet) ?? [])].find(([, c]) => c.cached === label);
    if (!hit) throw new Error(`No input "${label}" on ${sheet}`);
    const m = /^([A-Z]+)(\d+)$/.exec(hit[0])!;
    return `${letters(colOf(m[1]) + 1)}${m[2]}`;
  }

  /** A cell's value, worked from its formula (and the formulas it reads) rather than taken from the file. */
  value(sheet: string, ref: string): Value {
    const key = `${sheet}!${ref}`;
    if (this.memo.has(key)) return this.memo.get(key)!;
    if (!this.cells.has(sheet)) throw new Error(`No sheet ${sheet}`);
    const c = this.cells.get(sheet)!.get(ref);
    if (!c) return '';
    if (c.formula === undefined) return c.cached ?? '';
    if (this.busy.has(key)) throw new Error(`Circular reference at ${key}`);
    this.busy.add(key);
    let v: Value;
    try { v = new Parser(c.formula, sheet, this).run(); } catch (e) { throw new Error(`${key} = ${c.formula}: ${(e as Error).message}`); }
    this.busy.delete(key);
    this.memo.set(key, v);
    return v;
  }

  range(r: Range): Value[][] {
    const out: Value[][] = [];
    for (let row = r.r1; row <= r.r2; row++) {
      const line: Value[] = [];
      for (let col = r.c1; col <= r.c2; col++) line.push(this.value(r.sheet, `${letters(col)}${row}`));
      out.push(line);
    }
    return out;
  }
}

// ---- Formulas: a tokenizer and a precedence-climbing parser that evaluates as it goes ----

type Token = { k: 'num'; v: number } | { k: 'str'; v: string } | { k: 'ref'; v: string } | { k: 'fn'; v: string } | { k: 'op'; v: string } | { k: 'bool'; v: boolean };

const REF = String.raw`(?:(?:'(?:[^']|'')+'|[A-Za-z_][\w.]*)!)?\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?`;
const TOKEN = new RegExp(String.raw`\s*(?:(\d+(?:\.\d+)?(?:E[+-]?\d+)?)|"((?:[^"]|"")*)"|(${REF})(?![\w(])|([A-Z][A-Z0-9.]*)\(|(TRUE|FALSE)\b|(<>|<=|>=|[-+*/^&=<>(),%]))`, 'y');

function tokens(f: string): Token[] {
  const out: Token[] = [];
  TOKEN.lastIndex = 0;
  let at = 0;
  while (at < f.length) {
    if (!f.slice(at).trim()) break;
    TOKEN.lastIndex = at;
    const m = TOKEN.exec(f);
    if (!m) throw new Error(`Cannot read the formula at "${f.slice(at)}"`);
    at = TOKEN.lastIndex;
    if (m[1] !== undefined) out.push({ k: 'num', v: Number(m[1]) });
    else if (m[2] !== undefined) out.push({ k: 'str', v: m[2].replace(/""/g, '"') });
    else if (m[3] !== undefined) out.push({ k: 'ref', v: m[3] });
    else if (m[4] !== undefined) out.push({ k: 'fn', v: m[4] });
    else if (m[5] !== undefined) out.push({ k: 'bool', v: m[5] === 'TRUE' });
    else out.push({ k: 'op', v: m[6] });
  }
  return out;
}

const num = (v: Arg): number => {
  if (typeof v === 'object') throw new Error('A range where one value is wanted');
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === '') return 0; // an empty cell
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`#VALUE! from "${v}"`);
  return n;
};
const flat = (b: Book, args: Arg[]): Value[] => args.flatMap((a) => (typeof a === 'object' ? b.range(a).flat().filter((x) => x !== '' && typeof x !== 'boolean') : [a]));
const numbers = (b: Book, args: Arg[]) => flat(b, args).filter((x): x is number => typeof x === "number");
const compare = (a: Value, b: Value): number => {
  const t = (x: Value) => (typeof x === 'number' ? 0 : typeof x === 'string' ? 1 : 2);
  if (a === '' && typeof b === 'number') a = 0;
  if (b === '' && typeof a === 'number') b = 0;
  if (t(a) !== t(b)) return t(a) - t(b);
  if (typeof a === 'string') return a.toLowerCase() < (b as string).toLowerCase() ? -1 : a.toLowerCase() > (b as string).toLowerCase() ? 1 : 0;
  return (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0;
};
/** SUMIF's criterion: a value to equal, or text that starts with a comparison. */
const meets = (x: Value, crit: Value): boolean => {
  if (typeof crit === 'string') {
    const m = /^(<>|<=|>=|<|>|=)(.*)$/.exec(crit);
    if (m) {
      const rhs: Value = m[2] !== '' && !Number.isNaN(Number(m[2])) ? Number(m[2]) : m[2], c = compare(x, rhs);
      return { '<>': c !== 0, '<=': c <= 0, '>=': c >= 0, '<': c < 0, '>': c > 0, '=': c === 0 }[m[1]]!;
    }
  }
  return typeof x === typeof crit && compare(x, crit) === 0;
};

class Parser {
  private t: Token[];
  private i = 0;
  constructor(f: string, private sheet: string, private b: Book) { this.t = tokens(f); }

  run(): Value {
    const v = this.scalar(this.expr(0));
    if (this.i !== this.t.length) throw new Error('Formula not read to its end');
    return v;
  }

  private peek() { return this.t[this.i]; }
  private op(v: string) { const p = this.peek(); if (p?.k === 'op' && p.v === v) { this.i++; return true; } return false; }
  private scalar(a: Arg): Value {
    if (typeof a !== 'object') return a;
    if (a.c1 === a.c2 && a.r1 === a.r2) return this.b.value(a.sheet, `${letters(a.c1)}${a.r1}`);
    throw new Error('A range where one value is wanted');
  }

  private static LEVEL: Record<string, number> = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 };

  private expr(min: number): Arg {
    let left = this.unary();
    for (;;) {
      const p = this.peek();
      if (p?.k !== 'op' || !(p.v in Parser.LEVEL) || Parser.LEVEL[p.v] < min) return left;
      this.i++;
      const lv = Parser.LEVEL[p.v], right = this.scalar(this.expr(lv + 1)), l = this.scalar(left);
      left = this.binary(p.v, l, right);
    }
  }

  private binary(o: string, a: Value, b: Value): Value {
    switch (o) {
      case '+': return num(a) + num(b);
      case '-': return num(a) - num(b);
      case '*': return num(a) * num(b);
      case '/': { if (num(b) === 0) throw new Error('#DIV/0!'); return num(a) / num(b); }
      case '^': return num(a) ** num(b);
      case '&': return `${typeof a === 'boolean' ? (a ? 'TRUE' : 'FALSE') : a}${typeof b === 'boolean' ? (b ? 'TRUE' : 'FALSE') : b}`;
      default: {
        const c = compare(a, b);
        return { '=': c === 0, '<>': c !== 0, '<': c < 0, '>': c > 0, '<=': c <= 0, '>=': c >= 0 }[o]!;
      }
    }
  }

  private unary(): Arg {
    if (this.op('-')) return -num(this.scalar(this.unary()));
    if (this.op('+')) return this.unary();
    const v = this.primary();
    if (this.op('%')) return num(this.scalar(v)) / 100;
    return v;
  }

  private primary(): Arg {
    const p = this.t[this.i++];
    if (!p) throw new Error('Formula ends too soon');
    if (p.k === 'num' || p.k === 'str' || p.k === 'bool') return p.v;
    if (p.k === 'ref') return this.ref(p.v);
    if (p.k === 'op' && p.v === '(') { const v = this.expr(0); if (!this.op(')')) throw new Error('No closing bracket'); return v; }
    if (p.k === 'fn') return this.call(p.v);
    throw new Error(`Unexpected ${p.v}`);
  }

  private ref(text: string): Range {
    const bang = text.lastIndexOf('!');
    const sheet = bang < 0 ? this.sheet : text.slice(0, bang).replace(/^'(.*)'$/, '$1').replace(/''/g, "'");
    const [a, z = a] = text.slice(bang + 1).replace(/\$/g, '').split(':');
    const [, ca, ra] = /^([A-Z]+)(\d+)$/.exec(a)!, [, cz, rz] = /^([A-Z]+)(\d+)$/.exec(z)!;
    return { sheet, c1: Math.min(colOf(ca), colOf(cz)), r1: Math.min(+ra, +rz), c2: Math.max(colOf(ca), colOf(cz)), r2: Math.max(+ra, +rz) };
  }

  /** The arguments, each read only when the function asks for it (IF works one branch, as a spreadsheet does). */
  private args(): (() => Arg)[] {
    const out: (() => Arg)[] = [];
    if (this.op(')')) return out;
    for (;;) {
      const start = this.i;
      this.skip();
      const end = this.i;
      out.push(() => { const keep = this.i; this.i = start; const v = this.expr(0); if (this.i !== end) throw new Error('Argument not read to its end'); this.i = keep; return v; });
      if (this.op(')')) return out;
      if (!this.op(',')) throw new Error('Expected , or )');
    }
  }

  /** Skips one argument: to the next comma or closing bracket at this depth. */
  private skip() {
    let depth = 0;
    for (; this.i < this.t.length; this.i++) {
      const p = this.t[this.i];
      if (p.k === 'fn' || (p.k === 'op' && p.v === '(')) depth++;
      else if (p.k === 'op' && p.v === ')') { if (depth === 0) return; depth--; }
      else if (p.k === 'op' && p.v === ',' && depth === 0) return;
    }
  }

  private call(name: string): Arg {
    const a = this.args(), b = this.b, v = (k: number) => this.scalar(a[k]()), all = () => a.map((x) => x());
    switch (name) {
      case 'IF': { const c = v(0); return (typeof c === 'string' ? c !== '' : num(c) !== 0) ? v(1) : a.length > 2 ? v(2) : false; }
      case 'AND': return all().every((x) => num(this.scalar(x)) !== 0);
      case 'SUM': return numbers(b, all()).reduce((s, x) => s + x, 0);
      case 'MIN': { const n = numbers(b, all()); return n.length ? Math.min(...n) : 0; }
      case 'MAX': { const n = numbers(b, all()); return n.length ? Math.max(...n) : 0; }
      case 'COUNT': return numbers(b, all()).length;
      case 'ABS': return Math.abs(num(v(0)));
      case 'ROUND': { const x = num(v(0)), f = 10 ** (a.length > 1 ? num(v(1)) : 0); return (Math.sign(x) * Math.round(Math.abs(x) * f)) / f + 0; }
      case 'INT': return Math.floor(num(v(0)));
      case 'MOD': { const x = num(v(0)), y = num(v(1)); if (y === 0) throw new Error('#DIV/0!'); return x - y * Math.floor(x / y); }
      case 'DATE': return (Date.UTC(num(v(0)), num(v(1)) - 1, num(v(2))) - EPOCH) / 864e5;
      case 'YEAR': return new Date(EPOCH + num(v(0)) * 864e5).getUTCFullYear();
      case 'MONTH': return new Date(EPOCH + num(v(0)) * 864e5).getUTCMonth() + 1;
      case 'SUMIF': {
        const r = a[0](), crit = v(1), s = a.length > 2 ? a[2]() : r;
        if (typeof r !== 'object' || typeof s !== 'object') throw new Error('SUMIF wants ranges');
        const keys = b.range(r).flat(), vals = b.range(s).flat();
        return keys.reduce<number>((t, k, j) => (meets(k, crit) && typeof vals[j] === 'number' ? t + (vals[j] as number) : t), 0);
      }
      case 'INDEX': {
        const r = a[0]();
        if (typeof r !== 'object') throw new Error('INDEX wants a range');
        const grid = b.range(r), i = num(v(1)), j = a.length > 2 ? num(v(2)) : 1;
        const [row, col] = grid.length === 1 && a.length === 2 ? [1, i] : [i, j];
        const x = grid[row - 1]?.[col - 1];
        if (x === undefined) throw new Error('#REF! in INDEX');
        return x;
      }
      case 'MATCH': {
        const want = v(0), r = a[1]();
        if (typeof r !== 'object' || (a.length > 2 && num(v(2)) !== 0)) throw new Error('Only MATCH(x, range, 0) is known');
        const k = b.range(r).flat().findIndex((x) => x !== '' && compare(x, want) === 0);
        if (k < 0) throw new Error('#N/A in MATCH');
        return k + 1;
      }
      default: throw new Error(`Unknown function ${name}`);
    }
  }
}
