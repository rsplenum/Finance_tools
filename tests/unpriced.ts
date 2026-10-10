import { ENTRIES, type Entry } from '../engine/library';

/**
 * Runs `f` with an item's rate taken away, as if it were still to be found, and puts it back after. Since E2c every
 * item in the library has a rate, so the tests of an unpriced item (left out, named, flagged, "No rate yet") use this.
 */
export function unpriced<T>(id: string, f: () => T): T {
  const e = ENTRIES.get(id) as Entry, { rate: _, ...rest } = e;
  ENTRIES.set(id, rest);
  try {
    return f();
  } finally {
    ENTRIES.set(id, e);
  }
}
