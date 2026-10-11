// The one node function a test uses (tests/read.test.ts writes the fixtures the site check uploads); no @types/node here.
declare module 'node:fs' { export function writeFileSync(path: URL | string, data: Uint8Array | string): void }
