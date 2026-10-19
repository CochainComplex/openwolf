import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const ignoreEntry=require.resolve('ignore');
const license=readFileSync(path.join(path.dirname(ignoreEntry),'LICENSE-MIT'),'utf8');
// Ship the locked, maintained matcher with standalone hooks (no project npm install required).
writeFileSync(new URL('../src/hooks/ignore-runtime.ts',import.meta.url), '// @ts-nocheck\n// Generated from the locked ignore dependency; do not edit.\n/*\n'+license+'\n*/\nconst module = {exports: {} as any};\n'+readFileSync(ignoreEntry,'utf8')+'\nexport default module.exports;\n');
// Generated plugin helpers have the exact same implementation as standalone hooks.
import { copyFileSync } from 'node:fs';
for (const name of ['anatomy-scope', 'ignore-runtime', 'task-review', 'anatomy-lock', 'bug-id', 'trusted-memory', 'shared', 'ledger', 'ledger-math', 'knowledge-root', 'bug-journal', 'session-state', 'event-journal', 'runtime-updates', 'handoff-state', 'visibility']) {
  copyFileSync(new URL(`../src/hooks/${name}.ts`, import.meta.url), new URL(`../src/templates/opencode-plugin/${name}.ts`, import.meta.url));
}

copyFileSync(new URL('../src/tracker/pricing.ts', import.meta.url), new URL('../src/dashboard/app/lib/pricing.ts', import.meta.url));
