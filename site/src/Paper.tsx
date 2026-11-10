/**
 * A document as paper on the page (BUILD1, D-UX-340): the blocks the PDF, the Word copy and the Excel copy are written
 * from (doc/doc.ts), drawn as sheets that scale with their own width, so the borrower watches the paper a lender will
 * read fill in beside the questions. It words and works out nothing: every line is the document's own. A part starts a
 * sheet as it starts a page in the PDF; a sheet here is as long as its part, so the page numbers are the PDF's (`pages`).
 */
import { useLayoutEffect, useRef } from 'preact/hooks';
import type { Block, Doc, Part, Row, Table } from './doc/doc';

/** A part's place on the paper, by its name: what a step scrolls to. */
export const sheetId = (part: string) => `sheet-${part.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export const still = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; } };

/** Words or a figure that light up once when they change, never when first drawn: the paper answering the hand. */
function Fresh({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null), was = useRef(text);
  useLayoutEffect(() => {
    if (was.current === text) return;
    was.current = text;
    if (!still()) ref.current?.animate?.([{ backgroundColor: 'var(--fresh)' }, { backgroundColor: 'transparent' }], { duration: 1600, easing: 'ease-out' });
  }, [text]);
  return <span ref={ref} class="sheet-fresh">{text}</span>;
}

/** The most columns of figures a sheet holds beside the names; more run on in a second table, the names repeated, as the PDF does. */
const MOST = 8;
function TableOf({ t }: { t: Table }) {
  const words = t.columns.some((c) => c.wrap), n = t.columns.length - 1;
  const runs: number[][] = [];
  if (words || n <= MOST) runs.push(t.columns.map((_, i) => i).slice(1));
  else for (let i = 1; i <= n; i += MOST) runs.push(Array.from({ length: Math.min(MOST, n - i + 1) }, (_, k) => i + k));
  const cell = (r: Row, i: number) => r.cells[i]?.text ?? '';
  return <>{runs.map((run, k) => <div key={k} class="sheet-table-box">
    {t.unit && <p class="sheet-unit">{t.unit}</p>}
    <table class={`sheet-table${t.size === 'small' ? ' sheet-small' : ''}`}>
      <thead><tr>
        <th scope="col" class="sheet-name">{t.columns[0].label}</th>
        {run.map((i) => <th key={i} scope="col" class={t.columns[i].wrap ? 'sheet-name' : ''}>{t.columns[i].label}{t.columns[i].sub && <span class="sheet-sub">{t.columns[i].sub}</span>}</th>)}
      </tr></thead>
      <tbody>{t.rows.map((r, j) => r.kind === 'head'
        ? <tr key={j} class="sheet-row-head"><th scope="colgroup" colSpan={run.length + 1}>{cell(r, 0)}</th></tr>
        : <tr key={j} class={r.kind ? `sheet-row-${r.kind}` : ''}>
          <th scope="row" class="sheet-name">{cell(r, 0)}</th>
          {run.map((i) => <td key={i} class={t.columns[i].wrap ? 'sheet-name' : ''}><Fresh text={cell(r, i)} /></td>)}
        </tr>)}</tbody>
    </table>
  </div>)}</>;
}

function BlockOf({ b, doc, pages }: { b: Block; doc: Doc; pages?: [string, number][] }) {
  switch (b.kind) {
    case 'cover': return <div class="sheet-cover">
      <p class="sheet-kicker">{b.kicker}</p>
      <p class="sheet-cover-title"><Fresh text={b.title} /></p>
      {b.sub && <p class="sheet-cover-sub"><Fresh text={b.sub} /></p>}
      <div class="sheet-cover-lines">{b.lines.map((l, i) => <p key={i}><Fresh text={l} /></p>)}</div>
      <dl class="sheet-cover-facts">{b.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><Fresh text={v} /></dd></div>)}</dl>
      {b.mark && <div class="sheet-box"><p class="sheet-box-title"><Fresh text={b.mark.title} /></p><p>{b.mark.text}</p></div>}
    </div>;
    case 'contents': return <div>
      <p class="sheet-title">{b.title}</p>
      <ol class="sheet-contents">{doc.parts.filter((x) => x.section && !x.sheetOnly).map((x) => {
        const page = pages?.find(([s]) => s === x.section)?.[1];
        return <li key={x.section}><span>{x.section}</span><span class="sheet-leader" aria-hidden="true" />{page !== undefined && <span>{page}</span>}</li>;
      })}</ol>
    </div>;
    case 'title': return <><p class={b.small ? 'sheet-title sheet-title-small' : 'sheet-title'}>{b.text}</p>{b.sub && <p class="sheet-muted">{b.sub}</p>}</>;
    case 'heading': return <p class="sheet-heading">{b.text}</p>;
    case 'text': return <p class={b.small ? 'sheet-muted' : 'sheet-text'}><Fresh text={b.text} /></p>;
    case 'list': return <ul class={b.small ? 'sheet-list sheet-muted' : 'sheet-list'}>{b.items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
    case 'pairs': return <dl class="sheet-pairs">{b.pairs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><Fresh text={v} /></dd></div>)}</dl>;
    case 'facts': return <div class="sheet-facts">{b.lines.map((line, i) => <dl key={i}>{line.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><Fresh text={v} /></dd></div>)}</dl>)}</div>;
    case 'figures': return <dl class="sheet-figures">{b.items.map((f) => <div key={f.label}><dt>{f.label}</dt><dd class="sheet-figure"><Fresh text={f.value} /></dd>{f.note && <dd class="sheet-muted">{f.note}</dd>}</div>)}</dl>;
    case 'box': return <div class="sheet-box"><p class="sheet-box-title"><Fresh text={b.title} /></p><ul class="sheet-list">{b.items.map((t, i) => <li key={i}>{t}</li>)}</ul></div>;
    case 'table': return <TableOf t={b.table} />;
    default: return <div class="sheet-sign">{b.lines.map((l, i) => <p key={i}>{l || ' '}</p>)}</div>;
  }
}

/** The sheets: a part starts one unless it runs on (`flow`), and a cover stands alone on its own. */
function sheetsOf(doc: Doc): { parts: Part[]; cover: boolean }[] {
  const out: { parts: Part[]; cover: boolean }[] = [];
  for (const part of doc.parts.filter((x) => !x.sheetOnly)) {
    const at = part.blocks.findIndex((b) => b.kind === 'cover');
    if (at >= 0) {
      out.push({ parts: [{ ...part, blocks: part.blocks.slice(0, at + 1) }], cover: true });
      if (part.blocks.length > at + 1) out.push({ parts: [{ ...part, name: `${part.name} 2`, blocks: part.blocks.slice(at + 1) }], cover: false });
    } else if (part.flow && out.length && !out[out.length - 1].cover) out[out.length - 1].parts.push(part);
    else out.push({ parts: [part], cover: false });
  }
  return out;
}

/** `pages`: each section's page in the PDF, for the contents; `label` names the region for a screen reader. */
export function Paper({ doc, pages, label }: { doc: Doc; pages?: [string, number][]; label: string }) {
  return <div role="group" aria-label={label} class="sheets">
    {sheetsOf(doc).map((sh, n) => <div key={n} class="sheet paper shadow-paper">
      <div class="sheet-in">
        {!sh.cover && <p class="sheet-run"><span>{doc.header}</span>{doc.mark && <strong>{doc.mark}</strong>}</p>}
        <div class="sheet-body">
          {sh.parts.map((part) => <div key={part.name} id={sheetId(part.name)} data-part={part.name} class="sheet-part">
            {part.blocks.map((b, i) => <BlockOf key={i} b={b} doc={doc} pages={pages} />)}
            {part.ghost ? <div class="sheet-ghost" aria-hidden="true">{Array.from({ length: part.ghost }, (_, i) => <span key={i} />)}</div> : null}
          </div>)}
        </div>
        {!sh.cover && <p class="sheet-run sheet-foot"><span>{doc.footer}</span></p>}
      </div>
    </div>)}
  </div>;
}
