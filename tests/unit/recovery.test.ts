import { it, expect } from 'vitest';
import { assertRestoreUrl, validateManifest } from '../../scripts/operational/recovery/archive.js';
import { assertDatabaseUrl } from '../../services/commerce/src/platform/runtime.js';
const safe='postgresql://fixture:secret@127.0.0.1:55432/qatupos_restore_'+'a'.repeat(32);
it('a restore accepts only an explicitly isolated loopback namespace',()=>{expect(assertRestoreUrl(safe).pathname).toContain('qatupos_restore_');});
it.each(['qatupos_lab','qatupos_prod_restaurant','qatupos_restore_abc','postgres'])('cannot restore over %s',database=>{expect(()=>assertRestoreUrl(safe.replace(/qatupos_restore_a+$/,database))).toThrow('INVALID_RESTORE_TARGET');});
it('refuses a remote restore target',()=>{expect(()=>assertRestoreUrl(safe.replace('127.0.0.1','192.168.1.30'))).toThrow();});
it.each([{},{QATU_ENV:'production',DATABASE_URL:safe,QATU_PUBLIC_ORIGIN:'https://pos.example.test'}])('runtime rejects rehearsal databases regardless of installation mode',env=>{expect(()=>assertDatabaseUrl(safe,env)).toThrow('quarantined');});
it('rejects open or malformed manifests',()=>{expect(()=>validateManifest({format_version:1,secret:'not-a-real-key'})).toThrow('INVALID_MANIFEST');});
