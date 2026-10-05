import pg from 'pg';
type Callback=(err:Error|undefined,client:pg.PoolClient|undefined,done:(release?:unknown)=>void)=>void;
/** Session/direct pool only. Await initialization rather than trust pooler startup options. */
export class CloudPool extends pg.Pool {
  private initialized=new WeakSet<pg.PoolClient>();
  private async initialize(client:pg.PoolClient) {
    if(this.initialized.has(client))return;
    await client.query("SET search_path TO qatupos,pg_catalog; SET statement_timeout TO '20s'; SET lock_timeout TO '5s'; SET idle_in_transaction_session_timeout TO '15s'");
    this.initialized.add(client);
  }
  override connect():Promise<pg.PoolClient>;
  override connect(callback:Callback):void;
  override connect(callback?:Callback):Promise<pg.PoolClient>|void {
    if(callback) {
      super.connect((error,client,done)=>{
        if(error||!client){callback(error??new Error('Missing database client.'),client,done);return;}
        void this.initialize(client).then(()=>callback(undefined,client,done),error=>{done(error);callback(error,undefined,()=>{});});
      });
      return;
    }
    return super.connect().then(async client=>{try{await this.initialize(client);return client;}catch(error){client.release(error as Error);throw error;}});
  }
}
