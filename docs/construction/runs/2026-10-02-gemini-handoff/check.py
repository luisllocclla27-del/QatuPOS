import json, hashlib
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
root=Path.cwd()
order=json.loads((root/'docs/construction/runs/2026-10-02-gemini-handoff/specification.json').read_text(encoding='utf-8'))
schema=json.loads((root.parent/'specs/003-construccion-coordinada/contracts/work-order.schema.json').read_text(encoding='utf-8'))
Draft202012Validator(schema,format_checker=FormatChecker()).validate(order)
for path, expected in order['baseline']['input_sha256'].items():
    assert hashlib.sha256((root/path).read_bytes()).hexdigest()==expected,path
required=['AGENTS.md','../AGENTS.md','../docs/SDD.md','../.specify/memory/constitution.md','../docs/09-construccion-multiagente.md','../docs/10-base-tecnica-y-layout.md','../docs/12-piloto-marisqueria.md','../specs/004-piloto-marisqueria','../specs/001-mesas-qr-nfc','../specs/002-facturacion-peru','specs/005-clave-mesa/spec.md','specs/005-clave-mesa/plan.md','specs/005-clave-mesa/tasks.md','docs/evidence/CONTINUIDAD.md','docs/construction/next-increments.md','docs/contracts/pilot.openapi.json','packages/contracts/src/pos.ts','docs/evidence/guest-orders-delivery.md','docs/evidence/guest-orders-review.md','docs/construction/runs/2026-10-02-guest-orders/delivery.json']
for path in required:
    assert (root/path).exists(),path
spec=(root/'docs/handoff/especificaciones-gemini.md').read_text(encoding='utf-8')
prompt=(root/'docs/handoff/prompt-gemini-antigravity.md').read_text(encoding='utf-8')
for n in range(1,17):
    assert f'CAT-FR-{n:03}' in spec,n
for text in ['Pedidos bloqueados','unknown','Cocina','Heladería','Caja','MAR:T004']:
    assert text in spec,text
for text in ['pnpm typecheck','pnpm test','pnpm test:e2e','pnpm build','pnpm validate:sdd','ready_for_review','CONTINUIDAD.md','S/35','S/38']:
    assert text in prompt,text
outputs={path:hashlib.sha256((root/path).read_bytes()).hexdigest() for path in ['docs/handoff/especificaciones-gemini.md','docs/handoff/prompt-gemini-antigravity.md']}
print(json.dumps({'work_order':'valid','unchanged_baseline_hashes':len(order['baseline']['input_sha256']),'existing_required_paths':len(required),'proposed_requirements':16,'output_sha256':outputs},ensure_ascii=False))
