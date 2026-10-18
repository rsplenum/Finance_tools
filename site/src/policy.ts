/**
 * A policy page's words to HTML (LEGAL1, D-BIZ-07). The words are plain text, escaped; two marks stand for what is not
 * plain text: {email} is the contact email as a link (the Contact page only, D-BIZ-07), and {gap:what} a fact only the owner can give, shown in brackets so
 * a reader and the lawyer see it is missing (the site check finds it by `data-gap`). [text](/path/) is a link to a page.
 */
import { CONTACT_EMAIL } from './site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const gap = (what: string) => `<span data-gap class="font-medium text-ink">[${what}: to be added]</span>`;
const link = (href: string, text: string) => `<a href="${href}" class="text-link underline underline-offset-4">${text}</a>`;

export function words(text: string): string {
  return esc(text)
    .replace(/\{email\}/g, () => link(`mailto:${CONTACT_EMAIL}`, esc(CONTACT_EMAIL)))
    .replace(/\{gap:([^}]+)\}/g, (_, what: string) => gap(what))
    .replace(/\[([^\]]+)\]\((\/[a-z0-9/-]*)\)/g, (_, t: string, href: string) => link(href, t));
}

/** A section: its heading, then paragraphs; an array among them is a list. */
export interface Section { h: string; p: (string | string[])[] }
