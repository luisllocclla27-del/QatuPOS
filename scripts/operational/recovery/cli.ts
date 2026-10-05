import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createBackup, verifyRestore, RecoveryError } from './archive.js';
// Explicit production opt-in; never silently replace an interactive laboratory configuration.
if(process.env.QATU_ENV==='production'&&existsSync('.env.operational'))process.loadEnvFile('.env.operational');
const required=(name:string)=>{const value=process.env[name];if(!value)throw new RecoveryError('MISSING_'+name);return value;};
try{
  const mode=process.argv[2],options={backupFile:required('QATU_BACKUP_FILE'),keyFile:required('QATU_BACKUP_KEY_FILE'),binDir:process.env.QATU_PG_BIN_DIR};
  const result=mode==='backup'?await createBackup({...options,sourceUrl:required('DATABASE_URL'),guestKeyFile:process.env.QATU_GUEST_KEY_FILE??fileURLToPath(new URL(process.env.QATU_ENV==='production'?'../../../.runtime/operational/guest-code.key':'../../../.runtime/guest-code.key',import.meta.url))}):mode==='restore-verify'?await verifyRestore({...options,targetUrl:required('QATU_RESTORE_DATABASE_URL')}):(()=>{throw new RecoveryError('EXPECTED_BACKUP_OR_RESTORE_VERIFY');})();
  console.log(JSON.stringify(result));
}catch(error){console.error(JSON.stringify({error:error instanceof RecoveryError?error.code:'RECOVERY_FAILED',message:'La operación de respaldo/ensayo no se completó. Conserva los datos; revisa configuración, permisos, claves y evidencia sin publicar secretos.'}));process.exitCode=1;}
