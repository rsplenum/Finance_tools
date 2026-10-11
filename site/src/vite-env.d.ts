// What Vite gives the site's code: a file's address from `?url`, and the PUBLIC_ settings at build time.
declare module '*?url' { const url: string; export default url; }
interface ImportMeta { readonly env: Record<string, string | undefined> }
