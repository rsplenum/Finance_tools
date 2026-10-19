/** Q1: the way out of an app's own browser, beside the downloads (InAppNote in fields.tsx). */
/** Q1: an app's own browser that may not save files (WhatsApp, Instagram, Facebook, LinkedIn, Snapchat, Line, or any
 * Android web view), and the phone it runs on; undefined in a phone's or a computer's own browser. By the user agent,
 * so a guess: a missed app shows nothing, as before. */
export function inAppBrowser(ua: string): 'android' | 'ios' | undefined {
  if (!/WhatsApp|Instagram|FBAN|FBAV|FB_IAB|LinkedInApp|Snapchat|\bLine\/|; wv\)/.test(ua)) return undefined;
  return /Android/.test(ua) ? 'android' : 'ios';
}

/** The page's address as an Android intent, which opens it in the phone's own browser. */
export const intentUrl = (u: URL) => `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};end`;
