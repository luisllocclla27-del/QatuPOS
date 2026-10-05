import { spawn } from 'node:child_process';
// Dedicated local output protects the running laboratory; Vercel itself uses .next.
const runner=process.env.npm_execpath;
if(!runner)throw new Error('Run through pnpm build:cloud.');
const native=runner.endsWith('.exe');
const child=spawn(native?runner:process.execPath,[...(native?[]:[runner]),'--filter','@qatu/pos','build'],{stdio:'inherit',env:{...process.env,QATU_DEPLOYMENT:'vercel',QATU_CLOUD_DIST_DIR:'.next-cloud'}});
child.on('error',()=>{console.error('Cloud build could not start.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
