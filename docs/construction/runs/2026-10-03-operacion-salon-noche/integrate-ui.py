from pathlib import Path
root = Path(__file__).resolve().parents[4]
p = root / 'apps/pos/src/components/pos-app.tsx'
t = p.read_text(encoding='utf-8')
t = t.replace("import InventoryPanel from './inventory-panel';", "import InventoryPanel from './inventory-panel';\nimport ProductionPanel from './production-panel';\nimport NightClosePanel from './night-close-panel';")
t = t.replace("snapshot.products.filter(p => p.active && (category === 'Todo'", "snapshot.products.filter(p => p.active && (!snapshot.available_product_ids || snapshot.available_product_ids.includes(p.id)) && (category === 'Todo'")
t = t.replace("snapshot.products.filter(p => p.active).map(p => p.category)", "snapshot.products.filter(p => p.active && (!snapshot.available_product_ids || snapshot.available_product_ids.includes(p.id))).map(p => p.category)")
lines = t.splitlines()
for i, line in enumerate(lines):
    if "{(screen === 'bebidas' || screen === 'estaciones')" in line:
        lines[i] = "    {(screen === 'bebidas' || screen === 'estaciones') && <ProductionPanel snapshot={snapshot} station={screen === 'bebidas' ? 'caja' : station} onStation={screen === 'estaciones' && !isKitchen ? setStation : undefined} disabled={disabled} onAction={execute} />}"
    if "{screen === 'dia' && <>" in line:
        lines[i] = line.replace("{screen === 'dia' && <>", "{screen === 'dia' && <><NightClosePanel snapshot={snapshot} disabled={disabled} onAction={execute} />")
        lines[i] = lines[i].replace("{latestClose.state === 'reconciled' ? 'Conciliado' : 'Provisional · con pendientes'}", "{latestClose.operational_status === 'reconciled' ? 'Caja y bebidas conciliadas · fiscal pendiente' : latestClose.state === 'reconciled' ? 'Conciliado' : 'Provisional · con pendientes'}")
    if "{screen === 'mesas' && table && visit && session.user.role === 'waiter'" in line:
        lines[i] = line + "\n    {screen === 'mesas' && table && visit && <section className=\"panel\"><div className=\"panel-heading\"><div><span className=\"eyebrow\">RESPONSABLE DE LA ATENCIÓN</span><strong>{visit.responsible_waiter_name ?? 'Sin mozo asignado'}</strong></div>{session.user.role === 'waiter' && !visit.responsible_waiter_id && <button className=\"secondary\" disabled={disabled} onClick={() => void execute({ type: 'table.assign', visit_id: visit.id, expected_version: visit.version, waiter_id: session.user.id, reason: 'Mozo asume la atención de esta mesa' }, 'Atención asignada a tu nombre.')}>Tomar atención de mesa</button>}</div>{isAdmin && <div className=\"inline-form\"><label className=\"field\"><span>Reasignar responsable</span><select value={form.assignedWaiter ?? ''} onChange={e => update('assignedWaiter', e.target.value)}><option value=\"\">Seleccionar mozo</option>{snapshot.staff.filter(s => s.role === 'waiter').map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label className=\"field\"><span>Motivo de reasignación</span><input value={form.assignmentReason ?? ''} onChange={e => update('assignmentReason', e.target.value)} /></label><button className=\"secondary\" disabled={disabled || !form.assignedWaiter || (form.assignmentReason?.trim().length ?? 0) < 3} onClick={() => void execute({ type: 'table.assign', visit_id: visit.id, expected_version: visit.version, waiter_id: form.assignedWaiter!, reason: form.assignmentReason! }, 'Responsable reasignado. Los tickets anteriores conservan su historial.')}>Reasignar mesa</button></div>}</section>}"
    if '<div className="lab-strip">' in line:
        lines[i] = line + '\n    {snapshot.service_mode === \'beverages_only\' && <div className="alert info" role="status"><strong>Turno nocturno · solo cerveza, gaseosa y agua</strong><p>Los pedidos anteriores conservan preparación y entrega. La carta nocturna se aplica también a los clientes de mesa.</p></div>}'
t = '\n'.join(lines) + '\n'
t = t.replace('<div className="alert info" role="status"><strong>Turno nocturno', '<div className="alert info"><strong>Turno nocturno')
p.write_text(t, encoding='utf-8')
p = root / 'apps/pos/src/components/guest-app.tsx'
t = p.read_text(encoding='utf-8')
line = '    {!view.ordering_allowed &&'
assert line in t
t = t.replace(line, '    {view.service_mode === \'beverages_only\' && <p className="alert info">Carta nocturna: cerveza, gaseosa y agua. Tu pedido sigue vinculado a la misma mesa y atención.</p>}\n' + line)
p.write_text(t, encoding='utf-8')
print('Production, night closure, responsibility and menu integrated')
