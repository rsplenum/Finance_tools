/**
 * The AI's answer checked on the server against the very schema it was asked to fill (SEC1, D-TECH-54, audit S2): only
 * the parts those schemas use (an object with its required keys and no others, an array, an integer, a string, an
 * enum). Written by hand, no package; the page still checks every pointer and sentence itself.
 */
type Schema = { type: string; enum?: unknown[]; items?: Schema; required?: string[]; properties?: Record<string, Schema> };

export function fits(v: unknown, schema: object): boolean {
  const s = schema as Schema;
  if (s.enum && !s.enum.includes(v)) return false;
  switch (s.type) {
    case 'integer': return Number.isSafeInteger(v);
    case 'string': return typeof v === 'string';
    case 'array': return Array.isArray(v) && v.every((x) => fits(x, s.items!));
    case 'object': {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
      const props = s.properties ?? {}, o = v as Record<string, unknown>;
      return Object.keys(o).every((k) => k in props) && (s.required ?? []).every((k) => k in o) && Object.entries(o).every(([k, x]) => fits(x, props[k]));
    }
    default: return false;
  }
}

/** The model's text as JSON that fits the schema, or undefined. */
export function answerOf(text: string, s: object): unknown {
  try { const v = JSON.parse(text) as unknown; return fits(v, s) ? v : undefined; } catch { return undefined; }
}
