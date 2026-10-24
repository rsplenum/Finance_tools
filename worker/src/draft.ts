/**
 * POST /draft (REP2, D-AI-01, D-AI-02): the project report's facts as words in, six short sections of draft words out.
 * The prompt is built here from checked fields (engine/narrative.ts), so the user's notes reach the AI only as facts; the
 * page then drops any sentence that holds a figure the user did not type or a claim a new business cannot have, and
 * nothing goes in the document until the borrower ticks the words as true. What is sent is never logged or stored. Off
 * until the owner adds the ANTHROPIC_API_KEY secret (docs/OWNER.md); capped per address and per day apart from reading.
 */
import Anthropic from '@anthropic-ai/sdk';
import { NARRATIVE, SCHEMA, SYSTEM, inputOf, promptOf } from '../../engine/narrative';
import { textWithin } from './body';
import { withinCaps } from './caps';
import { parsedAs, type Schema } from './shape';
import type { ReadEnv } from './read';

/** The largest body read: the notes and facts at their caps, three bytes a character. */
export const MAX_BYTES = (NARRATIVE.maxNote * 3 + NARRATIVE.maxFact * (5 + 3 * NARRATIVE.maxProducts)) * 3;

type Reply = (body: unknown, status: number, headers?: Record<string, string>) => Response;

export async function draft(req: Request, env: ReadEnv, json: Reply): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'Drafting the words is not switched on yet: write them yourself.' }, 503);
  const text = await textWithin(req, MAX_BYTES);
  if (text === null) return json({ error: 'Too much to draft from: shorten the notes.' }, 413);
  let body: unknown;
  try { body = JSON.parse(text); } catch { return json({ error: 'not JSON' }, 400); }
  const input = inputOf(body);
  if (typeof input === 'string') return json({ error: input }, 400);
  if (!(await withinCaps(env, 'draft', req.headers.get('cf-connecting-ip') ?? 'unknown', [Number(env.DRAFT_PER_IP), Number(env.DRAFT_PER_DAY)])))
    return json({ error: 'Today’s drafts are used up: write the words yourself, or try again tomorrow.' }, 429);

  const model = env.DRAFT_MODEL;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const msg = await client.beta.messages.create({
      model, max_tokens: 8000, system: SYSTEM,
      messages: [{ role: 'user', content: promptOf(input) }],
      output_config: { ...(env.DRAFT_EFFORT ? { effort: env.DRAFT_EFFORT as 'low' } : {}), format: { type: 'json_schema', schema: SCHEMA } },
      // Opus 5.5 may decline a request on policy grounds; the server then retries on its default fallback model.
      ...(model.startsWith('claude-opus') ? { fallbacks: 'default' as const, betas: ['server-side-fallback-2026-07-01' as const] } : {}),
    });
    const out = msg.content.find((b) => b.type === 'text');
    const words = msg.stop_reason === 'end_turn' && out?.type === 'text' ? parsedAs<Record<string, string>>(out.text, SCHEMA as Schema) : null;
    if (!words) return json({ error: 'The words could not be drafted: write them yourself, or try again.' }, 502);
    return json({ draft: words }, 200);
  } catch (e) {
    // Only the kind of failure is logged, never what was sent.
    console.error('draft failed', e instanceof Anthropic.APIError ? e.status : (e as Error)?.name);
    return json({ error: 'The words could not be drafted just now: write them yourself, or try again.' }, 502);
  }
}
