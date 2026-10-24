/** Day caps on what the owner pays for (U1's reads, REP2's drafts): one KV counter a kind per address and one in all. */
/** How long a day's counter, and with it the address in its key, is kept: two days, so a cap spans the day's end (PRIV1). */
export const CAP_DAYS = 2;
const today = () => new Date().toISOString().slice(0, 10);

/** Counts a call against the day's caps; false when either is spent. KV is not atomic, so a burst may pass a cap by a few. */
export async function withinCaps(env: Env, kind: string, ip: string, caps: [number, number]) {
  const day = today(), keys = [`${kind}:ip:${ip}:${day}`, `${kind}:all:${day}`];
  const used = await Promise.all(keys.map(async (k) => Number((await env.KV.get(k)) ?? 0)));
  if (used.some((u, i) => !(u < caps[i]))) return false;
  await Promise.all(keys.map((k, i) => env.KV.put(k, String(used[i] + 1), { expirationTtl: CAP_DAYS * 86400 })));
  return true;
}
