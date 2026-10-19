import * as fs from 'node:fs';
import * as path from 'node:path';

/** Resolve Windows npm shims without invoking a shell (#136, @citizenshanegit).
 * Prefer native binaries; known npm packages run through Node with argument arrays.
 */
export function cliCommand(name: 'pm2' | 'opencode', platform = process.platform, env = process.env): {file: string; args: string[]} {
  if (platform !== 'win32') return {file: name, args: []};
  const searchPath = Object.entries(env).find(([key]) => key.toLowerCase() === 'path')?.[1] ?? '';
  for (const raw of searchPath.split(';')) {
    const dir = raw.replace(/^"|"$/g, '');
    if (!dir || !path.isAbsolute(dir)) continue;
    const native = path.join(dir, `${name}.exe`);
    if (fs.existsSync(native)) return {file: native, args: []};
    if (!fs.existsSync(path.join(dir, `${name}.cmd`))) continue;
    const packageName = name === 'pm2' ? 'pm2' : 'opencode-ai';
    const entry = path.join(dir, 'node_modules', packageName, 'bin', name);
    if (fs.existsSync(entry)) return {file: process.execPath, args: [entry]};
  }
  throw new Error(`Cannot resolve ${name} to a native executable or npm JavaScript entry on PATH. Reinstall ${name} or check PATH.`);
}
