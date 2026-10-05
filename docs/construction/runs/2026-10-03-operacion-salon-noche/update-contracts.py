from pathlib import Path
from copy import deepcopy
import json
from openapi_spec_validator import validate
root = Path(__file__).resolve().parents[4]
path = root / 'docs/contracts/pilot.openapi.json'
doc = json.loads(path.read_text(encoding='utf-8'))
s = doc['components']['schemas']
uuid = {'type': 'string', 'format': 'uuid'}
text = {'type': 'string', 'maxLength': 200}
version = {'type': 'integer', 'minimum': 1, 'maximum': 9007199254740991}
priority = {'type': 'string', 'enum': ['normal', 'urgent']}
mode = {'type': 'string', 'enum': ['full_service', 'beverages_only']}
def obj(props, required=None):
    return {'type': 'object', 'additionalProperties': False, 'properties': props, 'required': list(props) if required is None else required}
def add(name, props):
    s[name]['properties'].update(props)
add('TableVisit', {'responsible_waiter_id': uuid, 'responsible_waiter_name': text})
add('Order', {'service_sequence': version, 'priority': priority, 'priority_reason': {'type': 'string', 'maxLength': 500}, 'production_version': version, 'responsible_name': text})
s['DispatchClaim'] = obj({'actor_id': uuid, 'actor_name': text, 'quantity': version, 'claimed_at': {'type': 'string', 'format': 'date-time'}})
add('OrderLine', {'dispatch_claim': {'anyOf': [{'$ref': '#/components/schemas/DispatchClaim'}, {'type': 'null'}]}, 'prepared_at': {'type': 'string', 'format': 'date-time'}, 'delivered_at': {'type': 'string', 'format': 'date-time'}})
for name in ['StockItem', 'ProjectedStockItem']:
    if name in s:
        add(name, {'beverage_kind': {'type': 'string', 'enum': ['beer', 'soda', 'water']}})
add('PrintJob', {'kind': {'type': 'string', 'enum': ['order', 'void', 'priority']}, 'table_label': text, 'batch_number': version, 'service_sequence': version, 'responsible_name': text, 'priority': priority})
count_props = deepcopy(s['DayCloseCommand']['properties'])
count_props.pop('type'); count_props.pop('operation_id')
s['CashCloseApproval'] = obj({
    'id': uuid, 'cash_session_id': uuid, 'business_day_id': uuid, 'cash_version': version, 'day_version': version, 'seal_state_version': version,
    'counted_cash_minor': count_props['counted_cash_minor'], 'stock_counts': count_props['stock_counts'], 'actor_id': uuid,
    'reason': {'type': 'string', 'minLength': 3, 'maxLength': 500}, 'created_at': {'type': 'string', 'format': 'date-time'},
})
add('PosSnapshot', {'service_mode': mode, 'available_product_ids': {'type': 'array', 'items': uuid, 'maxItems': 10000}, 'cash_close_approvals': {'type': 'array', 'items': {'$ref': '#/components/schemas/CashCloseApproval'}, 'maxItems': 10000}})
add('GuestSnapshot', {'service_mode': mode})
add('DayClose', {'operational_status': {'type': 'string', 'enum': ['pending', 'reconciled']}, 'close_mode': {'type': 'string', 'enum': ['provisional', 'operational_final']}, 'cash_approval_id': {'anyOf': [uuid, {'type': 'null'}]}})
add('DayCloseCommand', {'mode': {'type': 'string', 'enum': ['provisional', 'operational_final']}, 'approval_id': uuid})
s['DayCloseCommand']['description'] += ' Optional operational_final is only for owned open nocturnal cash: no balances/delivery/reservations/unknown/counts, physical stock equals book; cash variance requires independent sealed approval. Overall fiscal state remains provisional. Provisional cannot revise a previously final operational close.'
commands = {
    'TableAssignCommand': ('table.assign', {'visit_id': uuid, 'expected_version': version, 'waiter_id': uuid, 'reason': {'type': 'string', 'minLength': 3, 'maxLength': 500}}, ['waiter', 'admin']),
    'OrderPriorityCommand': ('order.priority', {'order_id': uuid, 'expected_version': version, 'priority': priority, 'reason': {'type': 'string', 'minLength': 3, 'maxLength': 500}}, ['waiter', 'admin']),
    'LineClaimCommand': ('line.claim', {'line_id': uuid, 'expected_version': version, 'action': {'type': 'string', 'enum': ['claim', 'release']}, 'quantity': version, 'reason': {'type': 'string', 'minLength': 3, 'maxLength': 500}}, ['waiter', 'cashier', 'admin']),
    'CashCloseApproveCommand': ('cash.close.approve', count_props, ['admin']),
}
for name, (kind, props, roles) in commands.items():
    props = {'operation_id': uuid, 'type': {'type': 'string', 'const': kind}, **props}
    required = [k for k in props if not (name == 'LineClaimCommand' and k == 'quantity')]
    s[name] = obj(props, required); s[name]['x-allowed-roles'] = roles
    if name == 'LineClaimCommand':
        s[name]['allOf'] = [{'if': {'properties': {'action': {'const': 'claim'}}}, 'then': {'required': ['quantity']}}]
    s['PosCommand']['oneOf'].append({'$ref': '#/components/schemas/' + name})
    s['PosCommand']['discriminator']['mapping'][kind] = '#/components/schemas/' + name
codes = ['SERVICE_MODE_RESTRICTED', 'DISPATCH_CLAIMED', 'OPERATIONAL_CLOSE_BLOCKED']
def enums(value):
    if isinstance(value, dict):
        if isinstance(value.get('enum'), list) and 'STOCK_RESERVATIONS_EXCEED_COUNT' in value['enum']:
            value['enum'].extend(codes)
        for nested in value.values(): enums(nested)
    elif isinstance(value, list):
        for nested in value: enums(nested)
enums(doc)
validate(doc)
path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

p = root / 'packages/contracts/src/pos.ts'
t = p.read_text(encoding='utf-8')
def replace(old, new):
    global t
    assert t.count(old) == 1, old
    t = t.replace(old, new)
replace("closed_at: string | null }\nexport interface GuestAccess", "closed_at: string | null; responsible_waiter_id?: UUID; responsible_waiter_name?: string }\nexport interface GuestAccess")
replace('export interface GuestSnapshot { visit_id:', "export type ServiceMode = 'full_service' | 'beverages_only';\nexport interface DispatchClaim { actor_id: UUID; actor_name: string; quantity: number; claimed_at: string }\nexport interface GuestSnapshot { service_mode?: ServiceMode; visit_id:")
replace('export interface OrderLine { id:', 'export interface OrderLine { dispatch_claim?: DispatchClaim | null; prepared_at?: string; delivered_at?: string; id:')
replace('export interface Order { id:', "export interface Order { service_sequence?: number; priority?: 'normal' | 'urgent'; priority_reason?: string; production_version?: number; responsible_name?: string; id:")
replace("export interface StockItem { id:", "export interface StockItem { beverage_kind?: 'beer' | 'soda' | 'water'; id:")
replace('export interface PrintJob { id:', "export interface PrintJob { kind?: 'order' | 'void' | 'priority'; table_label?: string; batch_number?: number; service_sequence?: number; responsible_name?: string; priority?: 'normal' | 'urgent'; id:")
replace('export interface DayClose { id:', "export interface DayClose { operational_status?: 'pending' | 'reconciled'; close_mode?: 'provisional' | 'operational_final'; cash_approval_id?: UUID | null; id:")
replace('export interface PosSnapshot {', "export interface CashCloseApproval { id: UUID; cash_session_id: UUID; business_day_id: UUID; cash_version: number; day_version: number; seal_state_version: number; counted_cash_minor: MoneyMinor; stock_counts: { stock_item_id: UUID; counted_quantity: number }[]; actor_id: UUID; reason: string; created_at: string }\nexport interface PosSnapshot {\n  service_mode?: ServiceMode; available_product_ids?: UUID[]; cash_close_approvals?: CashCloseApproval[];")
replace("export interface DayCloseCommand extends CommandBase { type: 'day.close';", "export interface DayCloseCommand extends CommandBase { type: 'day.close'; mode?: 'provisional' | 'operational_final'; approval_id?: UUID;")
replace('export type PosCommand = ', "export interface TableAssignCommand extends CommandBase { type: 'table.assign'; visit_id: UUID; expected_version: number; waiter_id: UUID; reason: string }\nexport interface OrderPriorityCommand extends CommandBase { type: 'order.priority'; order_id: UUID; expected_version: number; priority: 'normal' | 'urgent'; reason: string }\nexport interface LineClaimCommand extends CommandBase { type: 'line.claim'; line_id: UUID; expected_version: number; action: 'claim' | 'release'; quantity?: number; reason: string }\nexport interface CashCloseApproveCommand extends CommandBase { type: 'cash.close.approve'; cash_session_id: UUID; expected_version: number; expected_day_version: number; counted_cash_minor: MoneyMinor; stock_counts: { stock_item_id: UUID; counted_quantity: number }[]; reason: string }\nexport type PosCommand = TableAssignCommand | OrderPriorityCommand | LineClaimCommand | CashCloseApproveCommand | ")
replace("export type PosErrorCode = ", "export type PosErrorCode = 'SERVICE_MODE_RESTRICTED' | 'DISPATCH_CLAIMED' | 'OPERATIONAL_CLOSE_BLOCKED' | ")
p.write_text(t, encoding='utf-8')
print('OpenAPI strictly valid and TypeScript contract updated before runtime')
