import json,hashlib,re
from pathlib import Path
root=Path.cwd();run=root/'docs/construction/runs/2026-10-02-auditoria-correcciones'
def repair(x):
 if isinstance(x,dict):return {k:repair(v) for k,v in x.items()}
 if isinstance(x,list):return [repair(v) for v in x]
 if isinstance(x,str) and any(c in x for c in ['Ã','Â','â']):
  for encoding in ['cp1252','latin1']:
   try:return x.encode(encoding).decode('utf-8')
   except (UnicodeError,ValueError):pass
 return x
for name in ['work-order.json','implementation.json']:
 p=run/name;order=repair(json.loads(p.read_text(encoding='utf-8-sig')))
 order['state']='ready_for_review';order['version']=2
 order['requirements']=['MAR-FR-001','MAR-FR-007','MAR-FR-008','MAR-FR-009','MAR-FR-017','MAR-FR-018','MAR-FR-019']
 order['acceptance']=['MAR-AT-001','MAR-AT-007','MAR-AT-008','MAR-AT-009','MAR-AT-017','MAR-AT-018','MAR-AT-019']
 p.write_text(json.dumps(order,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for path in [root/'docs/evidence/ACTUALIZACION-2026-10-02-auditoria.md',root/'docs/evidence/CONTINUIDAD.md']:
 s=path.read_text(encoding='utf-8')
 for old,new in [('iniciada02/10','iniciada 02/10'),('finalizada03/10','finalizada 03/10'),('Actualizado03/10','Actualizado 03/10'),('de8archivos','de 8 archivos'),('y11 recorridos','y 11 recorridos'),('incluyendo28','incluyendo 28'),('Las28 pruebas','Las 28 pruebas'),('aproximadamente81%','aproximadamente 81%'),('de5horas','de 5 horas'),('saldo adicional0','saldo adicional 0'),('del12%','del 12%'),('sistema100%','sistema 100%'),('dominio006','dominio 006'),('incrementos006','incrementos 006'),('código nuevo','código nuevo')]:
  s=s.replace(old,new)
 path.write_text(s,encoding='utf-8')
p=root/'specs/011-integridad-comercial/tasks.md';s=p.read_text(encoding='utf-8')
for task in ['MAR:T031','MAR:T036','MAR:T037']:
 s=s.replace('- [ ] '+task,'- [x] '+task)
s+='\nImplementación MAR:T032–035 terminada y probada; checks pendientes hasta revisión independiente, conforme AGENTS. MAR:T038 sigue pendiente. Resultado y hashes en delivery.json; ninguna tarea integral del padre se marca terminada.\n'
p.write_text(s,encoding='utf-8')
manifest={'execution_id':'e90ed63f-0e0b-4803-8b7e-65b14b6cdd09','state':'ready_for_review','authorization':'Usuario pidió analizar avances, corregir, continuar desarrollo y actualizar archivos; 02/10/2026','scope':'Correctivo011 de integridad comercial y simulación fiscal honesta','orders':['docs/construction/runs/2026-10-02-auditoria-correcciones/implementation.json'],'previous_execution':'c194a11f-508b-4a52-b883-9972834d8ef1','previous_delivery':'docs/construction/runs/2026-10-02-notas-credito/delivery.json','previous_writer_ended_evidence':'Entrega010 presente con hashes concordantes y test previo finalizado; no nueva asignación durante prueba activa inicial.','workspace_root':str(root),'planning_root':str(root.parent),'restaurant':'El Encanto Huamanguino','acceptance_scope':'Implemented/tested synthetic laboratory; independent financial acceptance pending','evidence':'docs/evidence/ACTUALIZACION-2026-10-02-auditoria.md'}
(root/'docs/construction/current-run.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Current run and provisional technical tasks updated; financial acceptance remains pending.')
