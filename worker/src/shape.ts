/**
 * The AI's answer checked against the schema it was asked for, on the server (SEC1, D-TECH-54, audit S2), so a reply
 * that strays is refused before it reaches the page. Hand-written for the few forms the schemas use: objects with every
 * key required and no others, integers, strings with or without a list, and arrays.
 */
export type Schema = { type: string; enum?: string[]; items?: Schema; required?: string[]; properties?: Record<string, Schema>; additionalProperties?: boolean };

export function fits(v: unknown, s: Schema): boolean {
  switch (s.type) {
    case 'integer': return Number.isInteger(v);
    case 'string': return typeof v === 'string' && (!s.enum || s.enum.includes(v));
    case 'array': return Array.isArray(v) && (!s.items || v.every((x) => fits(x, s.items!)));
    case 'object': {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
      const o = v as Record<string, unknown>, props = s.properties ?? {};
      if ((s.required ?? []).some((k) => !(k in o))) return false;
      return Object.entries(o).every(([k, x]) => (k in props ? fits(x, props[k]) : s.additionalProperties !== false));
    }
    default: return false;
  }
}

/** The model's text as JSON that fits the schema, or null. */
export function parsedAs<T>(text: string, s: Schema): T | null {
  try { const v: unknown = JSON.parse(text); return fits(v, s) ? (v as T) : null; } catch { return null; }
}
