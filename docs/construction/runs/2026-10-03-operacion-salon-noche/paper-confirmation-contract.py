from pathlib import Path
import json
from openapi_spec_validator import validate
r = Path(__file__).resolve().parents[4]
p = r / 'docs/contracts/pilot.openapi.json'; doc = json.loads(p.read_text(encoding='utf-8')); s = doc['components']['schemas']
props = dict(s['LinePrepareCommand']['properties']); props['type'] = {'type': 'string', 'const': 'line.ready.confirm'}; props['reason'] = {'type': 'string', 'minLength': 3, 'maxLength': 500}
s['LineReadyConfirmCommand'] = {'type': 'object', 'additionalProperties': False, 'properties': props, 'required': list(props), 'x-allowed-roles': ['waiter', 'cashier', 'admin'], 'description': 'Staff records explicit station confirmation of prepared quantity when station uses paper only. Audit actor and reason; never infer from print acknowledgement or payment. Same prepared quantity invariant as kitchen preparation.'}
s['PosCommand']['oneOf'].append({'$ref': '#/components/schemas/LineReadyConfirmCommand'});s['PosCommand']['discriminator']['mapping']['line.ready.confirm'] = '#/components/schemas/LineReadyConfirmCommand'; validate(doc);p.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p = r / 'packages/contracts/src/pos.ts'; t = p.read_text(encoding='utf-8');t=t.replace('export type PosCommand = ', "export interface LineReadyConfirmCommand extends CommandBase { type: 'line.ready.confirm'; line_id: UUID; expected_version: number; quantity: number; reason: string }\nexport type PosCommand = LineReadyConfirmCommand | ");p.write_text(t,encoding='utf-8')
for f in ['spec.md', 'plan.md', 'contracts/changes.md']:
 p=r/'specs/014-operacion-salon-noche'/f;t=p.read_text(encoding='utf-8');t+='\nEstación solo papel: line.ready.confirm {line_id,expected_version,quantity,reason} permite a waiter/cashier/admin registrar confirmación explícita de Cocina/Heladería, con actor/motivo auditados y cantidad pendiente validada. Nunca aplica Caja ni infiere preparación desde impresión/pago. UI solicita motivo; retirar/entregar siguen separados. Extiende OPS-FR/AT-004 y MAR:T063.\n';p.write_text(t,encoding='utf-8')
print('Paper-only station confirmation contract validated before implementation')
