import { randomBytes } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
let key:Buffer|undefined;
/** Local authority only. Cloud bundling replaces this adapter with a fail-closed one. */
export function localGuestKey():Buffer {
  if(key)return key;
  const directory=new URL(process.env.QATU_ENV==='production'?'../../../../.runtime/operational/':'../../../../.runtime/',import.meta.url);
  const path=fileURLToPath(new URL('guest-code.key',directory));
  mkdirSync(directory,{recursive:true});
  try{writeFileSync(path,randomBytes(32),{flag:'wx',mode:0o600});}
  catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
  const loaded=readFileSync(path);if(loaded.length!==32)throw new Error('Guest signing key requires32 bytes; do not overwrite it.');
  return key=loaded;
}
