/**
 * POST /draft (REP2, D-AI-01, D-AI-02): the project report's facts as words in, six short sections of draft words out.
 * The prompt is built here from checked fields (engine/narrative.ts), so the user's notes reach the AI only as facts; the
 * page then drops any sentence that holds a figure the user did not type or a claim a new business cannot have, and
 * nothing goes in the document until the borrower ticks the words as true. What is sent is never logged or stored. Off
 * until the owner adds an AI's key as a secret (docs/OWNER.md; ai.ts says which is used); capped per address and per day
 * apart from reading.
 */
import { NARRATIVE, SCHEMA, SYSTEM, inputOf, promptOf } from '../../engine/narrative';
import { ask, providerOf } from './ai';
import { capped } from './body';
import { withinCaps } from './caps';
import { answerOf } from './shape';
import type { ReadEnv } from './read';

type Reply = (body: unknown, status: number, headers?: Record<string, string>) => Response;

export async function draft(req: Request, env: ReadEnv, json: Reply): Promise<Response> {
  if (!providerOf(env)) return json({ error: 'Drafting the words is not switched on yet: write them yourself.' }, 503);
  const raw = await capped(req, (NARRATIVE.maxNote * 3 + NARRATIVE.maxFact * (5 + 3 * NARRATIVE.maxProducts)) * 3);
  if (raw === undefined) return json({ error: 'Too much to draft from: shorten the notes.' }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: 'not JSON' }, 400); }
  const input = inputOf(body);
  if (typeof input === 'string') return json({ error: input }, 400);
  if (!(await withinCaps(env, 'draft', req.headers.get('cf-connecting-ip') ?? 'unknown', [Number(env.DRAFT_PER_IP), Number(env.DRAFT_PER_DAY)])))
    return json({ error: 'Today’s drafts are used up: write the words yourself, or try again tomorrow.' }, 429);

  const said = await ask(env, {
    name: 'draft', system: SYSTEM, prompt: promptOf(input), schema: SCHEMA,
    models: {
      anthropic: { model: env.DRAFT_MODEL, effort: env.DRAFT_EFFORT, maxTokens: 8000 },
      gemini: { model: env.GEMINI_DRAFT_MODEL, effort: env.GEMINI_DRAFT_THINKING, maxTokens: 16000 },
    },
  });
  if ('fault' in said) return said.fault === 'short'
    ? json({ error: 'The words could not be drafted: write them yourself, or try again.' }, 502)
    : json({ error: 'The words could not be drafted just now: write them yourself, or try again.' }, 502);
  // A draft outside the schema is refused here, before the page sees it (SEC1).
  const out = answerOf(said.text, SCHEMA);
  if (!out) return json({ error: 'The words could not be drafted: write them yourself, or try again.' }, 502);
  return json({ draft: out }, 200);
}
