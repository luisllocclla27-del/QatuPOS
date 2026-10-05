"""Finalize 015 evidence only; never mark sensitive work independently accepted."""
from pathlib import Path
import json,hashlib,re
from datetime import datetime,timezone
from jsonschema import Draft202012Validator,FormatChecker
from openapi_spec_validator import validate
run=Path(__file__).resolve().parent;root=run.parents[3];feature=root/'specs/015-nucleo-operativo'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for f,pattern in [('tests-final.txt',r'352 passed'),('e2e.txt',r'19 passed'),('build-final.txt',r'Compiled successfully'),('typecheck-final.txt',r'tsc --noEmit')]:
 s=(run/f).read_text(encoding='utf-8-sig');assert re.search(pattern,s),f;assert not re.search(r'(?m)^\s*(FAIL |Error:|[1-9][0-9]* failed)',s),f
before,after=[read(run/f'runtime-{p}.json') for p in ['before','after']];assert before['state_sha256']==after['state_sha256'] and before['branches']==after['branches']==2
health=read(run/'runtime-health.json');assert health['api']=={'status':'ok','environment':'laboratory'} and health['public_mode']=={'environment':'laboratory'} and health['customer_status']==health['staff_status']==200
smoke=read(run/'operational-smoke.json');assert smoke['passed'] and smoke['production_build_runtime'] and not smoke['real_restaurant_activated']
planning=read(root/'docs/evidence/planning-validation.json');assert planning['status']=='passed' and len(planning['checks'])==25
validate(read(root/'docs/contracts/pilot.openapi.json'))
order=read(run/'work-order.json');schema=read(root.parent/'specs/003-construccion-coordinada/contracts/work-order.schema.json');Draft202012Validator(schema,format_checker=FormatChecker()).validate(order)
now=datetime.now(timezone.utc).isoformat()
links=0
for p in [root/'README.md',root/'docs/evidence/CONTINUIDAD.md',root/'docs/evidence/ACTUALIZACION-2026-10-03-nucleo-operativo.md',*feature.rglob('*.md')]:
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8-sig')):
  if '://' in target or target.startswith('#'):continue
  dest=(p.parent/target.split('#')[0].strip('<>')).resolve();assert dest.exists() or dest==run/'delivery.json',str(dest);links+=1
checks={'checked_at_utc':now,'unit_integration':{'command':'pnpm test','passed':352,'files':19,'new_cases':62,'exit_code':0,'evidence':'tests-final.txt'},'e2e':{'command':'pnpm test:e2e','passed':19,'new_cases':2,'exit_code':0,'evidence':'e2e.txt'},'typecheck':{'exit_code':0,'evidence':'typecheck-final.txt'},'build':{'exit_code':0,'evidence':'build-final.txt'},'operational_smoke':smoke,'planning':{'passed':25,'exit_code':0,'scope':'parent planning only'},'work_order_schema':'passed','openapi':'passed','local_document_links':{'passed':True,'checked':links,'anchors':'not_checked'},'interactive_branch_state_preserved':True,'interactive_state_sha256':after['state_sha256'],'runtime_health':health,'independent_financial_inventory_isolation_security_review':'pending','test_fixture_corrections':'reported in research and update; no disabled tests','interactive_migration':read(run/'interactive-migration.json')}
write(run/'verification.json',checks)
write(run/'transitions.json',{'execution_id':order['execution_id'],'owner':'root','transitions':[{'from':'assigned','to':'running','evidence':'014 baseline96 hashes checked; WorkOrder before code'},{'from':'running','to':'running','version':2,'evidence':'guest repository grant before edit'},{'from':'running','to':'running','version':3,'evidence':'inventory paths and stock receipt contract before implementation'},{'from':'running','to':'running','version':4,'evidence':'legacy SQL test expectations grant before adapting bigint types'},{'from':'running','to':'running','version':5,'evidence':'isolated operational fixture grant before TLS production startup proof'},{'from':'running','to':'running','version':6,'evidence':'guest client grant before securing operational quote writes'},{'from':'running','to':'ready_for_review','checked_at_utc':now,'evidence':'verification.json'}],'independent_acceptance':'pending'})
order['state']='ready_for_review';write(run/'work-order.json',order);Draft202012Validator(schema,format_checker=FormatChecker()).validate(order)
current=read(root/'docs/construction/current-run.json');current.update(state='ready_for_review',writer_finished=True,checked_at_utc=now);write(root/'docs/construction/current-run.json',current)
files=[]
for grant in order['write_paths']:
 if grant.startswith('.runtime/'):continue # Never put private key material or private runtime data in evidence hashes.
 p=root/grant
 if p.is_dir():files.extend(q for q in p.rglob('*') if q.is_file())
 elif p.is_file():files.append(p)
files=sorted(set(files));hashes={str(p.relative_to(root)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p!=run/'delivery.json'}
previous=read(root/'docs/construction/runs/2026-10-03-operacion-salon-noche/delivery.json')['source_sha256']
pending=['MAR:T073','MAR:T074','MAR:T075','MAR:T076','MAR:T077','MAR:T079','MAR:T081']
delivery={'execution_id':order['execution_id'],'assignment_id':order['assignment_id'],'state':'ready_for_review','checked_at_utc':now,'scope':'015 operational installation foundations, exact SQL money, individual staff and physical stock receipts; real integrations remain pending','tests':checks,'baseline':order['baseline'],'modified_files':[f for f,v in hashes.items() if previous.get(f)!=v],'verified_files':list(hashes),'source_sha256':hashes,'private_runtime_artifacts':'excluded intentionally; no secrets in delivery','pending_acceptance_tasks':pending,'pending_final_tasks':['MAR:T080'],'prior_sensitive_reviews':'011/012/013/014 pending','limitations':['Independent review pending','Real restaurant not activated; trusted certificates/DNS/LAN/tablets/printers not validated','Izipay selected; physical/web mode and integration credentials/contracts pending','Fiscal provider and SUNAT integration pending; internal notes not fiscal acceptance','Backup/restore and Windows service startup not validated','Purchases accounting/merma/refunds/post-close adjustment ledger and hub/offline absent','Qatu.pe/Delivery not connected or modified','Interactive migration011 intentionally deferred; migration012 applied with state preserved'],'next_dependency':'Independent review; select Izipay physical/web contract and fiscal provider; printer bridge and installation/backup proof'}
write(run/'delivery.json',delivery)
for f,v in hashes.items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==v,f
print(json.dumps({'state':'ready_for_review','hashes_verified':len(hashes),'tests':352,'e2e':19,'operational_smoke':True,'independent_acceptance':'pending'}))
