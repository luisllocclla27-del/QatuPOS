import { createHmac } from 'node:crypto';
import { localGuestKey } from './guest-key-local.js';
export function guestEnvironmentKey(env:Record<string,string|undefined>=process.env):Buffer|undefined {
  const value=env.QATU_GUEST_CODE_KEY_BASE64;
  if(value!==undefined) {
    const decoded=Buffer.from(value,'base64');
    if(decoded.length!==32 || decoded.toString('base64')!==value)throw new Error('Guest signing secret must be canonical base64 of32 bytes.');
    return decoded;
  }
  if(env.QATU_DEPLOYMENT==='vercel')throw new Error('Cloud requires a stable guest signing secret.');
  return undefined;
}
function signingKey():Buffer {
  // Build-time flag and separate adapter prevent filesystem fallback in cloud.
  if(process.env.QATU_DEPLOYMENT==='vercel')return guestEnvironmentKey()!;
  const supplied=guestEnvironmentKey();if(supplied)return supplied;
  return localGuestKey();
}
export function normalizeGuestCode(code:string) {return code.toUpperCase().replace(/[\s-]/g,'');}
export function deriveGuestCode(accessId:string) {
  return deriveGuestCodeWithKey(accessId,signingKey());
}
/** Pure derivation shared with backup key verification; never creates/rotates a key. */
export function deriveGuestCodeWithKey(accessId:string,secret:Buffer) {
  if(secret.length!==32)throw new Error('Guest signing key requires32 bytes.');
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes=createHmac('sha256',secret).update('QatuPOS guest v1:'+accessId).digest();
  const text=Array.from(bytes.subarray(0,10),b=>alphabet[b&31]).join('');
  return text.slice(0,5)+'-'+text.slice(5);
}
