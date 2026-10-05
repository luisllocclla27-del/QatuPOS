import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
/** Reserve before verification; failures retain budget, success refunds only its own slot. */
export async function consumeSecurityAttempt(pool:Pool, scope:'staff-login'|'guest-login'|'staff-reauth', identifier:string, limit:number) {
  const hash=createHash('sha256').update(scope+'\0'+identifier).digest('hex');
  const result=await pool.query(`INSERT INTO security_attempts(scope,key_hash,window_started_at,attempts)
    VALUES($1,$2,statement_timestamp(),1)
    ON CONFLICT(scope,key_hash) DO UPDATE SET
      attempts=CASE WHEN security_attempts.window_started_at <= statement_timestamp()-interval '60 seconds' THEN 1 ELSE security_attempts.attempts+1 END,
      window_started_at=CASE WHEN security_attempts.window_started_at <= statement_timestamp()-interval '60 seconds' THEN statement_timestamp() ELSE security_attempts.window_started_at END
    WHERE security_attempts.window_started_at <= statement_timestamp()-interval '60 seconds' OR security_attempts.attempts<$3
    RETURNING window_started_at::text AS window_token`,[scope,hash,limit]);
  if(result.rows[0])return {allowed:true,retry_after:0,scope,key_hash:hash,window_token:result.rows[0].window_token as string};
  const row=(await pool.query("SELECT GREATEST(1,CEIL(EXTRACT(EPOCH FROM window_started_at+interval '60 seconds'-statement_timestamp())))::integer AS retry_after FROM security_attempts WHERE scope=$1 AND key_hash=$2",[scope,hash])).rows[0];
  return {allowed:false,retry_after:row?.retry_after??60,scope,key_hash:hash,window_token:undefined};
}
export async function refundSecurityAttempt(pool:Pool,reservation:Awaited<ReturnType<typeof consumeSecurityAttempt>>) {
  if(!reservation.allowed || !reservation.window_token)return;
  await pool.query('UPDATE security_attempts SET attempts=GREATEST(0,attempts-1) WHERE scope=$1 AND key_hash=$2 AND window_started_at=$3::timestamptz',[reservation.scope,reservation.key_hash,reservation.window_token]);
}
/** Never replace a committed operation response with a failed auxiliary refund. */
export async function refundCommittedAttempt(pool:Pool,reservation:Awaited<ReturnType<typeof consumeSecurityAttempt>>|undefined) {
  if(!reservation)return;
  try{await refundSecurityAttempt(pool,reservation);}catch{console.error('SECURITY_BUDGET_REFUND_UNAVAILABLE');}
}
