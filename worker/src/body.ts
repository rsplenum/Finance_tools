/**
 * The request body, read up to a cap counted in the bytes that arrive (SEC1, D-TECH-54, audit S1). Content-Length is
 * never trusted: a request may leave it out, or state less than it sends. Reading stops at the first byte past the cap.
 */
export async function capped(req: Request, max: number): Promise<string | undefined> {
  if (!req.body) return '';
  const reader = req.body.getReader(), parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); return undefined; }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { all.set(p, at); at += p.byteLength; }
  return new TextDecoder().decode(all);
}
