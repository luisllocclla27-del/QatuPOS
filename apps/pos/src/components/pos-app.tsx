'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommandResponse, PosCommand, PosSnapshot, SessionResponse, Station, PaymentMethod, CollectionAuthorization, OrderLine, TableVisit, Check, FiscalDocument, FiscalDocType, CustomerDocType, DiscountKind, SunatCreditReasonCode } from '@qatu/contracts';
import { ApiError, type CommandInput, getRuntime, getSession, getSnapshot, login, logout, sendCommand, requestQuote, money, parseMoney, parseQuantity, roleName, stationName, printState } from '../lib/client';

import TableGuestAccess from './table-guest-access';
import SalesHistoryPanel from './sales-history-panel';
import { accountAmounts, cashChange, checkPaymentState, resumableAuthorization } from '../lib/sales';
import { saveRecovery, loadRecovery, clearRecovery } from '../lib/command-recovery';
import GuestOrders from './guest-orders';
import { guestOrderProgress } from '../lib/guest-order-progress';
import CatalogManagement from './catalog-management';
import InventoryPanel from './inventory-panel';
import ProductionPanel from './production-panel';
import StaffPanel from './staff-panel';
import NightClosePanel from './night-close-panel';
import { currentConsumption, pendingCountFor } from '../lib/inventory-review';
import ThermalReceiptModal, { PrecuentaData } from './thermal-receipt-modal';
import IssueFiscalModal from './issue-fiscal-modal';
import ApplyDiscountModal from './apply-discount-modal';
import CashAuditModal from './cash-audit-modal';
import IssueCreditNoteModal from './issue-credit-note-modal';

type Screen = 'ventas' | 'mesas' | 'clientes' | 'bebidas' | 'estaciones' | 'caja' | 'turno' | 'stock' | 'dia' | 'carta' | 'personal';
type DraftLine = { product_id: string; quantity: number; note: string };
const nav: { id: Screen; name: string; symbol: string; hint: string }[] = [
  { id: 'mesas', name: 'Mesas', symbol: '▦', hint: 'Atender y tomar pedidos' },
  { id: 'clientes', name: 'Pedidos del cliente', symbol: '▧', hint: 'Tandas recibidas y entregas por mesa' },
  { id: 'bebidas', name: 'Bebidas', symbol: '◒', hint: 'Entrega directa desde Caja' },
  { id: 'estaciones', name: 'Estaciones', symbol: '▤', hint: 'Cocina y Heladería' },
  { id: 'ventas', name: 'Historial de ventas', symbol: '≡', hint: 'Cuentas, consumos y cobros registrados' },
  { id: 'caja', name: 'Caja', symbol: '□', hint: 'Cobrar y registrar movimientos' },
  { id: 'turno', name: 'Mi turno', symbol: '⇄', hint: 'Abrir, contar y entregar' },
  { id: 'stock', name: 'Inventario', symbol: '≋', hint: 'Existencias y conteos' },
  { id: 'dia', name: 'Cierre del día', symbol: '◷', hint: 'Consolidar los turnos' },
  { id: 'personal', name: 'Personal', symbol: '♙', hint: 'Identidades, permisos y credenciales individuales' },
  { id: 'carta', name: 'Carta', symbol: '☰', hint: 'Configurar productos y precios' },
];

const defaultAccount = { username: 'mozo', password: 'QatuDemo2026!' };
function displayQty(value: number | null) { return value === null ? 'Oculto' : String(value); }
function displayMoney(value: number | null) { return value === null ? 'Oculto durante conteo' : money(value); }
function time(value: string) { return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

export default function PosApp() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [snapshot, setSnapshot] = useState<PosSnapshot | null>(null);
  const hasFiscalDocument = (checkId: string) => !!snapshot?.fiscal_documents?.some(d => d.check_id === checkId);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [connected, setConnected] = useState(true);
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [recoveryUser, setRecoveryUser] = useState('');
  const [pending, setPending] = useState<PosCommand | null>(null);
  const [screen, setScreen] = useState<Screen>('mesas');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftLine[]>>({});
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftPersistent, setDraftPersistent] = useState(true);
  const [mobileOrder, setMobileOrder] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todo');
  const [station, setStation] = useState<Station>('cocina');
  const [account, setAccount] = useState({ username: '', password: '' });
  const [runtimeEnvironment, setRuntimeEnvironment] = useState<'laboratory' | 'operational' | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [checkId, setCheckId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [selectedAuthorization, setAuthorization] = useState<CollectionAuthorization | null>(null);
  const [voidTarget, setVoidTarget] = useState<{ line: OrderLine; visit: TableVisit } | null>(null);
  const [voidQty, setVoidQty] = useState(1);
  const [voidReason, setVoidReason] = useState('');
  const [voidRestoreStock, setVoidRestoreStock] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<CollectionAuthorization | null>(null);
  const [releaseReason, setReleaseReason] = useState('Cliente prefiere pagar en efectivo');
  const [dialog, setDialog] = useState<{ title: string; description: string; label: string; action: () => Promise<void> } | null>(null);
  const [precuentaData, setPrecuentaData] = useState<PrecuentaData | null>(null);
  const [issueFiscalCheck, setIssueFiscalCheck] = useState<Check | null>(null);
  const [viewingFiscalDoc, setViewingFiscalDoc] = useState<FiscalDocument | null>(null);
  const [discountTargetCheck, setDiscountTargetCheck] = useState<Check | null>(null);
  const [viewingCashAudit, setViewingCashAudit] = useState(false);
  const [creditNoteTargetDoc, setCreditNoteTargetDoc] = useState<FiscalDocument | null>(null);
  const update = (name: string, value: string) => setForm(previous => ({ ...previous, [name]: value }));

  const refresh = useCallback(async () => {
    try { const fresh = await getSnapshot(); setSnapshot(fresh); setConnected(true); }
    catch (e) {
      setConnected(false);
      if (e instanceof ApiError && e.status === 401) { setSession(null); setSnapshot(null); }
    }
  }, []);
  useEffect(() => {
    let active = true;
    getRuntime().then(runtime => { if (active) setRuntimeEnvironment(runtime.environment); }).catch(() => {}).then(() => getSession()).then(async current => { const data = await getSnapshot(); if (active) { setSession(current); setSnapshot(data); setScreen(current.user.role === 'cashier' ? 'caja' : current.user.role === 'kitchen' ? 'estaciones' : 'mesas'); if (current.user.station && current.user.role === 'kitchen') setStation(current.user.station); } })
      .catch(e => { if (active && (!(e instanceof ApiError) || e.status !== 401)) { setConnected(false); setError('El servicio está iniciando o no está disponible. Puedes volver a intentar.'); } })
      .finally(() => { if (active) setInitializing(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => { if (!busyRef.current) void refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [session, refresh]);
  useEffect(() => {
    setDraftLoaded(false);
    if (!session) { setDrafts({}); return; }
    try { const raw = localStorage.getItem(`qatu-draft:${session.user.id}`); setDrafts(raw ? JSON.parse(raw) as Record<string, DraftLine[]> : {}); }
    catch { setDrafts({}); }
    setDraftLoaded(true);
  }, [session?.user.id]);
  useEffect(() => {
    if (session && draftLoaded) {
      try { localStorage.setItem(`qatu-draft:${session.user.id}`, JSON.stringify(drafts)); setDraftPersistent(true); }
      catch { setDraftPersistent(false); }
    }
  }, [drafts, draftLoaded, session]);
  useEffect(() => {
    setPending(null); setRecoveryBlocked(false); setAuthorization(null); setRecoveryUser('');
    if (!session) return;
    try {
      const saved=loadRecovery(sessionStorage,session.user.id);
      if(saved) { setPending(saved); setNotice('Hay una operación por recuperar. Consulta su resultado antes de registrar otra.'); }
    } catch { setRecoveryBlocked(true); setError('No podemos leer la recuperación de esta terminal. No enviaremos operaciones nuevas. Conserva esta pestaña y solicita revisión del registro y de los cobros antes de continuar.'); }
    setRecoveryUser(session.user.id);
  }, [session?.user.id]);

  async function execute(input: CommandInput, success: string): Promise<CommandResponse | null> {
    if (!session || busyRef.current || pending || recoveryBlocked || recoveryUser!==session.user.id) return null;
    return perform({ ...input, operation_id: crypto.randomUUID() } as PosCommand, success);
  }
  function applyRecoveredResult(command: PosCommand, response: CommandResponse) {
    if(command.type==='cash.move') {setScreen('caja');setForm({});}
    if (command.type==='order.create') setDrafts(previous=>({...previous,[command.visit_id]:[]}));
    if (command.type==='collection.authorize') {
      const auth=response.snapshot.authorizations.find(a=>a.id===response.entity_id);
      if(auth) { setCheckId(auth.check_id); setAuthorization(auth); setScreen('caja'); setForm({}); }
    }
    if (command.type==='payment.confirm'||command.type==='payment.unknown'||command.type==='collection.release') {
      const accountId=response.snapshot.payments.find(p=>p.id===response.entity_id)?.check_id ?? response.snapshot.authorizations.find(a=>a.id===response.entity_id)?.check_id;
      if(accountId) {setCheckId(accountId);setScreen('caja');}
      setAuthorization(null); setForm({});
    }
  }
  async function perform(command: PosCommand, success: string): Promise<CommandResponse | null> {
    if (!session || busyRef.current || recoveryBlocked || recoveryUser!==session.user.id) return null;
    setError(''); setNotice(''); setBusy(true); busyRef.current = true;
    let persisted=false;
    try {
      try { persisted=saveRecovery(sessionStorage,session.user.id,command); }
      catch { setError('No pudimos guardar la recuperación. La operación no se envió. Habilita el almacenamiento de esta pestaña y vuelve a intentar.'); return null; }
      const response = await sendCommand(command, session.csrf_token);
      if(response?.operation_id!==command.operation_id || !response.snapshot || !Number.isSafeInteger(response.snapshot.version)) throw new Error('La respuesta no identifica la operación confirmada. Conservamos su recuperación.');
      setSnapshot(response.snapshot); setConnected(true); setPending(null); setNotice(success);
      applyRecoveredResult(command,response);
      if(persisted) {
        try { clearRecovery(sessionStorage,session.user.id); }
        catch { setPending(command); setNotice('Operación confirmada; no pudimos limpiar su recuperación. Recupera la misma operación antes de registrar otra.'); }
      }
      return response;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la operación.');
      if (!(e instanceof ApiError) || e.code === 'NETWORK' || e.code === 'SERVER' || e.status >= 500 || (persisted && [401,403].includes(e.status))) { setPending(command); setConnected(false); }
      else {
        if(persisted) {
          try { clearRecovery(sessionStorage,session.user.id); }
          catch { setPending(command); setError('No se confirmó la operación y no pudimos limpiar su recuperación. Revisa el resultado antes de continuar.'); return null; }
        }
        setPending(null);
        if (e instanceof ApiError && ['PRICE_CHANGED','VERSION_CONFLICT'].includes(e.code)) {
          await refresh();
          setError(e.code==='PRICE_CHANGED' ? (e.message || 'El precio cambió. Revisa tu pedido.') : command.type==='inventory.count'||command.type==='inventory.adjust' ? 'Cambió el inventario o sus reservas. Conservamos tu observación; revisa los valores y declara un reconteo antes de confirmar.' : 'Otra terminal cambió esta información. Actualizamos los datos; conserva tu borrador y revisa antes de confirmar.');
        }
      }
      return null;
    } finally { setBusy(false); busyRef.current = false; }
  }

  async function guarded(action: () => Promise<void>) {
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Revisa los datos antes de continuar.'); }
  }
  function changeScreen(next: Screen) { setScreen(next); setForm({}); setCounts({}); setNotice(''); setError(''); }
  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const current = await login(account.username, account.password); const data = await getSnapshot(); setSession(current); setSnapshot(data); setConnected(true);
      setScreen(current.user.role === 'cashier' ? 'caja' : current.user.role === 'kitchen' ? 'estaciones' : 'mesas');
      if (current.user.role === 'kitchen' && current.user.station) setStation(current.user.station);
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos iniciar sesión.'); }
    finally { setBusy(false); }
  }
  async function switchUser() {
    if (!session || busy || pending) return;
    try { await logout(session.csrf_token); setSession(null); setSnapshot(null); setSelectedTable(null); setAuthorization(null); setForm({}); setCounts({}); setCheckId(''); setError(''); setNotice(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cerrar la sesión.'); }
  }

  const operational = snapshot?.environment === 'operational' || runtimeEnvironment === 'operational';
  if (initializing) return <main className="loading-screen"><Brand /><p>Preparando tu espacio de trabajo…</p></main>;
  if (!session || !snapshot) return <main className="login-shell">
    <section className="login-story"><Brand /><span className="eyebrow light">EL ENCANTO HUAMANGUINO</span><h1>Tu salón, en orden.<br /><span>Tu equipo, conectado.</span></h1><p>Mesas, Cocina, Heladería y Caja trabajando sobre una misma cuenta.</p><div className="login-stations"><span>01 · Tomar el pedido</span><span>02 · Preparar y entregar</span><span>03 · Cobrar y conciliar</span></div><div className="story-footer">Diseñado para la manera en que atiendes.</div></section>
    <section className="login-panel"><div className="login-card"><span className="lab-badge">{operational ? 'INSTALACIÓN OPERATIVA' : runtimeEnvironment === 'laboratory' ? 'LABORATORIO · DATOS SINTÉTICOS' : 'MODO POR VERIFICAR'}</span><h2>Bienvenido a tu turno</h2><p className="muted">Ingresa con tu usuario individual.</p><form onSubmit={signIn} className="form-stack"><Field label="Usuario"><input autoComplete="username" value={account.username} onChange={e => setAccount({ ...account, username: e.target.value })} required /></Field><Field label="Contraseña"><input type="password" autoComplete="current-password" value={account.password} onChange={e => setAccount({ ...account, password: e.target.value })} required /></Field>{error && <div className="alert error" role="alert">{error}</div>}<button className="primary wide" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar a mi espacio'} <span>→</span></button></form>{runtimeEnvironment === 'laboratory' && <div className="demo-accounts"><strong>Explorar el laboratorio</strong><p>Contraseña de prueba: <code>QatuDemo2026!</code></p><div className="account-chips">{['mozo', 'caja', 'noche', 'admin', 'cocina', 'heladeria'].map(username => <button key={username} onClick={() => setAccount({ username, password: defaultAccount.password })}>{username}</button>)}</div></div>}<p className="small muted">{operational ? 'Cobros en efectivo registrados por personal. Integraciones digitales, SUNAT e impresión de red pendientes de habilitación.' : 'Sin cobros reales, emisión SUNAT ni impresión por red.'} Cada identidad tiene permisos distintos verificados en el servidor.</p></div></section>
  </main>;

  const isFinancial = session.user.role === 'cashier' || session.user.role === 'admin';
  const isAdmin = session.user.role === 'admin';
  const isKitchen = session.user.role === 'kitchen';
  const allowedNav = nav.filter(n => {
    if (n.id === 'carta' || n.id === 'personal') return isAdmin;
    return isKitchen ? n.id === 'estaciones' : isFinancial || ['mesas', 'clientes', 'bebidas', 'estaciones'].includes(n.id);
  });

  const currentNav = nav.find(n => n.id === screen)!;
  const disabled = busy || !!pending || recoveryBlocked || recoveryUser!==session.user.id;
  const authorization = selectedAuthorization ? resumableAuthorization(snapshot, session.user.id, selectedAuthorization.id) : undefined;
  const table = snapshot.tables.find(t => t.id === selectedTable);
  const visit = snapshot.visits.find(v => v.id === table?.visit_id);
  const check = snapshot.checks.find(c => c.id === visit?.check_id);
  const visitSettled = !!check && check.total_minor > 0 && check.paid_minor >= check.total_minor && check.held_minor === 0;
  const guestAccess = snapshot.guest_accesses.filter(a => a.visit_id === visit?.id).at(-1);
  const draftKey = visit?.id ?? table?.id ?? '';
  const draft = drafts[draftKey] ?? [];
  const previousOrders = snapshot.orders.filter(o => o.visit_id === visit?.id);
  const categories = ['Todo', ...new Set(snapshot.products.filter(p => p.active && (!snapshot.available_product_ids || snapshot.available_product_ids.includes(p.id))).map(p => p.category))];
  const products = snapshot.products.filter(p => p.active && (!snapshot.available_product_ids || snapshot.available_product_ids.includes(p.id)) && (category === 'Todo' || p.category === category) && p.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  const draftTotal = draft.reduce((sum, line) => sum + (snapshot.products.find(p => p.id === line.product_id)?.price_minor ?? 0) * line.quantity, 0);
  const cash = snapshot.cash_sessions.find(c => c.state === 'open' || c.state === 'counting');
  const ownedCash = cash?.owner_id === session.user.id ? cash : undefined;
  const activeHandover = snapshot.handovers.find(h => ['prepared', 'declared', 'disputed'].includes(h.state) && h.cash_session_id === cash?.id);
  const beverages = snapshot.stock.filter(s => s.station === 'caja');
  const activeChecks = snapshot.checks.filter(c => c.status === 'open');
  const selectedCheck = activeChecks.find(c => c.id === checkId);
  const selectedConsumptionEditable = selectedCheck ? currentConsumption(snapshot, selectedCheck.id) : false;
  const latestClose = snapshot.day_closes.at(-1);
  const human = (id: string) => snapshot.staff.find(s => s.id === id)?.name ?? 'Personal';
  const tableLabel = (visitId: string) => snapshot.tables.find(t => t.id === snapshot.visits.find(v => v.id === visitId)?.table_id)?.label ?? 'Mesa';
  const countLines = () => beverages.map(s => ({ stock_item_id: s.id, counted_quantity: parseQuantity(counts[s.id] ?? '') }));

  function modifyDraft(productId: string, delta: number) {
    setDrafts(previous => {
      const current = previous[draftKey] ?? []; const existing = current.find(l => l.product_id === productId);
      const next = existing ? current.map(l => l.product_id === productId ? { ...l, quantity: l.quantity + delta } : l).filter(l => l.quantity > 0) : [...current, { product_id: productId, quantity: 1, note: '' }];
      return { ...previous, [draftKey]: next };
    });
  }
  async function selectTable(id: string) {
    if (disabled) return;
    const next = snapshot!.tables.find(t => t.id === id)!;
    if (!next.visit_id) {
      const response = await execute({ type: 'table.open', table_id: next.id, expected_version: next.version }, 'Mesa abierta. Ya puedes tomar el pedido.');
      if (!response) return;
    }
    setSelectedTable(id); setSearch(''); setCategory('Todo'); setMobileOrder(false);
  }
  async function submitDraft() {
    if (!visit || !draft.length) return;
    const key = draftKey;
    try {
      setBusy(true); busyRef.current = true; setError('');
      const q = await requestQuote(visit.id, draft, session?.csrf_token);
      setBusy(false); busyRef.current = false;
      const response = await execute({ type: 'order.create', visit_id: visit.id, expected_version: visit.version, quote_id: q.quote_id }, 'Pedido registrado. Las estaciones tienen su tanda y las bebidas quedan pendientes de entrega.');
      if (response) setDrafts(previous => ({ ...previous, [key]: [] }));
      setDialog(null);
    } catch (e) {
      setBusy(false); busyRef.current = false;
      setDialog(null);
      if (e instanceof ApiError && e.code === 'PRICE_CHANGED') {
        await refresh();
        setError(e.message || 'El precio cambió. Revisa el pedido antes de confirmar.');
        return;
      }
      setError(e instanceof Error ? e.message : 'No se pudo cotizar o registrar el pedido.');
    }
  }

  async function reservePayment() {
    if (!selectedCheck || !ownedCash) { setError('Selecciona una cuenta y abre tu sesión de caja.'); return; }
    const response = await execute({ type: 'collection.authorize', check_id: selectedCheck.id, expected_version: selectedCheck.version, cash_session_id: ownedCash.id, method, amount_minor: parseMoney(form.amount ?? '') }, 'Importe reservado. Registra ahora el resultado del cobro.');
    if (response) setAuthorization(response.snapshot.authorizations.find(a => a.id === response.entity_id) ?? null);
  }
  const evidence = () => {
    if (!form.reference?.trim()) throw new ApiError('INPUT', 'Completa la referencia y la cuenta/terminal del comercio.');
    return { source: 'merchant_verified' as const, merchant_account: 'comercio-laboratorio', external_reference: form.reference.trim(), observed_at: new Date().toISOString() };
  };
  async function confirmPayment() {
    if (!authorization) return;
    const input: CommandInput = authorization.method === 'cash' ? { type: 'payment.confirm', authorization_id: authorization.id, received_minor: parseMoney(form.received ?? '') } : { type: 'payment.confirm', authorization_id: authorization.id, evidence: evidence() };
    const response = await execute(input, 'Cobro registrado. La cuenta y el turno se actualizaron.');
    if (response) { setAuthorization(null); setForm({}); }
  }

  async function confirmVoidLine() {
    if (!voidTarget || voidReason.trim().length < 3) {
      setError('El motivo de anulación es obligatorio (mínimo 3 caracteres).');
      return;
    }
    const currentVisit = snapshot?.visits.find(v => v.id === voidTarget.visit.id);
    if (!currentVisit) return;
    const response = await execute({
      type: 'order.line.void',
      line_id: voidTarget.line.id,
      expected_version: currentVisit.version,
      quantity: voidQty,
      restore_stock: voidRestoreStock,
      reason: voidReason.trim(),
    }, `Línea anulada (${voidQty} u.). Cuenta y comanda actualizadas.`);
    if (response) {
      setVoidTarget(null);
      setVoidReason('');
      setVoidQty(1);
      setVoidRestoreStock(false);
    }
  }

  async function confirmReleaseAuth() {
    if (!releaseTarget || releaseReason.trim().length < 3) {
      setError('El motivo de liberación es obligatorio (mínimo 3 caracteres).');
      return;
    }
    const currentCheck = snapshot?.checks.find(c => c.id === releaseTarget.check_id);
    if (!currentCheck) return;
    const response = await execute({
      type: 'collection.release',
      authorization_id: releaseTarget.id,
      expected_version: currentCheck.version,
      reason: releaseReason.trim(),
    }, 'Cobro retenido liberado. El saldo vuelve a estar disponible para cobrar.');
    if (response) {
      setReleaseTarget(null);
      setReleaseReason('Cliente prefiere pagar en efectivo');
      if (authorization?.id === releaseTarget.id) {
        setAuthorization(null);
      }
    }
  }

  async function handleIssueFiscal(data: {
    doc_type: FiscalDocType;
    customer_doc_type: CustomerDocType;
    customer_doc_number?: string;
    customer_name: string;
    customer_address?: string;
  }) {
    if (!issueFiscalCheck) return;
    const currentCheck = snapshot?.checks.find(c => c.id === issueFiscalCheck.id) ?? issueFiscalCheck;
    const response = await execute({
      type: 'fiscal.document.issue',
      check_id: currentCheck.id,
      expected_check_version: currentCheck.version,
      doc_type: data.doc_type,
      customer_doc_type: data.customer_doc_type,
      customer_doc_number: data.customer_doc_number,
      customer_name: data.customer_name,
      customer_address: data.customer_address,
    }, `Documento simulado registrado (${data.doc_type === 'factura' ? 'Factura F001' : 'Boleta B001'}).`);

    if (response) {
      const issuedDoc = response.snapshot.fiscal_documents?.find(d => d.id === response.entity_id)
        ?? response.snapshot.fiscal_documents?.find(d => d.check_id === currentCheck.id);
      setIssueFiscalCheck(null);
      if (issuedDoc) {
        setViewingFiscalDoc(issuedDoc);
      }
    }
  }

  async function handleApplyDiscount(params: { kind: DiscountKind; percent?: number; amount_minor?: number; reason: string }) {
    if (!discountTargetCheck) return;
    const currentCheck = snapshot?.checks.find(c => c.id === discountTargetCheck.id) ?? discountTargetCheck;
    const response = await execute({
      type: 'check.discount.apply',
      check_id: currentCheck.id,
      expected_version: currentCheck.version,
      kind: params.kind,
      percent: params.percent,
      amount_minor: params.amount_minor,
      reason: params.reason,
    }, 'Descuento / cortesía comercial aplicado exitosamente a la cuenta.');
    if (response) {
      setDiscountTargetCheck(null);
    }
  }

  async function handleRemoveDiscount(reason: string) {
    if (!discountTargetCheck) return;
    const currentCheck = snapshot?.checks.find(c => c.id === discountTargetCheck.id) ?? discountTargetCheck;
    const response = await execute({
      type: 'check.discount.remove',
      check_id: currentCheck.id,
      expected_version: currentCheck.version,
      reason,
    }, 'Descuento comercial retirado de la cuenta.');
    if (response) {
      setDiscountTargetCheck(null);
    }
  }

  async function handleIssueCreditNote(params: {
    document_id: string;
    reason_code: SunatCreditReasonCode;
    reason_description: string;
  }) {
    const response = await execute({
      type: 'fiscal.credit_note.issue',
      document_id: params.document_id,
      reason_code: params.reason_code,
      reason_description: params.reason_description,
    }, 'Nota de Crédito simulada registrada. Sin transmisión a SUNAT ni devolución de dinero.');
    if (response) {
      setCreditNoteTargetDoc(null);
      const issuedNC = response.snapshot.fiscal_documents.find(d => d.id === response.entity_id);
      if (issuedNC) setViewingFiscalDoc(issuedNC);
    }
  }

  return <div className="pos-shell">
    <aside className="sidebar"><Brand /><span className="workspace-tag">EL ENCANTO<br />HUAMANGUINO</span><nav aria-label="Secciones de operación">{allowedNav.map(item => <button key={item.id} aria-current={screen === item.id ? 'page' : undefined} className={screen === item.id ? 'nav-item active' : 'nav-item'} onClick={() => changeScreen(item.id)}><span className="nav-symbol">{item.symbol}</span>{item.name}{item.id === 'clientes' && <span className="nav-count">{snapshot.orders.filter(o=>o.source==='guest' && guestOrderProgress(o).pending>0).length}</span>}{item.id === 'bebidas' && <span className="nav-count">{snapshot.orders.flatMap(o => o.lines).filter(l => l.station === 'caja' && l.fulfilled_quantity < l.quantity - (l.voided_quantity ?? 0)).length}</span>}</button>)}</nav><div className="sidebar-bottom"><span className="status-dot" /> Una sola operación<div className="small">Mesas · Estaciones · Caja</div><span className="lab-badge compact">{operational ? 'INSTALACIÓN OPERATIVA' : 'ENTORNO DE PRUEBA'}</span></div></aside>
    <div className="main-shell"><header className="topbar"><div><span className="branch-title">{snapshot.branch.name}</span><span className="business-date">Día operativo · {snapshot.business_day.business_date}</span></div><div className="topbar-right"><button className="connection" onClick={() => void refresh()} title="Actualizar datos"><span className={connected ? 'status-dot' : 'status-dot offline'} />{connected ? 'Conectado' : 'Sin confirmar'}</button><div className="user-avatar">{session.user.name.charAt(0)}</div><div className="user-label"><strong>{session.user.name}</strong><span>{roleName[session.user.role]}</span></div><button className="icon-button" disabled={disabled} onClick={() => void switchUser()} title="Cambiar usuario" aria-label="Cambiar usuario">⇥</button></div></header>
    <div className="lab-strip">{operational ? <>Operación del local <span>·</span> Efectivo registrado por personal <span>·</span> Integraciones digitales, SUNAT e impresoras pendientes</> : <>Laboratorio <span>·</span> Proveedores e impresoras simulados <span>·</span> Comprobantes SUNAT pendientes de integración</>}</div>
    {snapshot.service_mode === 'beverages_only' && <div className="alert info"><strong>Turno nocturno · solo cerveza, gaseosa y agua</strong><p>Los pedidos anteriores conservan preparación y entrega. La carta nocturna se aplica también a los clientes de mesa.</p></div>}
    <main className="main-content"><div className="page-heading"><div><span className="eyebrow">{currentNav.hint}</span><h1>{screen === 'mesas' && table ? table.label : currentNav.name}</h1></div><div className="heading-meta">{screen === 'mesas' && table ? <button className="secondary" onClick={() => { setSelectedTable(null); setMobileOrder(false); }}>{draft.length ? '← Mesas · borrador guardado' : '← Volver a mesas'}</button> : <span className="subtle-pill">{roleName[session.user.role]} · {snapshot.business_day.state === 'open' ? 'Día abierto' : snapshot.day_closes.some(c => c.business_day_id === snapshot.business_day.id && c.operational_status === 'reconciled') ? 'Operativo conciliado · fiscal pendiente' : 'Cierre provisional'}</span>}</div></div>
    {error && <div className="alert error" role="alert">{error}<button className="dismiss" onClick={() => setError('')} aria-label="Cerrar aviso">×</button></div>}
    {notice && <div className="alert success" role="status">✓ {notice}<button className="dismiss" onClick={() => setNotice('')} aria-label="Cerrar aviso">×</button></div>}
    {recoveryBlocked && <div className="alert warning" role="alert"><strong>Recuperación de terminal por revisar</strong><p>El registro no se pudo leer. Las operaciones están bloqueadas para evitar duplicaciones. Conserva esta pestaña y solicita revisar los pedidos y cobros antes de continuar.</p></div>}
    {pending && <div className="alert warning"><div><strong>Respuesta pendiente de confirmación</strong><p>Conservamos la misma operación. Recuperarla no vuelve a crear el pedido o cobro.</p></div><button className="secondary" disabled={busy} onClick={() => void perform(pending, 'Operación recuperada. Revisa su resultado actualizado.')}>Consultar y recuperar</button></div>}

    {screen === 'clientes' && <GuestOrders snapshot={snapshot} disabled={disabled} onOpenVisit={visitId=>{ const currentVisit=snapshot.visits.find(v=>v.id===visitId);const currentTable=snapshot.tables.find(t=>t.id===currentVisit?.table_id);if(disabled)return;if(currentVisit?.status!=='open' || currentTable?.visit_id!==visitId){setError('Esta atención ya terminó. Actualiza la vista antes de continuar.');void refresh();return;}setSelectedTable(currentTable.id);setMobileOrder(false);setSearch('');setCategory('Todo');changeScreen('mesas');}} />}

    {screen === 'ventas' && isFinancial && <SalesHistoryPanel snapshot={snapshot} onPrecuenta={setPrecuentaData} />}
    {screen === 'mesas' && !table && <><div className="section-toolbar"><p className="muted">Selecciona una mesa para atenderla. Cada tanda conserva a su mozo.</p><div className="legend"><span><i className="legend-dot free" />Libre</span><span><i className="legend-dot occupied" />En atención</span></div></div><div className="tables-grid">{snapshot.tables.map(t => { const v = snapshot.visits.find(v => v.id === t.visit_id); const c = snapshot.checks.find(c => c.id === v?.check_id); return <button key={t.id} className={`table-card ${t.visit_id ? 'occupied' : 'free'}`} disabled={disabled} onClick={() => void selectTable(t.id)}><div className="table-card-top"><span className="table-number">{t.label.replace('Mesa ', '')}</span><span className={`badge ${t.visit_id ? 'teal' : ''}`}>{t.visit_id ? 'En atención' : 'Libre'}</span></div><div className="table-shape"><span /><span /><div>{t.seats}</div><span /><span /></div><div className="table-card-footer"><strong>{t.label}</strong><span>{c ? money(c.total_minor) : 'Abrir mesa →'}</span></div></button>; })}</div><div className="empty-hint">Dos terminales, la misma información. Los pedidos confirmados se sincronizan sin volver a registrarlos.</div></>}

    {screen === 'mesas' && table && visit && session.user.role === 'waiter' && <TableGuestAccess key={visit.id} visitId={visit.id} version={visit.version} access={guestAccess} settled={visitSettled} disabled={disabled} onAction={execute} />}
    {screen === 'mesas' && table && visit && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">RESPONSABLE DE LA ATENCIÓN</span><strong>{visit.responsible_waiter_name ?? 'Sin mozo asignado'}</strong></div>{session.user.role === 'waiter' && !visit.responsible_waiter_id && <button className="secondary" disabled={disabled} onClick={() => void execute({ type: 'table.assign', visit_id: visit.id, expected_version: visit.version, waiter_id: session.user.id, reason: 'Mozo asume la atención de esta mesa' }, 'Atención asignada a tu nombre.')}>Tomar atención de mesa</button>}</div>{isAdmin && <div className="inline-form"><label className="field"><span>Reasignar responsable</span><select value={form.assignedWaiter ?? ''} onChange={e => update('assignedWaiter', e.target.value)}><option value="">Seleccionar mozo</option>{snapshot.staff.filter(s => s.role === 'waiter').map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label className="field"><span>Motivo de reasignación</span><input value={form.assignmentReason ?? ''} onChange={e => update('assignmentReason', e.target.value)} /></label><button className="secondary" disabled={disabled || !form.assignedWaiter || (form.assignmentReason?.trim().length ?? 0) < 3} onClick={() => void execute({ type: 'table.assign', visit_id: visit.id, expected_version: visit.version, waiter_id: form.assignedWaiter!, reason: form.assignmentReason! }, 'Responsable reasignado. Los tickets anteriores conservan su historial.')}>Reasignar mesa</button></div>}</section>}
    {screen === 'mesas' && table && <div className={`order-workspace ${mobileOrder ? 'show-order' : ''}`}><section className="catalog-panel"><div className="search-box"><span aria-hidden>⌕</span><input aria-label="Buscar producto" placeholder="Buscar plato, bebida o postre…" value={search} onChange={e => setSearch(e.target.value)} /><kbd>Buscar</kbd></div><div className="category-tabs" role="group" aria-label="Categorías">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={category === c ? 'selected' : ''}>{c}</button>)}</div><div className="products-grid">{products.map(p => { const s = snapshot.stock.find(s => s.id === p.stock_item_id); const count = draft.find(l => l.product_id === p.id)?.quantity ?? 0; return <button key={p.id} className={`product-card ${count ? 'chosen' : ''}`} disabled={disabled || visitSettled || (s?.available !== null && s?.available !== undefined && s.available <= 0)} onClick={() => modifyDraft(p.id, 1)}><span className={`station-label station-${p.station}`}>{stationName[p.station]}</span><strong>{p.name}</strong><div className="product-bottom"><span>{money(p.price_minor)}</span><span className="add-dot">{count || '+'}</span></div>{s && <span className="stock-hint">{s.available === null ? 'Conteo en curso' : `${s.available} disponibles`}</span>}</button>; })}</div>{!products.length && <Empty title="Sin coincidencias" text="Prueba otro nombre o categoría." />}</section>
    <aside className="order-panel"><div className="order-header"><div><strong>Pedido de {table.label}</strong><span>{previousOrders.length ? `${previousOrders.length} tanda(s) registrada(s)` : 'Primera tanda'}</span></div><button className="icon-button mobile-only" onClick={() => setMobileOrder(false)} aria-label="Volver al catálogo">×</button></div><div className="draft-heading"><span className="badge amber">Por enviar</span><span>{draft.reduce((s, l) => s + l.quantity, 0)} productos</span></div><div className="draft-lines">{!draft.length && <div className="draft-empty"><span>＋</span><strong>Empecemos el pedido</strong><p>Toca un producto del catálogo para agregarlo aquí.</p></div>}{draft.map(line => { const p = snapshot.products.find(p => p.id === line.product_id)!; return <div className="draft-line" key={line.product_id}><div className="line-title"><strong>{p.name}</strong><span>{money(p.price_minor * line.quantity)}</span></div><div className="line-controls"><div className="quantity-control"><button disabled={disabled} aria-label={`Quitar ${p.name}`} onClick={() => modifyDraft(p.id, -1)}>−</button><span>{line.quantity}</span><button disabled={disabled} aria-label={`Agregar ${p.name}`} onClick={() => modifyDraft(p.id, 1)}>+</button></div><span className="small muted">{stationName[p.station]}</span></div><input className="note-input" aria-label={`Observación para ${p.name}`} placeholder="Observación: sin picante, sin hielo…" value={line.note} maxLength={300} onChange={e => setDrafts(previous => ({ ...previous, [draftKey]: (previous[draftKey] ?? []).map(l => l.product_id === line.product_id ? { ...l, note: e.target.value } : l) }))} /></div>; })}</div><div className="order-summary"><div><span>Total de esta tanda</span><strong>{money(draftTotal)}</strong></div><button className="primary wide" disabled={disabled || visitSettled || !draft.length} onClick={() => setDialog({ title: `Enviar pedido · ${table.label}`, description: [...new Set(draft.map(l => stationName[snapshot.products.find(p => p.id === l.product_id)!.station]))].join(' + ') + '. Bebidas de Caja se entregan directamente, sin ticket. El envío registra la tanda, no su entrega.', label: `Enviar ${draft.reduce((s, l) => s + l.quantity, 0)} productos`, action: submitDraft })}>Enviar pedido <span>→</span></button>{visitSettled && !!draft.length && <button className="secondary" disabled={disabled} onClick={()=>setDrafts(previous=>({...previous,[draftKey]:[]}))}>Descartar borrador de esta atención</button>}<span className="small muted">{draftPersistent?'Borrador guardado en esta terminal para tu usuario.':'Borrador temporal: el almacenamiento no está disponible. Conserva esta pestaña.'}</span></div>{check && <div className="current-account"><div><span>Cuenta registrada</span><strong>{money(check.total_minor)}</strong></div><div><span>Pagado</span><span>{money(check.paid_minor)}</span></div>{check.held_minor > 0 && <div className="text-amber"><span>Retenido / pendiente</span><span>{money(check.held_minor)}</span></div>}<div><span>Saldo libre</span><strong>{money(check.remaining_collectible_minor)}</strong></div>{visit && <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}><button type="button" className="secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => setPrecuentaData({ tableLabel: table.label, visit, check, orders: previousOrders, waiterName: session.user.name })}><span>📋</span> Imprimir Pre-cuenta</button></div>}</div>}<details className="previous-orders"><summary>Tandas y seguimiento ({previousOrders.length})</summary>{previousOrders.map(o => <div className="history-batch" key={o.id}><strong>Tanda {o.batch_number} · {time(o.created_at)}</strong><small>{o.source === 'guest' ? 'Cliente desde su navegador' : human(o.created_by)}</small>{o.lines.map(l => { const isFullyVoided = (l.voided_quantity ?? 0) >= l.quantity; return <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={isFullyVoided ? { textDecoration: 'line-through', opacity: 0.6 } : {}}>{l.quantity} × {l.product_name}</span><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>{l.voided_quantity > 0 && <span className="badge danger" style={{ fontSize: '9px' }}>Anulado: {l.voided_quantity} u.</span>}<small>{l.fulfilled_quantity}/{l.quantity - (l.voided_quantity ?? 0)} entregados</small></div></div>; })}</div>)}{previousOrders.length > 0 && <p className="small muted" style={{ marginTop: '8px', color: 'var(--amber)' }}>Las anulaciones o cambios de comanda se autorizan y procesan exclusivamente en Caja.</p>}</details>{visit && check?.remaining_collectible_minor === 0 && check.held_minor === 0 && previousOrders.length > 0 && <button className="secondary close-table" disabled={disabled || draft.length > 0} onClick={() => setDialog({ title: `Liberar ${table.label}`, description: 'La cuenta debe estar cobrada y todas las unidades entregadas. El servidor verificará esos estados antes de cerrar la visita.', label: 'Cerrar visita y liberar mesa', action: async () => { const response = await execute({ type: 'table.close', visit_id: visit.id, expected_version: visit.version }, 'Visita cerrada. Mesa disponible.'); if (response) setSelectedTable(null); setDialog(null); } })}>Cerrar visita y liberar mesa</button>}</aside><button className="mobile-order-button primary" onClick={() => setMobileOrder(true)}>Ver pedido · {money(draftTotal)}</button></div>}

    {(screen === 'bebidas' || screen === 'estaciones') && <ProductionPanel snapshot={snapshot} station={screen === 'bebidas' ? 'caja' : station} onStation={screen === 'estaciones' && !isKitchen ? setStation : undefined} disabled={disabled} onAction={execute} />}

    {screen === 'caja' && (() => {
      const selectedVisit = selectedCheck ? snapshot.visits.find(v => v.id === selectedCheck.visit_id) : undefined;
      const selectedOrders = selectedVisit ? snapshot.orders.filter(o => o.visit_id === selectedVisit.id) : [];
      const reservedAuth = selectedCheck ? (authorization?.check_id === selectedCheck.id ? authorization : snapshot.authorizations.find(a => a.check_id === selectedCheck.id && a.status === 'reserved')) : undefined;
      return <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <CashStatus cash={cash} userName={cash ? human(cash.owner_id) : undefined} />
          </div>
          {isFinancial && (
            <button
              type="button"
              className="secondary"
              style={{ minHeight: '36px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600, padding: '6px 14px' }}
              onClick={() => setViewingCashAudit(true)}
            >
              <span>📊</span> Arqueo de Caja en Vivo (Corte X)
            </button>
          )}
        </div>
        {!ownedCash && <div className="alert warning">{cash ? 'La caja tiene otro responsable. Inicia sesión con su identidad para cobrar.' : 'Abre tu sesión en Mi turno antes de cobrar.'}</div>}
        <div className="cash-layout">
          <section className="panel">
            <div className="panel-heading"><h2>Cuentas por cobrar</h2><span className="badge">{activeChecks.length}</span></div>
            <div className="check-list">
              {activeChecks.map(c => {
                const isPaid = checkPaymentState(c) === 'paid';
                const isFiscalIssued = hasFiscalDocument(c.id);
                return (
                  <button className={`check-row ${checkId === c.id ? 'selected' : ''}`} key={c.id} onClick={() => { if (authorization) { setError('Termina el registro del cobro reservado antes de cambiar de cuenta.'); return; } setCheckId(c.id); setForm({ amount: (c.remaining_collectible_minor / 100).toFixed(2) }); }}>
                    <div>
                      <strong>{tableLabel(c.visit_id)}</strong>
                      <small>Cuenta {money(c.total_minor)}{c.held_minor > 0 ? ` · Retenido ${money(c.held_minor)}` : ''}</small>
                      {isFiscalIssued ? (
                        <span className="badge teal" style={{ marginLeft: '6px', fontSize: '10px' }}>🧾 Simulado</span>
                      ) : isPaid ? (
                        <span className="badge amber" style={{ marginLeft: '6px', fontSize: '10px' }}>✓ Pagado</span>
                      ) : null}
                    </div>
                    <strong>{money(c.remaining_collectible_minor)}</strong>
                  </button>
                );
              })}
            </div>
            {!activeChecks.length && <Empty title="Sin cuentas abiertas" text="Los pedidos del salón aparecerán aquí." />}
          </section>
          <section className="panel payment-panel">
            <div className="panel-heading"><h2>{selectedCheck ? `Cobrar · ${tableLabel(selectedCheck.visit_id)}` : 'Selecciona una cuenta'}</h2><span className="badge amber">{operational ? 'Registro operativo' : 'Registro de laboratorio'}</span></div>
            {selectedCheck ? <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="secondary"
                  style={{ minHeight: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setPrecuentaData({
                      tableLabel: tableLabel(selectedCheck.visit_id),
                      visit: selectedVisit!,
                      check: selectedCheck,
                      orders: selectedOrders,
                      waiterName: session.user.name,
                    });
                  }}
                >
                  <span>📋</span> Imprimir Pre-cuenta
                </button>
                {isFinancial && (
                  <button
                    type="button"
                    className={`secondary ${(selectedCheck.discount_minor ?? 0) > 0 ? 'amber' : ''}`}
                    style={{ minHeight: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    disabled={disabled || !selectedConsumptionEditable || hasFiscalDocument(selectedCheck.id) || (selectedCheck.total_minor > 0 && selectedCheck.paid_minor === selectedCheck.total_minor && selectedCheck.held_minor === 0)}
                    onClick={() => setDiscountTargetCheck(selectedCheck)}
                  >
                    <span>🏷️</span> {(selectedCheck.discount_minor ?? 0) > 0 ? `Descuento (-${money(selectedCheck.discount_minor!)})` : 'Descuento / Cortesía'}
                  </button>
                )}
                {hasFiscalDocument(selectedCheck.id) ? (() => {
                  const doc = snapshot.fiscal_documents?.find(d => d.check_id === selectedCheck.id);
                  return (
                    <button
                      type="button"
                      className="secondary teal"
                      style={{ minHeight: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        if (doc) setViewingFiscalDoc(doc);
                      }}
                    >
                      <span>🧾</span> Ver Comprobante {doc ? `(${doc.full_number})` : ''}
                    </button>
                  );
                })() : checkPaymentState(selectedCheck) === 'paid' ? (
                  <button
                    type="button"
                    className="primary"
                    style={{ minHeight: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    disabled={disabled || operational}
                    onClick={() => setIssueFiscalCheck(selectedCheck)}
                  >
                    <span>🧾</span> Emitir Boleta / Factura (simulación)
                  </button>
                ) : null}
              </div>

              {(selectedCheck.discount_minor ?? 0) > 0 && (
                <div className="alert info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: '#fffbeb', borderColor: '#fef3c7' }}>
                  <div>
                    <strong style={{ color: '#b45309' }}>🏷️ Descuento Comercial Concedido ({money(selectedCheck.discount_minor!)})</strong>
                    <p className="small" style={{ color: '#92400e', margin: '2px 0 0' }}>
                      {selectedCheck.discount_kind === 'percentage' ? `${selectedCheck.discount_percent}% de descuento` : 'Monto fijo'} · Motivo: <em>"{selectedCheck.discount_reason}"</em>
                    </p>
                  </div>
                  {isFinancial && !hasFiscalDocument(selectedCheck.id) && selectedCheck.paid_minor === 0 && selectedCheck.held_minor === 0 && (
                    <button
                      type="button"
                      className="secondary"
                      style={{ minHeight: '26px', padding: '2px 8px', fontSize: '11px' }}
                      disabled={disabled || !selectedConsumptionEditable}
                      onClick={() => setDiscountTargetCheck(selectedCheck)}
                    >
                      Modificar / Quitar
                    </button>
                  )}
                </div>
              )}

              {hasFiscalDocument(selectedCheck.id) && (() => {
                const doc = snapshot.fiscal_documents?.find(d => d.check_id === selectedCheck.id);
                return (
                  <div className="alert info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <strong>Documento simulado registrado ({doc?.full_number})</strong>
                      {doc && <p className="small">{doc.doc_type === 'factura' ? 'Factura' : 'Boleta'} · {doc.customer_name} ({doc.customer_doc_number || 'Sin doc.'})</p>}
                    </div>
                    {doc && (
                      <button
                        type="button"
                        className="secondary"
                        style={{ minHeight: '30px', fontSize: '11px' }}
                        onClick={() => setViewingFiscalDoc(doc)}
                      >
                        🖨️ Imprimir 80mm
                      </button>
                    )}
                  </div>
                );
              })()}

              {checkPaymentState(selectedCheck) === 'paid' && !hasFiscalDocument(selectedCheck.id) && (
                <div className="alert success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <strong>Cuenta 100% cobrada</strong>
                    <p className="small">El pago está registrado. La emisión fiscal requiere un proveedor habilitado.</p>
                  </div>
                  <button
                    type="button"
                    className="primary"
                    disabled={disabled || operational}
                    onClick={() => setIssueFiscalCheck(selectedCheck)}
                  >
                    🧾 Emitir Boleta / Factura (simulación) →
                  </button>
                </div>
              )}

              {(selectedCheck.discount_minor ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--muted)', marginBottom: '4px', padding: '0 4px' }}>
                  <span>Subtotal consumos brutos:</span>
                  <span>{money(selectedCheck.total_minor + (selectedCheck.discount_minor ?? 0))}</span>
                </div>
              )}
              {(selectedCheck.discount_minor ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#0d9488', fontWeight: 600, marginBottom: '6px', padding: '0 4px' }}>
                  <span>Descuento comercial aplicado:</span>
                  <span>-{money(selectedCheck.discount_minor!)}</span>
                </div>
              )}
              {!selectedConsumptionEditable && <p className="alert info">{snapshot.business_day.state === 'open' ? 'Consumo de un día anterior: puedes cobrar el saldo, pero no anular ni cambiar descuentos desde esta cuenta.' : 'El día operativo está cerrado; los consumos conservan su cierre original.'}</p>}
              <div className="report-row"><span>Consumo total</span><strong>{money(selectedCheck.total_minor)}</strong></div><div className="report-row"><span>Pagos confirmados</span><strong>{money(selectedCheck.paid_minor)}</strong></div><div className="report-row"><span>Pendiente total (incluye retenido)</span><strong>{money(accountAmounts(selectedCheck).pending)}</strong></div><div className="payment-total"><span>Saldo disponible para cobrar</span><strong>{money(selectedCheck.remaining_collectible_minor)}</strong></div>
              {selectedCheck.held_minor > 0 && !authorization && (
                <div className="alert warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong>Hay cobro retenido ({money(selectedCheck.held_minor)})</strong>
                    <p className="small">Este importe aún no está confirmado como pago. No vuelvas a cobrarlo mientras siga retenido.</p>
                  </div>
                  {reservedAuth && resumableAuthorization(snapshot,session.user.id,reservedAuth.id) && <button type="button" className="secondary" disabled={disabled} onClick={()=>{setAuthorization(reservedAuth);setForm({});}}>Continuar cobro reservado</button>}
                  {reservedAuth && (isAdmin || reservedAuth.created_by===session.user.id) && (
                    <button
                      type="button"
                      className="secondary danger"
                      disabled={disabled}
                      onClick={() => {
                        setReleaseTarget(reservedAuth);
                        setReleaseReason('Cliente prefiere pagar en efectivo');
                      }}
                    >
                      Liberar cobro retenido
                    </button>
                  )}
                </div>
              )}
              {!authorization ? (
                selectedCheck.remaining_collectible_minor > 0 ? (
                  <form onSubmit={e => { e.preventDefault(); void guarded(reservePayment); }} className="form-stack">
                    <div className="method-tabs">
                      {((operational ? ['cash'] : ['cash', 'card', 'yape']) as PaymentMethod[]).map(m => <button type="button" key={m} className={method === m ? 'selected' : ''} onClick={() => setMethod(m)}>{m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Yape'}</button>)}
                    </div>
                    <Field label="Importe a cobrar (S/)"><input inputMode="decimal" value={form.amount ?? ''} onChange={e => update('amount', e.target.value)} required /></Field>
                    <p className="small muted">Paso 1: reservar saldo. Paso 2: registrar resultado. Los importes pendientes quedan protegidos.</p>
                    <button className="primary" disabled={disabled || !ownedCash}>Reservar importe y continuar →</button>
                  </form>
                ) : (
                  <p className="muted small" style={{ margin: '8px 0' }}>{selectedCheck.held_minor>0 ? 'No hay saldo libre. El importe retenido continúa pendiente de confirmación.' : 'No hay saldo libre para un nuevo cobro.'}</p>
                )
              ) : (
                <div className="form-stack">
                  <div className="alert info">Importe reservado: <strong>{money(authorization.amount_minor)}</strong> · {authorization.method === 'cash' ? 'Efectivo' : authorization.method === 'card' ? 'Tarjeta' : 'Yape'}</div>
                  {authorization.method === 'cash' ? (
                    <>
                      <Field label="Efectivo recibido (S/)"><input inputMode="decimal" value={form.received ?? ''} onChange={e => update('received', e.target.value)} /></Field>
                      <div className="change-preview">{(()=>{const value=cashChange(form.received??'',authorization.amount_minor);return <><span>{value.kind==='insufficient'?'Falta efectivo':'Vuelto'}</span><strong>{value.kind==='change'?money(value.amount):value.kind==='insufficient'?money(value.shortfall):'—'}</strong></>;})()}</div>
                    </>
                  ) : (
                    <>
                      <p className="small">Verifica el pago en el dispositivo/app del comercio. No basta la captura del cliente. Aquí se registra evidencia manual sintética.</p>
                      <Field label="Cuenta o terminal del comercio"><input value="comercio-laboratorio" readOnly placeholder="Ej.: terminal-demo-01" /></Field>
                      <Field label="Referencia de operación"><input value={form.reference ?? ''} onChange={e => update('reference', e.target.value)} placeholder="Referencia verificable del comercio" /></Field>
                    </>
                  )}
                  <button className="primary" disabled={disabled || (authorization.method==='cash' && cashChange(form.received??'',authorization.amount_minor).kind!=='change')} onClick={() => void guarded(confirmPayment)}>{authorization.method === 'cash' ? 'Confirmar efectivo y cambio' : 'Confirmar pago verificado por cajero'}</button>
                  <div className="button-row" style={{ marginTop: '4px' }}>
                    {authorization.method !== 'cash' && (
                      <button className="secondary" disabled={disabled} onClick={() => setDialog({ title: 'Conservar resultado incierto', description: 'La cuota seguirá retenida. No se autoriza otro cobro hasta resolver el resultado con evidencia.', label: 'Registrar como incierto', action: async () => { const response = await execute({ type: 'payment.unknown', authorization_id: authorization.id, reason: 'Resultado externo no confirmado por cajero en laboratorio' }, 'Resultado incierto guardado. El importe permanece retenido.'); if (response) setAuthorization(null); setDialog(null); } })}>No puedo confirmar el resultado</button>
                    )}
                    <button
                      type="button"
                      className="secondary danger"
                      disabled={disabled}
                      onClick={() => {
                        setReleaseTarget(authorization);
                        setReleaseReason('Cliente prefiere pagar en efectivo');
                      }}
                    >
                      Liberar cobro retenido
                    </button>
                  </div>
                </div>
              )}
              <details className="note-details"><summary>Documento interno de esta cuenta</summary><p className="small muted">La nota interna no sustituye boleta o factura ni resuelve obligación fiscal.</p><button className="secondary" disabled={disabled || checkPaymentState(selectedCheck)!=='paid' || snapshot.sales_notes.some(n=>n.check_id===selectedCheck.id)} onClick={() => void execute({ type: 'sale.note', check_id: selectedCheck.id, expected_version: selectedCheck.version }, 'Nota interna creada; comprobante de pago fiscal sigue pendiente.')}>Crear nota de venta interna</button>{snapshot.sales_notes.filter(n => n.check_id === selectedCheck.id).map(n => <p key={n.id} className="small"><strong>{n.reference} · {money(n.total_minor)}</strong><br />{n.legend}</p>)}</details>
            </> : <Empty title="Cada cobro, con respaldo" text="Elige una mesa para registrar efectivo, tarjeta o Yape." />}
          </section>
        </div>

        {selectedCheck && (
          <section className="panel orders-panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-heading">
              <div>
                <h2>Comandas y Anulaciones · {tableLabel(selectedCheck.visit_id)}</h2>
                <span className="muted small">Líneas de pedido de la mesa. Anulaciones exclusivas de Caja/Admin.</span>
              </div>
              <span className="badge">{selectedOrders.length} tanda(s)</span>
            </div>
            {selectedOrders.length === 0 ? (
              <Empty title="Sin comandas registradas" text="Esta mesa aún no ha enviado pedidos a cocina o caja." />
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Tanda</th>
                      <th>Producto</th>
                      <th>Estación</th>
                      <th>Cant. Solicitada</th>
                      <th>Entregados</th>
                      <th>Anulados</th>
                      <th>Subtotal</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrders.flatMap(o =>
                      o.lines.map(l => {
                        const activeQty = l.quantity - (l.voided_quantity ?? 0);
                        const isFullyVoided = activeQty <= 0;
                        return (
                          <tr key={l.id} style={isFullyVoided ? { opacity: 0.5, textDecoration: 'line-through' } : {}}>
                            <td><small>Tanda {o.batch_number} · {time(o.created_at)}</small></td>
                            <td>
                              <strong>{l.product_name}</strong>
                              {l.note && <small>Nota: {l.note}</small>}
                            </td>
                            <td><span className={`station-label station-${l.station}`}>{stationName[l.station]}</span></td>
                            <td>{l.quantity} u.</td>
                            <td>{l.fulfilled_quantity} u.</td>
                            <td>
                              {l.voided_quantity > 0 ? (
                                <span className="badge danger">
                                  {l.voided_quantity} u.
                                  {l.void_reason ? ` (${l.void_reason})` : ''}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td><strong>{money(l.unit_price_minor * activeQty)}</strong></td>
                            <td>
                              {activeQty > 0 && isFinancial && (
                                <button
                                  type="button"
                                  className="secondary danger"
                                  style={{ minHeight: '32px', padding: '4px 10px', fontSize: '11px' }}
                                  disabled={disabled || !selectedConsumptionEditable}
                                  onClick={() => {
                                    setVoidTarget({ line: l, visit: selectedVisit! });
                                    setVoidQty(activeQty);
                                    setVoidReason('');
                                    setVoidRestoreStock(l.fulfilled_quantity > 0 && !pendingCountFor(snapshot, l.stock_item_id ?? ''));
                                  }}
                                >
                                  Anular
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {isFinancial && snapshot.void_audit && snapshot.void_audit.length > 0 && (
          <section className="panel void-audit-panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-heading">
              <div>
                <h2>Auditoría de Anulaciones</h2>
                <span className="muted small">Trazabilidad inmutable de productos anulados en el salón</span>
              </div>
              <span className="badge danger">{snapshot.void_audit.length} registro(s)</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Responsable</th>
                    <th>Mesa / Visita</th>
                    <th>Cantidad</th>
                    <th>Importe</th>
                    <th>Stock Repuesto</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.void_audit.slice().reverse().map(entry => {
                    const tableVisit = snapshot.visits.find(v => v.id === entry.visit_id);
                    const tableName = tableVisit ? tableLabel(tableVisit.id) : 'Mesa';
                    return (
                      <tr key={entry.id}>
                        <td><small>{time(entry.created_at)}</small></td>
                        <td><strong>{human(entry.actor_id)}</strong></td>
                        <td>{tableName}</td>
                        <td><strong>{entry.quantity} u.</strong></td>
                        <td><strong>{money(entry.amount_minor)}</strong></td>
                        <td>
                          {entry.restored_stock ? (
                            <span className="badge teal" style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}>Sí · almacén</span>
                          ) : (
                            <span className="badge">No · merma / sin entrega</span>
                          )}
                        </td>
                        <td><em>{entry.reason}</em></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isFinancial && snapshot.discount_audit && snapshot.discount_audit.length > 0 && (
          <section className="panel discount-audit-panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-heading">
              <div>
                <h2>Auditoría de Descuentos y Cortesías</h2>
                <span className="muted small">Trazabilidad inmutable de concesiones comerciales aplicadas o retiradas en cuentas de mesa</span>
              </div>
              <span className="badge amber">{snapshot.discount_audit.length} registro(s)</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Responsable</th>
                    <th>Mesa / Visita</th>
                    <th>Acción</th>
                    <th>Tipo / %</th>
                    <th>Descuento</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.discount_audit.slice().reverse().map(entry => {
                    const tableVisit = snapshot.visits.find(v => v.id === entry.visit_id);
                    const tableName = tableVisit ? tableLabel(tableVisit.id) : 'Mesa';
                    const isApplied = entry.discount_minor > 0;
                    return (
                      <tr key={entry.id}>
                        <td><small>{time(entry.created_at)}</small></td>
                        <td><strong>{human(entry.actor_id)}</strong></td>
                        <td>{tableName}</td>
                        <td>
                          <span className={`badge ${isApplied ? 'teal' : 'danger'}`}>
                            {isApplied ? 'Aplicado' : 'Retirado'}
                          </span>
                        </td>
                        <td>
                          {isApplied
                            ? (entry.discount_kind === 'percentage' ? `${entry.discount_percent}%` : 'Monto fijo')
                            : '—'}
                        </td>
                        <td><strong>{isApplied ? money(entry.discount_minor) : '—'}</strong></td>
                        <td><em>{entry.reason}</em></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <PendingPayments snapshot={snapshot} ownedCashId={ownedCash?.id} disabled={disabled} form={form} update={update} onResolve={async payment => { if (!ownedCash) return; await guarded(async () => { await execute({ type: 'payment.resolve', payment_id: payment.id, expected_version: payment.version, cash_session_id: ownedCash.id, evidence: { source: 'merchant_verified', merchant_account: 'comercio-laboratorio', external_reference: form[`ref:${payment.id}`] ?? '', observed_at: new Date().toISOString() } }, 'Pago incierto resuelto con evidencia.'); }); }} />
        <section className="panel movement-panel">
          <h2>Entradas y salidas de efectivo</h2>
          <p className="muted small">Son movimientos del cajón. No se registran como ventas.</p>
          <form onSubmit={e => { e.preventDefault(); void guarded(async () => { if (!ownedCash) return; const response = await execute({ type: 'cash.move', cash_session_id: ownedCash.id, expected_version: ownedCash.version, kind: form.moveKind === 'paid_in' ? 'paid_in' : 'paid_out', amount_minor: parseMoney(form.moveAmount ?? ''), reason: form.moveReason ?? '' }, 'Movimiento físico de efectivo registrado.'); if (response) setForm({}); }); }} className="inline-form">
            <Field label="Movimiento">
              <select value={form.moveKind ?? 'paid_out'} onChange={e => update('moveKind', e.target.value)}>
                <option value="paid_out">Retiro / salida</option>
                <option value="paid_in">Depósito / entrada</option>
              </select>
            </Field>
            <Field label="Importe (S/)"><input inputMode="decimal" value={form.moveAmount ?? ''} onChange={e => update('moveAmount', e.target.value)} required /></Field>
            <Field label="Motivo"><input value={form.moveReason ?? ''} onChange={e => update('moveReason', e.target.value)} required /></Field>
            <button className="secondary" disabled={disabled || !ownedCash}>Registrar movimiento</button>
          </form>
        </section>

        {isFinancial && (
          <section className="panel fiscal-documents-panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-heading">
              <div>
                <h2>{operational?'Facturación pendiente de integración':'Documentos fiscales simulados'}</h2>
                <span className="muted small">Registros de laboratorio sin firma XML, QR fiscal válido ni aceptación SUNAT.</span>
              </div>
              <span className="badge">{(snapshot.fiscal_documents ?? []).length} emitido(s)</span>
            </div>
            {(!snapshot.fiscal_documents || snapshot.fiscal_documents.length === 0) ? (
              <Empty title="Sin documentos simulados registrados" text="La emisión real requiere conectar y homologar el proveedor fiscal." />
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Comprobante</th>
                      <th>Tipo</th>
                      <th>Fecha y Hora</th>
                      <th>Cliente / Razón Social</th>
                      <th>Documento</th>
                      <th>Op. Gravada</th>
                      <th>IGV (18%)</th>
                      <th>Total</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.fiscal_documents.slice().reverse().map(doc => {
                      const isAnnulled = doc.status === 'annulled' || Boolean(doc.credit_note_id);
                      const isCreditNote = doc.doc_type === 'nota_credito';
                      return (
                        <tr key={doc.id} style={{ opacity: isAnnulled ? 0.75 : 1 }}>
                          <td>
                            <strong>{doc.full_number}</strong>
                            {isAnnulled && (
                              <div style={{ fontSize: '10px', color: '#b91c1c', fontWeight: 600, marginTop: '2px' }}>
                                ⚠️ Anulado por {doc.credit_note_full_number}
                              </div>
                            )}
                            {isCreditNote && doc.modified_document_full_number && (
                              <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                                Modifica: {doc.modified_document_full_number} (Motivo {doc.sunat_reason_code})
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${isCreditNote ? 'danger' : doc.doc_type === 'factura' ? 'teal' : 'amber'}`}>
                              {isCreditNote ? 'Nota de Crédito' : doc.doc_type === 'factura' ? 'Factura' : 'Boleta'}
                            </span>
                          </td>
                          <td><small>{time(doc.created_at)}</small></td>
                          <td><strong>{doc.customer_name}</strong></td>
                          <td>
                            <small>
                              {doc.customer_doc_type.toUpperCase()}: {doc.customer_doc_number || 'Sin doc.'}
                            </small>
                          </td>
                          <td>{isCreditNote ? `-${money(doc.op_gravada_minor)}` : money(doc.op_gravada_minor)}</td>
                          <td>{isCreditNote ? `-${money(doc.igv_minor)}` : money(doc.igv_minor)}</td>
                          <td>
                            <strong style={{ color: isCreditNote ? '#b91c1c' : undefined }}>
                              {isCreditNote ? `-${money(doc.total_minor)}` : money(doc.total_minor)}
                            </strong>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="secondary"
                                style={{ minHeight: '28px', padding: '2px 8px', fontSize: '11px' }}
                                onClick={() => setViewingFiscalDoc(doc)}
                              >
                                {isCreditNote ? '🖨️ Ticket NC' : '🖨️ Reimprimir Ticket'}
                              </button>
                              {!isCreditNote && !isAnnulled && (
                                <button
                                  type="button"
                                  className="secondary danger"
                                  style={{ minHeight: '28px', padding: '2px 8px', fontSize: '11px' }}
                                  disabled={disabled || operational}
                                  onClick={() => setCreditNoteTargetDoc(doc)}
                                  title="Anular formalmente emitiendo Nota de Crédito ante SUNAT"
                                >
                                  ❌ Anular con NC
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </>;
    })()}

    {screen === 'turno' && <><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}><div style={{ flex: 1, minWidth: '240px' }}><CashStatus cash={cash} userName={cash ? human(cash.owner_id) : undefined} /></div>{isFinancial && <button type="button" className="secondary" style={{ minHeight: '34px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }} onClick={() => setViewingCashAudit(true)}><span>📊</span> Ver Arqueo de Turno (Corte X)</button>}</div>{!cash && snapshot.business_day.state === 'open' && <section className="panel narrow-panel"><span className="eyebrow">INICIO DE TURNO</span><h2>Abrir mi caja</h2><p className="muted">Declara el fondo físico inicial. No es una venta.</p><form className="form-stack" onSubmit={e => { e.preventDefault(); void guarded(async () => { await execute({ type: 'cash.open', opening_minor: parseMoney(form.opening ?? ''), shift_label: form.shift === 'nocturno' ? 'nocturno' : 'diurno', expected_day_version: snapshot.business_day.version }, 'Sesión de caja abierta a tu nombre.'); }); }}><Field label="Turno"><select value={form.shift ?? 'diurno'} onChange={e => update('shift', e.target.value)}><option value="diurno">Diurno · mañana / tarde</option><option value="nocturno">Nocturno</option></select></Field><Field label="Fondo físico inicial (S/)"><input inputMode="decimal" value={form.opening ?? ''} onChange={e => update('opening', e.target.value)} required /></Field><button className="primary" disabled={disabled}>Abrir mi sesión</button></form></section>}{cash?.state === 'open' && ownedCash && <section className="panel narrow-panel"><span className="eyebrow">TRASPASO DIURNO → NOCTURNO</span><h2>Entregar caja y bebidas</h2><p className="muted">Primero se prepara un corte. Después cuentas sin ver los saldos esperados y el siguiente responsable verifica.</p><form className="form-stack" onSubmit={e => { e.preventDefault(); void guarded(async () => { await execute({ type: 'handover.begin', cash_session_id: cash.id, expected_version: cash.version, incoming_user_id: form.incoming ?? '' }, 'Corte preparado. Caja y bebidas están protegidas durante el conteo.'); }); }}><Field label="Recibe el turno"><select value={form.incoming ?? ''} onChange={e => update('incoming', e.target.value)} required><option value="">Selecciona al responsable</option>{snapshot.staff.filter(s => ['cashier', 'admin'].includes(s.role) && s.id !== session.user.id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><button className="primary" disabled={disabled}>Preparar corte y comenzar conteo</button></form></section>}{activeHandover && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">CAJA Y CUSTODIA DE BEBIDAS</span><h2>{activeHandover.state === 'prepared' ? 'Conteo ciego' : 'Verificar traspaso'}</h2></div><span className="badge amber">{activeHandover.state === 'prepared' ? 'Contando' : activeHandover.state === 'disputed' ? 'Con diferencias' : 'Declarado'}</span></div><div className="handover-people"><span>Entrega: <strong>{human(activeHandover.outgoing_user_id)}</strong></span><span>Recibe: <strong>{human(activeHandover.incoming_user_id)}</strong></span></div>{activeHandover.state === 'prepared' && activeHandover.outgoing_user_id === session.user.id ? <form className="form-stack" onSubmit={e => { e.preventDefault(); void guarded(async () => { await execute({ type: 'handover.count', handover_id: activeHandover.id, expected_version: activeHandover.version, counted_cash_minor: parseMoney(form.countedCash ?? ''), stock_counts: countLines() }, 'Declaración guardada. Ahora se muestran las diferencias sin cambiar el original.'); }); }}><div className="alert info">Cuenta el efectivo y las unidades físicas. Los esperados permanecen ocultos hasta guardar.</div><Field label="Efectivo contado (S/)"><input inputMode="decimal" value={form.countedCash ?? ''} onChange={e => update('countedCash', e.target.value)} required /></Field><BlindStock stock={beverages} counts={counts} setCounts={setCounts} /><button className="primary" disabled={disabled}>Guardar declaración de conteo</button></form> : activeHandover.state === 'prepared' ? <p className="muted">El responsable saliente está declarando su conteo.</p> : <><div className="summary-grid"><Metric label="Efectivo esperado" value={displayMoney(activeHandover.expected_cash_minor)} /><Metric label="Efectivo contado" value={displayMoney(activeHandover.counted_cash_minor)} /><Metric label="Diferencia" value={displayMoney(activeHandover.difference_cash_minor)} /></div><StockComparison lines={activeHandover.stock_lines} snapshot={snapshot} /><p className="small muted">{activeHandover.pending_payment_ids.length} pagos inciertos permanecen pendientes. Recibir el turno no los confirma.</p>{isAdmin && <div className="approval-box"><Field label="Motivo de aprobación de diferencias"><input value={form.approval ?? ''} onChange={e => update('approval', e.target.value)} placeholder="Explicación y evidencia de la revisión" /></Field><button className="secondary" disabled={disabled || !form.approval?.trim()} onClick={() => void execute({ type: 'handover.approve', handover_id: activeHandover.id, expected_version: activeHandover.version, reason: form.approval ?? '' }, 'Diferencias revisadas con aprobación administrativa.')}>Aprobar diferencias con auditoría</button></div>}{activeHandover.incoming_user_id === session.user.id ? <div className="form-stack"><button className="primary" disabled={disabled} onClick={() => void execute({ type: 'handover.accept', handover_id: activeHandover.id, expected_version: activeHandover.version }, 'Traspaso aceptado. La nueva sesión está a tu nombre.')}>Confirmar recepción de caja y bebidas</button><Field label="Motivo si rechazas el traspaso"><input value={form.reject ?? ''} onChange={e => update('reject', e.target.value)} /></Field><button className="secondary danger" disabled={disabled || !form.reject?.trim()} onClick={() => void execute({ type: 'handover.reject', handover_id: activeHandover.id, expected_version: activeHandover.version, reason: form.reject ?? '' }, 'Rechazo registrado. Se requiere revisión del traspaso.')}>Rechazar y solicitar revisión</button></div> : <p className="alert info">Cambiar al usuario receptor para verificar y aceptar. Nunca se firma por otro empleado.</p>}</>}{isAdmin && ![activeHandover.outgoing_user_id, activeHandover.incoming_user_id].includes(session.user.id) && <div className="approval-box"><h3>Cancelar corte sin transferir custodia</h3><p className="muted">Conserva el conteo original. La misma caja vuelve al saliente para conciliar y empezar un nuevo traspaso; no modifica dinero ni existencias.</p><Field label="Motivo de cancelación del corte"><input minLength={3} maxLength={500} value={form.cancelHandover ?? ''} onChange={e => update('cancelHandover', e.target.value)} /></Field><button className="secondary danger" disabled={disabled || (form.cancelHandover?.trim().length ?? 0) < 3} onClick={() => setDialog({ title: 'Cancelar el corte', description: 'La custodia sigue con el saliente. El conteo sellado permanece en el historial y deberá iniciarse otro traspaso.', label: 'Cancelar corte conservando conteo', action: async () => { await execute({ type: 'handover.cancel', handover_id: activeHandover.id, expected_version: activeHandover.version, reason: form.cancelHandover ?? '' }, 'Corte cancelado con auditoría. La caja continúa a nombre del saliente.'); } })}>Revisar cancelación del corte</button></div>}</section>}{snapshot.handovers.filter(h => h.state === 'cancelled').map(h => <section className="panel history-panel" key={h.id}><strong>Corte cancelado · conteo conservado</strong><span>{human(h.outgoing_user_id)} conserva custodia</span><span>{h.cancellation_reason} · administración: {h.cancelled_by ? human(h.cancelled_by) : 'Registrada'}</span></section>)}{snapshot.handovers.filter(h => h.state === 'accepted').map(h => <section className="panel history-panel" key={h.id}><strong>✓ Traspaso recibido</strong><span>{human(h.outgoing_user_id)} → {human(h.incoming_user_id)}</span><span>Fondo recibido {displayMoney(h.counted_cash_minor)} · diferencias conservadas</span></section>)}</>}

    {screen === 'personal' && <StaffPanel snapshot={snapshot} csrf={session.csrf_token} disabled={disabled} onAction={execute} onRefresh={refresh} />}
    {screen === 'stock' && <InventoryPanel snapshot={snapshot} disabled={disabled} onAction={execute} />}

    {screen === 'dia' && <><NightClosePanel snapshot={snapshot} disabled={disabled} onAction={execute} />{isAdmin && snapshot.business_day.state !== 'open' && <section className="panel narrow-panel"><span className="eyebrow">{operational ? 'CONTINUIDAD DEL RESTAURANTE' : 'CONTINUIDAD DEL LABORATORIO'}</span><h2>Comenzar el siguiente día</h2><p className="muted">Conserva cierres, cuentas y pagos pendientes del día anterior. {operational ? 'Revisa la fecha y los pendientes antes de abrir la nueva jornada.' : 'La fecha avanza únicamente para ensayar este laboratorio.'}</p><Field label="Motivo de apertura del siguiente día"><input value={form.nextDayReason ?? ''} onChange={e => update('nextDayReason', e.target.value)} /></Field><button className="primary" disabled={disabled || !form.nextDayReason?.trim()} onClick={() => void guarded(async () => { const response = await execute({ type: 'day.open', expected_day_version: snapshot.business_day.version, reason: form.nextDayReason ?? '' }, 'Nuevo día operativo abierto. Cada cajero puede iniciar su turno.'); if(response) setForm({}); })}>{operational ? 'Comenzar siguiente día' : 'Comenzar siguiente día de prueba'}</button></section>}<div className="alert info">Ventas, cobros y dinero del cajón tienen significados distintos. Los fondos entre turnos no se suman como ingreso.</div>{cash && ownedCash && cash.state === 'open' && <section className="panel"><span className="eyebrow">CORTE FINAL DEL DÍA</span><h2>Declarar cierre de mi sesión</h2><p className="muted small">Guarda un corte provisional conservando cuentas, fiscalidad y pagos pendientes. El siguiente paso requiere revisión para declarar conciliado.</p><form className="form-stack" onSubmit={e => { e.preventDefault(); setDialog({ title: 'Guardar cierre del día', description: 'Se cierra esta sesión y se conserva el reporte firmado. No se confirma ningún pago incierto ni comprobante fiscal. Revisa el efectivo y cada bebida antes de guardar.', label: 'Confirmar cierre provisional', action: async () => { await guarded(async () => { const response = await execute({ type: 'day.close', cash_session_id: cash.id, expected_version: cash.version, expected_day_version: snapshot.business_day.version, counted_cash_minor: parseMoney(form.finalCash ?? ''), stock_counts: countLines(), reason: form.closeReason ?? '' }, 'Cierre provisional guardado. Los pendientes conservan su estado y responsables.'); if (response) setForm({}); }); setDialog(null); } }); }}><Field label="Efectivo final contado (S/)"><input inputMode="decimal" value={form.finalCash ?? ''} onChange={e => update('finalCash', e.target.value)} required /></Field><BlindStock stock={beverages} counts={counts} setCounts={setCounts} /><Field label="Observaciones del cierre"><input value={form.closeReason ?? ''} onChange={e => update('closeReason', e.target.value)} required /></Field><button className="primary" disabled={disabled}>Revisar y guardar cierre</button></form></section>}{latestClose ? <section className="panel"><div className="panel-heading"><div><span className="eyebrow">REVISIÓN {latestClose.revision} · {time(latestClose.created_at)}</span><h2>Resultado del día</h2></div><span className={`badge ${latestClose.state === 'reconciled' ? 'teal' : 'amber'}`}>{latestClose.operational_status === 'reconciled' ? 'Caja y bebidas conciliadas · fiscal pendiente' : latestClose.state === 'reconciled' ? 'Conciliado' : 'Provisional · con pendientes'}</span></div><div className="summary-grid"><Metric label="Ventas registradas" value={money(latestClose.sales_minor)} /><Metric label="Cobros confirmados" value={money(latestClose.collections_minor)} /><Metric label="Diferencia de efectivo" value={money(latestClose.cash_difference_minor)} /></div><div className="reconciliation-grid"><div><h3>Cobros por medio</h3><ReportRow label="Efectivo" value={money(latestClose.cash_collections_minor)} /><ReportRow label="Tarjeta" value={money(latestClose.card_collections_minor)} /><ReportRow label="Yape" value={money(latestClose.yape_collections_minor)} /><ReportRow label="Cobranza de días anteriores" value={money(latestClose.prior_day_collections_minor)} /></div><div><h3>Dinero físico</h3><ReportRow label="Fondo externo inicial" value={money(latestClose.initial_external_float_minor)} /><ReportRow label="Entradas externas" value={money(latestClose.external_paid_in_minor)} /><ReportRow label="Salidas / retiros" value={money(latestClose.external_paid_out_minor)} /><ReportRow label="Final esperado" value={money(latestClose.expected_final_cash_minor)} /><ReportRow label="Final contado" value={money(latestClose.counted_final_cash_minor)} /></div></div><h3>Pendientes conservados</h3><div className="pending-chips"><span>{latestClose.open_check_ids.length} cuentas con saldo</span><span>{latestClose.unknown_payment_ids.length} pagos inciertos</span><span>{latestClose.pending_fiscal_check_ids.length} documentos fiscales pendientes</span><span>{latestClose.included_cash_session_ids.length} turnos incluidos</span></div>{latestClose.reconciliation_notes.map((n, i) => <p className="small muted" key={i}>{n}</p>)}<StockComparison lines={latestClose.stock_lines} snapshot={snapshot} /><p className="small muted">No equivale a liquidación bancaria. Los abonos y comisiones requieren su propia conciliación.</p></section> : <Empty title="El día sigue en curso" text="Al cerrar se consolidan los turnos y se conservan las diferencias, sin duplicar fondos internos." />}<section className="panel"><h2>Sesiones incluidas en la operación</h2><div className="table-scroll"><table><thead><tr><th>Turno</th><th>Responsable</th><th>Fondo</th><th>Esperado</th><th>Estado</th></tr></thead><tbody>{snapshot.cash_sessions.filter(c => latestClose ? latestClose.included_cash_session_ids.includes(c.id) : c.business_day_id === snapshot.business_day.id).map(c => <tr key={c.id}><td>{c.shift_label === 'diurno' ? 'Diurno' : 'Nocturno'}</td><td>{human(c.owner_id)}</td><td>{money(c.opening_minor)}</td><td>{displayMoney(c.expected_minor)}</td><td>{c.state === 'open' ? 'Abierto' : c.state === 'counting' ? 'Contando' : 'Cerrado'}</td></tr>)}</tbody></table></div></section></>}

    {screen === 'carta' && isAdmin && <CatalogManagement snapshot={snapshot} disabled={disabled} onAction={execute} />}

    </main><footer className="workspace-footer"><span>QatuPOS <strong>·</strong> Cada operación conserva su historia.</span><span>QR/NFC, ecommerce y Delivery: habilitación posterior</span></footer></div>
    {dialog && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) setDialog(null); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><span className="eyebrow">CONFIRMAR OPERACIÓN</span><h2 id="dialog-title">{dialog.title}</h2><p>{dialog.description}</p><div className="button-row"><button className="secondary" autoFocus disabled={busy} onClick={() => setDialog(null)}>Volver y revisar</button><button className="primary" disabled={disabled} onClick={() => void guarded(dialog.action)}>{busy ? 'Procesando…' : dialog.label}</button></div></section></div>}
    {voidTarget && (
      <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) setVoidTarget(null); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="void-dialog-title">
          <span className="eyebrow" style={{ color: 'var(--danger)' }}>ANULACIÓN DE COMANDA</span>
          <h2 id="void-dialog-title">Anular {voidTarget.line.product_name}</h2>
          <p style={{ margin: '8px 0 16px', fontSize: '13px', color: 'var(--muted)' }}>
            Esta acción recalcula la cuenta de la mesa, genera ticket rotulado a cocina/heladería y audita la operación.
          </p>
          <form onSubmit={e => { e.preventDefault(); void guarded(confirmVoidLine); }} className="form-stack">
            <Field label={`Cantidad a anular (máximo ${voidTarget.line.quantity - (voidTarget.line.voided_quantity ?? 0)})`}>
              <input
                type="number"
                min="1"
                max={voidTarget.line.quantity - (voidTarget.line.voided_quantity ?? 0)}
                value={voidQty}
                onChange={e => setVoidQty(Math.max(1, Math.min(voidTarget.line.quantity - (voidTarget.line.voided_quantity ?? 0), parseInt(e.target.value) || 1)))}
                required
              />
            </Field>
            <Field label="Motivo de la anulación (obligatorio, mín. 3 caracteres)">
              <input
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Ej.: Error al ordenar / Cliente cambió de opinión / Merma"
                required
                minLength={3}
                autoFocus
              />
            </Field>
            {voidTarget.line.fulfilled_quantity > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '8px 0', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={voidRestoreStock}
                  disabled={!!pendingCountFor(snapshot, voidTarget.line.stock_item_id ?? '')}
                  onChange={e => setVoidRestoreStock(e.target.checked)}
                />
                <span>Reincorporar {voidQty} u. al inventario físico de almacén (no hubo consumo ni merma)</span>
              </label>
            )}
            {pendingCountFor(snapshot, voidTarget.line.stock_item_id ?? '') && <p className="alert info">Este producto tiene un conteo pendiente. Puedes conciliar reservas mediante anulación; no reintegrar unidades físicas. Después será necesario recontar.</p>}
            <div className="button-row" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
              <button type="button" className="secondary" disabled={busy} onClick={() => setVoidTarget(null)}>
                Cancelar
              </button>
              <button type="submit" className="primary danger" disabled={disabled || voidReason.trim().length < 3}>
                {busy ? 'Procesando…' : `Confirmar anulación (${voidQty} u.)`}
              </button>
            </div>
          </form>
        </section>
      </div>
    )}
    {releaseTarget && (
      <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) setReleaseTarget(null); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="release-dialog-title">
          <span className="eyebrow" style={{ color: 'var(--amber)' }}>LIBERAR COBRO RETENIDO</span>
          <h2 id="release-dialog-title">Liberar cobro ({money(releaseTarget.amount_minor)})</h2>
          <p style={{ margin: '8px 0 16px', fontSize: '13px', color: 'var(--muted)' }}>
            Cancela la autorización pendiente ({releaseTarget.method === 'cash' ? 'Efectivo' : releaseTarget.method === 'card' ? 'Tarjeta' : 'Yape'}) para devolver el importe al saldo disponible de la cuenta.
          </p>
          <form onSubmit={e => { e.preventDefault(); void guarded(confirmReleaseAuth); }} className="form-stack">
            <Field label="Motivo de liberación (obligatorio, mín. 3 caracteres)">
              <input
                value={releaseReason}
                onChange={e => setReleaseReason(e.target.value)}
                placeholder="Ej.: Cliente prefiere pagar en efectivo / Tarjeta declinada"
                required
                minLength={3}
                autoFocus
              />
            </Field>
            <div className="button-row" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
              <button type="button" className="secondary" disabled={busy} onClick={() => setReleaseTarget(null)}>
                Volver
              </button>
              <button type="submit" className="primary" disabled={disabled || releaseReason.trim().length < 3}>
                {busy ? 'Procesando…' : 'Liberar saldo'}
              </button>
            </div>
          </form>
        </section>
      </div>
    )}

    {precuentaData && (
      <ThermalReceiptModal
        mode="precuenta"
        precuenta={{...precuentaData,check:snapshot.checks.find(c=>c.id===precuentaData.check.id)??precuentaData.check,orders:snapshot.orders.filter(o=>o.check_id===precuentaData.check.id),cutAt:snapshot.server_time}}
        onClose={() => setPrecuentaData(null)}
        onOpenIssueModal={
          !operational && isFinancial && checkPaymentState(snapshot.checks.find(c=>c.id===precuentaData.check.id)??precuentaData.check)==='paid' && !hasFiscalDocument(precuentaData.check.id)
            ? () => {
                const checkToIssue = snapshot.checks.find(c => c.id === precuentaData.check.id) ?? precuentaData.check;
                setPrecuentaData(null);
                setIssueFiscalCheck(checkToIssue);
              }
            : undefined
        }
      />
    )}

    {issueFiscalCheck && (
      <IssueFiscalModal
        check={snapshot.checks.find(c => c.id === issueFiscalCheck.id) ?? issueFiscalCheck}
        tableLabel={tableLabel(issueFiscalCheck.visit_id)}
        busy={busy}
        onClose={() => setIssueFiscalCheck(null)}
        onSubmit={handleIssueFiscal}
      />
    )}

    {viewingFiscalDoc && (
      <ThermalReceiptModal
        mode="fiscal"
        fiscalDoc={viewingFiscalDoc}
        onClose={() => setViewingFiscalDoc(null)}
      />
    )}

    {discountTargetCheck && (
      <ApplyDiscountModal
        check={snapshot.checks.find(c => c.id === discountTargetCheck.id) ?? discountTargetCheck}
        tableLabel={tableLabel(discountTargetCheck.visit_id)}
        grossTotal={(snapshot.checks.find(c => c.id === discountTargetCheck.id) ?? discountTargetCheck).total_minor + ((snapshot.checks.find(c => c.id === discountTargetCheck.id) ?? discountTargetCheck).discount_minor ?? 0)}
        disabled={disabled}
        onApply={handleApplyDiscount}
        onRemove={handleRemoveDiscount}
        onClose={() => setDiscountTargetCheck(null)}
      />
    )}

    {viewingCashAudit && (
      <CashAuditModal
        snapshot={snapshot}
        onClose={() => setViewingCashAudit(false)}
      />
    )}

    {creditNoteTargetDoc && (
      <IssueCreditNoteModal
        document={creditNoteTargetDoc}
        busy={busy}
        onClose={() => setCreditNoteTargetDoc(null)}
        onSubmit={handleIssueCreditNote}
      />
    )}
  </div>;
}

function Brand() { return <div className="brand"><span className="brand-mark">q</span><strong>qatu<span>pos</span></strong></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span className="empty-symbol">✓</span><h3>{title}</h3><p>{text}</p></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function ReportRow({ label, value }: { label: string; value: string }) { return <div className="report-row"><span>{label}</span><strong>{value}</strong></div>; }
function CashStatus({ cash, userName }: { cash: PosSnapshot['cash_sessions'][number] | undefined; userName?: string }) { return <div className="cash-status"><div><span className={`status-dot ${cash ? '' : 'offline'}`} /><strong>{cash ? `Caja ${cash.shift_label === 'diurno' ? 'diurna' : 'nocturna'} · ${cash.state === 'counting' ? 'conteo en curso' : 'abierta'}` : 'Caja sin sesión activa'}</strong><span className="muted small">{userName ?? 'Abre tu sesión para registrar cobros'}</span></div>{cash && <span>Fondo inicial <strong>{money(cash.opening_minor)}</strong></span>}</div>; }
function BlindStock({ stock, counts, setCounts }: { stock: PosSnapshot['stock']; counts: Record<string, string>; setCounts: React.Dispatch<React.SetStateAction<Record<string, string>>> }) { return <div className="blind-count-list">{stock.map(s => <Field label={`${s.name} · unidades físicas`} key={s.id}><input inputMode="numeric" min="0" value={counts[s.id] ?? ''} onChange={e => setCounts(previous => ({ ...previous, [s.id]: e.target.value }))} placeholder="Contar físicamente" required /></Field>)}</div>; }
function StockComparison({ lines, snapshot }: { lines: { stock_item_id: string; expected_quantity: number | null; counted_quantity: number; difference_quantity: number | null }[]; snapshot: PosSnapshot }) { return <div className="table-scroll"><table><thead><tr><th>Producto</th><th>Esperado</th><th>Contado</th><th>Diferencia</th></tr></thead><tbody>{lines.map(l => <tr key={l.stock_item_id}><td>{snapshot.stock.find(s => s.id === l.stock_item_id)?.name ?? l.stock_item_id}</td><td>{displayQty(l.expected_quantity)}</td><td>{l.counted_quantity}</td><td className={l.difference_quantity ? 'text-amber' : ''}>{displayQty(l.difference_quantity)}</td></tr>)}</tbody></table></div>; }
function PendingPayments({ snapshot, ownedCashId, disabled, form, update, onResolve }: { snapshot: PosSnapshot; ownedCashId?: string; disabled: boolean; form: Record<string, string>; update: (name: string, value: string) => void; onResolve: (payment: PosSnapshot['payments'][number]) => Promise<void> }) { const pending = snapshot.payments.filter(p => p.status === 'unknown'); return pending.length ? <section className="panel"><h2>Pagos inciertos · saldo protegido</h2>{pending.map(p => <div className="pending-payment" key={p.id}><div><strong>{money(p.amount_minor)} · {p.method === 'yape' ? 'Yape' : 'Tarjeta'}</strong><span className="small muted">Se conserva la intención original. Resolver exige evidencia del comercio.</span></div><div className="inline-form"><Field label="Cuenta del comercio configurada"><input value="comercio-laboratorio" readOnly /></Field><Field label="Referencia confirmada"><input value={form[`ref:${p.id}`] ?? ''} onChange={e => update(`ref:${p.id}`, e.target.value)} /></Field><button className="secondary" disabled={disabled || !ownedCashId || !form[`ref:${p.id}`]?.trim()} onClick={() => void onResolve(p)}>Resolver con evidencia</button></div></div>)}</section> : null; }
