/** Optional session-file collection stays off the startup context path (#130). */
import * as path from 'node:path';
import {gcSessionFiles, readJSON, writeJSON} from './shared.js';
if (process.argv.includes('--selfcheck')) {
  process.stdout.write('ok session-maintenance');
} else {
  const wolfDir=process.argv[2];
  if (wolfDir && path.isAbsolute(wolfDir) && readJSON<any>(path.join(wolfDir,'config.json'),{})?.openwolf?.enabled !== false) {
    gcSessionFiles(7,wolfDir);
    writeJSON(path.join(wolfDir,'hooks','_maintenance.json'),{checked_at:Date.now()});
  }
}
