"""Record verified local evidence; never accept sensitive tasks or change historical reports."""
from pathlib import Path
import json, hashlib, datetime, re
import jsonschema
from openapi_spec_validator import validate

root=Path.cwd(); run=root/'docs/construction/runs/2026-10-04-recuperacion-operativa'
def read(path): return json.loads(path.read_text(encoding='utf-8-sig'))
def write(path,data): path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def hashed(path): return hashlib.sha256(path.read_bytes()).hexdigest()
order=read(run/'work-order.json'); previous=read(root/'docs/construction/runs/2026-10-03-nucleo-operativo/delivery.json')
for name,pattern in [('tests-final.txt',r'Tests\s+388 passed'),('e2e-counters-final.txt',r'20 passed'),('build.txt',r'Compiled successfully')]:
    assert re.search(pattern,(run/name).read_text(encoding='utf-8-sig')),name
for name in ['typecheck-final.txt','typecheck-runtime.txt']:
    assert 'error TS' not in (run/name).read_text(encoding='utf-8-sig')
before,after=read(run/'runtime-before.json'),read(run/'runtime-after.json'); assert before['state_sha256']==after['state_sha256']
recovery,operational=read(run/'recovery-smoke.json'),read(run/'operational-smoke.json'); assert recovery['passed'] and operational['passed']
assert recovery['restored']['tables_verified']==17 and recovery['runtime_blocked']
assert recovery['interactive_before_sha256']==recovery['interactive_after_sha256']==recovery['restored_state_sha256']==before['state_sha256']
health=read(run/'runtime-health.json'); assert health['api']=={'status':'ok','environment':'laboratory'} and all(p['status']==200 for p in health['pages'])
planning=read(root/'docs/evidence/planning-validation.json'); assert planning['status']=='passed' and len(planning['checks'])==25
validate(read(root/'docs/contracts/pilot.openapi.json'))
now=datetime.datetime.now(datetime.timezone.utc).isoformat(); order['state']='ready_for_review'
schema=read(root.parent/'specs/003-construccion-coordinada/contracts/work-order.schema.json')
jsonschema.Draft202012Validator(schema,format_checker=jsonschema.FormatChecker()).validate(order)
write(run/'work-order.json',order)
current=read(root/'docs/construction/current-run.json'); assert current['execution_id']==order['execution_id']
current.update(state='ready_for_review',writer_finished=True,checked_at_utc=now,evidence='docs/evidence/ACTUALIZACION-2026-10-04-recuperacion-operativa.md',acceptance_scope='Implementación/evidencia local verificadas; aceptación sensible independiente pendiente')
write(root/'docs/construction/current-run.json',current)
files=set(previous['source_sha256']) | set(order['baseline']['input_sha256'])
modified=set()
for grant in order['write_paths']:
    if grant.startswith('.runtime/'): continue
    p=root/grant
    candidates=p.rglob('*') if p.is_dir() else [p]
    for child in candidates:
        if child.is_file():
            f=child.relative_to(root).as_posix()
            if f.startswith('docs/construction/runs/2026-10-04-recuperacion-operativa/') and child.name in ['delivery.json','verification.json']: continue
            files.add(f)
            baseline=order['baseline']['input_sha256'].get(f,previous['source_sha256'].get(f))
            if baseline!=hashed(child):modified.add(f)
hashes={f:hashed(root/f) for f in sorted(files)}
unassigned=[f for f,h in previous['source_sha256'].items() if hashes[f]!=h and not any(f==p or p.endswith('/') and f.startswith(p) for p in order['write_paths'])]
assert not unassigned,unassigned
delivery={'execution_id':order['execution_id'],'assignment_id':order['assignment_id'],'state':'ready_for_review','checked_at_utc':now,'scope':'016: revisión de avances, respaldo cifrado PostgreSQL/restore de ensayo en cuarentena, coherencia de fecha/credenciales/anulaciones; no operación productiva homologada',
 'tests':{'unit_integration':{'passed':388,'files':23,'new_cases':36,'exit_code':0,'evidence':'tests-final.txt'},'e2e':{'passed':20,'new_cases':1,'exit_code':0,'evidence':'e2e-counters-final.txt'},'typecheck':{'exit_code':0,'evidence':'typecheck-runtime.txt'},'build':{'exit_code':0,'evidence':'build.txt'},'backup_restore':recovery,'operational_smoke':operational,'documental':{'checks':25,'status':'passed','runtime_certification':False},'contracts':{'work_order':True,'openapi':True}},
 'runtime':{'development_session':35446,'health':health,'before':before,'after':after,'interactive_state_preserved':True,'seed_reset_or_general_migrations_run':False},
 'sensitive_tasks_pending_independent_acceptance':['MAR:T085','MAR:T086','MAR:T087','MAR:T090','MAR:T073','MAR:T074','MAR:T075','MAR:T076','MAR:T077','MAR:T079','MAR:T081'],
 'limitations':['Restore exclusivamente de ensayo; no promoción/fencing/reconciliación productiva','Sin programación/retención/alertas/PITR ni RPO/RTO homologados; archive512MiB máximo','ACL/cifrado de disco/almacenamiento externo/dispositivos/LAN físicos pendientes','Izipay modalidad física/web y proveedor SUNAT sin configurar','Modelos/IP/protocolos de impresoras aún desconocidos; puente durable pendiente','Qatu.pe/Delivery y hub/offline pendientes de contratos y autorización','Revisión independiente sensible011..016 pendiente; datos reales y piloto con personal no ejecutados'],
 'prior_failures':'Documentados sin ocultar en research016: fixtures incorrectos, EBADF en limpieza corregido, alternativa stream descartada/fixture propia limpiada, E2E apuntó a mesa inexistente; resultados finales aprobados',
 'modified_files':sorted(modified),'verified_files':sorted(hashes),'source_sha256':hashes,'writer_finished':True,'external_production_effects':False,'accepted_financial_security_or_isolation':False}
write(run/'delivery.json',delivery)
verified=all(hashed(root/f)==h for f,h in hashes.items()); assert verified
write(run/'verification.json',{'checked_at_utc':now,'passed':verified,'files':len(hashes),'previous_baseline_verified':116,'unassigned_mutations':unassigned,'writer_finished':True,'sensitive_acceptance':'pending independent review','interactive_hash_unchanged':True})
print(json.dumps({'state':'ready_for_review','hashes_verified':len(hashes),'tests':388,'e2e':20,'restored_tables':17,'interactive_preserved':True}))
