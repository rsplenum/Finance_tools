// The node functions the tests use (tests/read.test.ts writes the fixtures the site check uploads; tests/privacy.test.ts
// reads the code the privacy page states); no @types/node here.
declare module 'node:fs' {
  export function writeFileSync(path: URL | string, data: Uint8Array | string): void;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string): string[];
  export function existsSync(path: string): boolean;
  export function statSync(path: string): { isDirectory(): boolean };
}
