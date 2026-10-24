/**
 * POST /read (U1, D-UX-48): an audited statement's text lines in, the AI's pointers out. The AI is asked only where each
 * CMA head is printed (page, line, which number on the line), never an amount; the browser copies the digits, adds them up
 * and checks them against the statement's printed totals (engine/read.ts), and nothing counts until the borrower ticks it.
 * The lines are never logged or stored. Off until the owner adds the ANTHROPIC_API_KEY secret (docs/OWNER.md); capped per
 * address and per day through KV counters, since the owner pays for each read.
 */
import Anthropic from '@anthropic-ai/sdk';
import { READ, promptLines, type Answer, type Line } from '../../engine/read';
import { capped } from './body';
import { withinCaps } from './caps';
import { answerOf } from './shape';

export type ReadEnv = Env & { ANTHROPIC_API_KEY?: string };
type Reply = (body: unknown, status: number, headers?: Record<string, string>) => Response;

const HEADS = Object.keys(READ.where), TOTALS = Object.keys(READ.totals);
const int = { type: 'integer' };
const obj = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const AT = obj({ page: int, line: int }), POINTER = obj({ page: int, line: int, n: int });
const COLUMN = { type: 'string', enum: ['current', 'previous'] };
export const SCHEMA = obj({
  yearsAt: AT, unitsAt: AT,
  placements: { type: 'array', items: obj({ head: { type: 'string', enum: HEADS }, column: COLUMN, at: { type: 'array', items: POINTER } }) },
  totals: { type: 'array', items: obj({ total: { type: 'string', enum: TOTALS }, column: COLUMN, at: POINTER }) },
});

export const SYSTEM = [
  "You find where an Indian company's audited financial statement prints each figure a bank's CMA data needs.",
  'The statement comes as numbered lines, "p<page> l<line>: <text>", and after " | " each number on the line is listed as [n].',
  'You never write, add, subtract or work out an amount. You only point: the page, the line and the [n] of the number printed there.',
  'A program copies the digits, adds the lines you point to for one head, and checks the sums against the totals the statement prints.',
  'Columns: "current" is the year the statement is for (its first figure column), "previous" is the year before beside it.',
  'A note number in a Note column is not a figure: point to the figure columns only.',
  'Where a head is printed on several lines (a note that splits it, or parts to be added), point to each line; never to a subtotal and its parts together.',
  'Leave a head out when the statement does not print it, or when you are not sure; a dash means not printed. Never guess.',
  'yearsAt: the line that names the year ends of the columns. unitsAt: the line that states the units (for example "Rs. in lakh"); page 0 and line 0 when none is stated.',
  '',
  'The heads, by id:',
  ...Object.entries(READ.where).map(([id, w]) => `- ${id}: ${w}`),
  '',
  'The printed totals, by id:',
  ...Object.entries(READ.totals).map(([id, w]) => `- ${id}: ${w}`),
].join('\n');

/** The lines as sent by the page, checked; a reason in words when they are not usable. */
export function linesOf(body: unknown): Line[] | string {
  const lines = (body as { lines?: unknown })?.lines;
  if (!Array.isArray(lines) || !lines.length) return 'no lines';
  if (lines.length > READ.maxLines) return `more than ${READ.maxLines} lines`;
  let chars = 0;
  for (const l of lines as Line[]) {
    if (!l || !Number.isInteger(l.page) || !Number.isInteger(l.line) || l.page < 1 || l.line < 1 || typeof l.text !== 'string') return 'a line is not {page, line, text}';
    chars += l.text.length;
  }
  return chars > READ.maxChars ? `more than ${READ.maxChars} characters` : (lines as Line[]);
}

export async function read(req: Request, env: ReadEnv, json: Reply): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'Reading statements is not switched on yet: type the figures.' }, 503);
  const raw = await capped(req, READ.maxChars * 3);
  if (raw === undefined) return json({ error: 'The statement is too long to read: type the figures.' }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: 'not JSON' }, 400); }
  const lines = linesOf(body);
  if (typeof lines === 'string') return json({ error: lines }, 400);
  if (!(await withinCaps(env, 'read', req.headers.get('cf-connecting-ip') ?? 'unknown', [Number(env.READ_PER_IP), Number(env.READ_PER_DAY)])))
    return json({ error: 'Today’s reads are used up: type the figures, or try again tomorrow.' }, 429);

  const model = env.READ_MODEL;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const msg = await client.beta.messages.create({
      model, max_tokens: 16000, system: SYSTEM,
      messages: [{ role: 'user', content: promptLines(lines) }],
      output_config: { ...(env.READ_EFFORT ? { effort: env.READ_EFFORT as 'medium' } : {}), format: { type: 'json_schema', schema: SCHEMA } },
      // Opus 5.5 may decline a request on policy grounds; the server then retries on its default fallback model.
      ...(model.startsWith('claude-opus') ? { fallbacks: 'default' as const, betas: ['server-side-fallback-2026-07-01' as const] } : {}),
    });
    const text = msg.content.find((b) => b.type === 'text');
    if (msg.stop_reason !== 'end_turn' || !text || text.type !== 'text') return json({ error: 'The statement could not be read: type the figures.' }, 502);
    // An answer outside the schema is refused here, before the page sees it (SEC1).
    const answer = answerOf(text.text, SCHEMA) as Answer | undefined;
    if (!answer) return json({ error: 'The statement could not be read: type the figures.' }, 502);
    return json({ answer }, 200);
  } catch (e) {
    // Only the kind of failure is logged, never the statement.
    console.error('read failed', e instanceof Anthropic.APIError ? e.status : (e as Error)?.name);
    return json({ error: 'The statement could not be read just now: type the figures, or try again.' }, 502);
  }
}
