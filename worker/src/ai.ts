/**
 * One call to an AI, whichever key the Worker holds (READ1, D-TECH-114): Anthropic's Claude when ANTHROPIC_API_KEY is
 * set, else Google's Gemini when GEMINI_API_KEY (or Gemini_API_key, the spelling first saved on 13-11-2026) is set, else
 * none and the routes say they are not switched on. Both get the same system words, the same prompt and the same JSON
 * schema; the text that comes back is checked against that schema by the route (shape.ts), and the page checks every
 * pointer and sentence again. The AI works out no figure (rule 12). Only the kind of a failure is logged, never what
 * was sent. The models are vars in worker/wrangler.jsonc, read from each provider's own page on the day they are set.
 * A Gemini model is one with no free tier: Google may use what reaches its unpaid tier to improve its products and let
 * people read it ("Do not submit sensitive, confidential, or personal information", its terms of 23-03-2026), so a key
 * without billing fails here rather than send a borrower's statement there.
 */
import Anthropic from '@anthropic-ai/sdk';

export type AiEnv = Env & { ANTHROPIC_API_KEY?: string; GEMINI_API_KEY?: string; Gemini_API_key?: string };
export type Provider = 'anthropic' | 'gemini';
/** A model, its effort ('' or absent for none) and the most it may write, thinking included. */
export type Model = { model: string; effort?: string; maxTokens: number };
export type Job = { name: string; system: string; prompt: string; schema: object; models: Record<Provider, Model> };
/** The model's whole answer as text; or 'short' when it stopped before the end; or 'failed' when the call failed. */
export type Said = { text: string } | { fault: 'short' | 'failed' };

const geminiKey = (env: AiEnv) => env.GEMINI_API_KEY || env.Gemini_API_key;

export function providerOf(env: AiEnv): Provider | undefined {
  return env.ANTHROPIC_API_KEY ? 'anthropic' : geminiKey(env) ? 'gemini' : undefined;
}

export async function ask(env: AiEnv, job: Job): Promise<Said> {
  const by = providerOf(env);
  if (by === 'anthropic') return claude(env.ANTHROPIC_API_KEY!, job);
  if (by === 'gemini') return gemini(geminiKey(env)!, job);
  return { fault: 'failed' };
}

async function claude(apiKey: string, job: Job): Promise<Said> {
  const { model, effort, maxTokens } = job.models.anthropic;
  try {
    const msg = await new Anthropic({ apiKey }).beta.messages.create({
      model, max_tokens: maxTokens, system: job.system,
      messages: [{ role: 'user', content: job.prompt }],
      output_config: { ...(effort ? { effort: effort as 'medium' } : {}), format: { type: 'json_schema', schema: job.schema as Record<string, unknown> } },
      // Opus 5.5 may decline a request on policy grounds; the server then retries on its default fallback model.
      ...(model.startsWith('claude-opus') ? { fallbacks: 'default' as const, betas: ['server-side-fallback-2026-07-01' as const] } : {}),
    });
    const text = msg.content.find((b) => b.type === 'text');
    return msg.stop_reason === 'end_turn' && text?.type === 'text' ? { text: text.text } : { fault: 'short' };
  } catch (e) {
    console.error(`${job.name} failed`, 'anthropic', e instanceof Anthropic.APIError ? e.status : (e as Error)?.name);
    return { fault: 'failed' };
  }
}

export const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';
type GeminiReply = { candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[] };

async function gemini(key: string, job: Job): Promise<Said> {
  const { model, effort, maxTokens } = job.models.gemini;
  try {
    const r = await fetch(`${GEMINI}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: job.system }] },
        contents: [{ role: 'user', parts: [{ text: job.prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json', responseJsonSchema: job.schema, maxOutputTokens: maxTokens,
          ...(effort ? { thinkingConfig: { thinkingLevel: effort.toUpperCase() } } : {}),
        },
      }),
    });
    if (!r.ok) {
      console.error(`${job.name} failed`, 'gemini', r.status);
      return { fault: 'failed' };
    }
    const c = ((await r.json()) as GeminiReply).candidates?.[0];
    // Thought summaries come only when asked for; skip them all the same, so only the answer is read.
    const text = (c?.content?.parts ?? []).filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('');
    return c?.finishReason === 'STOP' && text ? { text } : { fault: 'short' };
  } catch (e) {
    console.error(`${job.name} failed`, 'gemini', (e as Error)?.name);
    return { fault: 'failed' };
  }
}
