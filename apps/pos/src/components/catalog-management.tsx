'use client';

import { useState } from 'react';
import type { PosSnapshot, Product, Station } from '@qatu/contracts';
import { type CommandInput, money, parseMoney, stationName } from '../lib/client';

interface Props {
  snapshot: PosSnapshot;
  disabled: boolean;
  onAction: (input: CommandInput, success: string) => Promise<unknown>;
}

export default function CatalogManagement({ snapshot, disabled, onAction }: Props) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todo');
  const [stationFilter, setStationFilter] = useState<string>('Todas');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStation, setFormStation] = useState<Station>('cocina');
  const [formStockPolicy, setFormStockPolicy] = useState<'none' | 'unit'>('none');
  const [formStockItemId, setFormStockItemId] = useState<string>('');
  const [formActive, setFormActive] = useState(true);
  const [formReason, setFormReason] = useState('');

  const categories = ['Todo', ...new Set(snapshot.products.map(p => p.category))];
  const compatibleStock = snapshot.stock.filter(s => s.station === formStation);
  const bindingValid = formStockPolicy === 'none' || compatibleStock.some(s => s.id === formStockItemId);
  function changeStation(station: Station) {
    setFormStation(station);
    setFormStockItemId('');
  }
  function changePolicy(policy: 'none' | 'unit') {
    setFormStockPolicy(policy);
    if (policy === 'none') setFormStockItemId('');
  }
  const auditLabels: Record<string, string> = { name: 'Nombre', category: 'Categoría', price_minor: 'Precio', active: 'Venta', station: 'Estación', stock_policy: 'Control de stock', stock_item_id: 'Inventario vinculado' };
  function auditValue(field: string, value: unknown): string {
    if (value === null) return '—';
    if (field === 'price_minor' && typeof value === 'number') return money(value);
    if (field === 'station') return stationName[value as Station] ?? String(value);
    if (field === 'stock_policy') return value === 'unit' ? 'Por unidad' : 'Sin control';
    if (field === 'stock_item_id') return snapshot.stock.find(s => s.id === value)?.name ?? String(value);
    if (field === 'active') return value ? 'Activo' : 'Inactivo';
    return String(value);
  }
  const filteredProducts = snapshot.products.filter(p => {
    if (categoryFilter !== 'Todo' && p.category !== categoryFilter) return false;
    if (stationFilter !== 'Todas' && p.station !== stationFilter) return false;
    if (activeFilter === 'active' && !p.active) return false;
    if (activeFilter === 'inactive' && p.active) return false;
    if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function startCreate() {
    setFormName('');
    setFormCategory('');
    setFormPrice('');
    setFormStation('cocina');
    setFormStockPolicy('none');
    setFormStockItemId('');
    setFormActive(true);
    setFormReason('');
    setError('');
    setCreating(true);
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice((product.price_minor / 100).toFixed(2));
    setFormStation(product.station);
    setFormStockPolicy(product.stock_policy);
    setFormStockItemId(product.stock_item_id ?? '');
    setFormActive(product.active);
    setFormReason('');
    setError('');
  }

  function hasCommercialHistory(productId: string) {
    return snapshot.orders.some(o => o.lines.some(l => l.product_id === productId));
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!bindingValid) { setError('Selecciona inventario de la misma estación antes de guardar.'); return; }
    let priceMinor: number;
    try {
      priceMinor = parseMoney(formPrice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Precio inválido.');
      return;
    }
    if (priceMinor <= 0) {
      setError('El precio debe ser mayor a cero.');
      return;
    }
    if (formReason.trim().length < 3) {
      setError('El motivo del alta es obligatorio (mínimo 3 caracteres).');
      return;
    }

    try {
      const res = await onAction({
        type: 'catalog.product.create',
        name: formName.trim(),
        category: formCategory.trim(),
        price_minor: priceMinor,
        station: formStation,
        stock_policy: formStockPolicy,
        stock_item_id: formStockPolicy === 'unit' ? formStockItemId : null,
        reason: formReason.trim()
      }, 'Producto creado correctamente en la carta.');
      if (res) setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el producto.');
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    setError('');
    if (!bindingValid) { setError('Selecciona inventario de la misma estación antes de guardar.'); return; }
    let priceMinor: number;
    try {
      priceMinor = parseMoney(formPrice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Precio inválido.');
      return;
    }
    if (priceMinor <= 0) {
      setError('El precio debe ser mayor a cero.');
      return;
    }
    if (formReason.trim().length < 3) {
      setError('El motivo de la modificación es obligatorio (mínimo 3 caracteres).');
      return;
    }

    const locked = hasCommercialHistory(editingProduct.id);

    try {
      const res = await onAction({
        type: 'catalog.product.update',
        product_id: editingProduct.id,
        expected_version: editingProduct.version,
        name: formName.trim(),
        category: formCategory.trim(),
        price_minor: priceMinor,
        active: formActive,
        ...(locked ? {} : {
          station: formStation,
          stock_policy: formStockPolicy,
          stock_item_id: formStockPolicy === 'unit' ? formStockItemId : null
        }),
        reason: formReason.trim()
      }, 'Producto actualizado en la carta.');
      if (res) setEditingProduct(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el producto.');
    }
  }

  return (
    <div className="catalog-admin">
      <div className="section-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2>Carta configurable</h2>
          <p className="muted" style={{ margin: 0 }}>Administra productos, precios y disponibilidad en tiempo real.</p>
        </div>
        <button className="primary" disabled={disabled} onClick={startCreate}>+ Nuevo producto</button>
      </div>

      <div className="catalog-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <input
          placeholder="Buscar producto o categoría…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', minWidth: '180px' }}
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label="Filtrar por categoría">
          {categories.map(c => <option key={c} value={c}>{c === 'Todo' ? 'Todas las categorías' : c}</option>)}
        </select>
        <select value={stationFilter} onChange={e => setStationFilter(e.target.value)} aria-label="Filtrar por estación">
          <option value="Todas">Todas las estaciones</option>
          <option value="cocina">Cocina</option>
          <option value="heladeria">Heladería</option>
          <option value="caja">Caja</option>
        </select>
        <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as any)} aria-label="Filtrar por estado">
          <option value="all">Todos los estados</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
        </select>
      </div>

      <div className="panel table-scroll">
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Estación</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Versión</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => {
              const locked = hasCommercialHistory(p.id);
              return (
                <tr key={p.id} style={{ opacity: p.active ? 1 : 0.6 }}>
                  <td>
                    <strong>{p.name}</strong>
                    {locked && <small style={{ display: 'block', color: 'var(--muted,#64748b)' }}>Con historial comercial</small>}
                  </td>
                  <td>{p.category}</td>
                  <td><strong>{money(p.price_minor)}</strong></td>
                  <td><span className={`station-label station-${p.station}`}>{stationName[p.station]}</span></td>
                  <td>{p.stock_policy === 'unit' ? <>Por unidad<small style={{ display: 'block' }}>{snapshot.stock.find(s => s.id === p.stock_item_id)?.name ?? 'Vínculo por revisar'}</small></> : 'Sin control'}</td>
                  <td>
                    <span className={`badge ${p.active ? 'teal' : 'amber'}`}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>v{p.version}</td>
                  <td>
                    <button className="secondary small" disabled={disabled} onClick={() => startEdit(p)}>
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredProducts.length && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted,#64748b)' }}>
            No hay productos que coincidan con los filtros.
          </div>
        )}
      </div>

      {snapshot.catalog_audit && snapshot.catalog_audit.length > 0 && (
        <details className="panel" style={{ marginTop: '1.5rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Historial de auditoría de la carta ({snapshot.catalog_audit.length})</summary>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {snapshot.catalog_audit.slice(-10).reverse().map(a => (
              <div key={a.id} style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '4px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{a.action === 'create' ? 'Alta de producto' : 'Actualización de producto'}</strong>
                  <span className="muted">{new Date(a.created_at).toLocaleString('es-PE')}</span>
                </div>
                <p style={{ margin: '0.25rem 0' }}>{snapshot.products.find(p => p.id === a.product_id)?.name ?? 'Producto histórico'} · {snapshot.staff.find(s => s.id === a.actor_id)?.name ?? 'Responsable registrado'} · v{a.previous_version ?? '—'} → v{a.new_version}</p>
                <p style={{ margin: '0.25rem 0' }}>Motivo: <em>{a.reason}</em></p>
                {a.changes && Object.keys(a.changes).length > 0 && (
                  <small style={{ color: '#475569' }}>
                    Cambios: {Object.entries(a.changes).map(([k, v]) => `${auditLabels[k] ?? k}: ${auditValue(k, v.old)} → ${auditValue(k, v.new)}`).join(', ')}
                  </small>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Modal: Crear Producto */}
      {creating && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-product-title">
            <span className="eyebrow">ADMINISTRACIÓN DE CARTA</span>
            <h2 id="create-product-title">Nuevo producto</h2>
            {error && <div className="alert error" role="alert">{error}</div>}
            <form onSubmit={submitCreate} className="form-stack">
              <label className="field">
                <span>Nombre del producto</span>
                <input required minLength={2} maxLength={100} value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej.: Tiradito Mixto" />
              </label>
              <label className="field">
                <span>Categoría</span>
                <input required minLength={2} maxLength={50} value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="Ej.: Platos Fuertes" />
              </label>
              <label className="field">
                <span>Precio (S/)</span>
                <input required inputMode="decimal" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="35.00" />
              </label>
              <label className="field">
                <span>Estación de atención</span>
                <select value={formStation} onChange={e => changeStation(e.target.value as Station)}>
                  <option value="cocina">Cocina</option>
                  <option value="heladeria">Heladería</option>
                  <option value="caja">Bebidas de Caja</option>
                </select>
              </label>
              <p className="muted">{formStation === 'caja' ? 'Bebidas de Caja: entrega directa, sin ticket de preparación.' : `Los pedidos se envían a ${stationName[formStation]} para preparación.`}</p>
              <label className="field">
                <span>Política de stock</span>
                <select value={formStockPolicy} onChange={e => changePolicy(e.target.value as 'none' | 'unit')}>
                  <option value="none">Sin control de stock</option>
                  <option value="unit">Control por unidad</option>
                </select>
              </label>
              {formStockPolicy === 'unit' && (
                <label className="field">
                  <span>Ítem de inventario vinculado</span>
                  <select required value={formStockItemId} onChange={e => setFormStockItemId(e.target.value)}>
                    <option value="">Selecciona inventario de {stationName[formStation]}</option>
                    {compatibleStock.map(s => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)}
                  </select>
                  {!compatibleStock.length && <small role="status">No hay inventario por unidad en esta estación. Usa sin control de stock para este producto o solicita la configuración del inventario correspondiente.</small>}
                </label>
              )}
              <label className="field">
                <span>Motivo del alta</span>
                <input required minLength={3} maxLength={500} value={formReason} onChange={e => setFormReason(e.target.value)} placeholder="Ej.: Incorporación de temporada" />
              </label>
              <div className="button-row" style={{ marginTop: '1rem' }}>
                <button type="button" className="secondary" disabled={disabled} onClick={() => setCreating(false)}>Cancelar</button>
                <button type="submit" className="primary" disabled={disabled || !bindingValid}>Crear producto</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Editar Producto */}
      {editingProduct && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-product-title">
            <span className="eyebrow">ADMINISTRACIÓN DE CARTA · v{editingProduct.version}</span>
            <h2 id="edit-product-title">Editar producto</h2>
            {error && <div className="alert error" role="alert">{error}</div>}
            {hasCommercialHistory(editingProduct.id) && (
              <div className="alert info" style={{ fontSize: '0.875rem' }}>
                <strong>Historial comercial activo:</strong> La estación y control de stock están bloqueados para proteger órdenes y kardex existentes.
              </div>
            )}
            <form onSubmit={submitEdit} className="form-stack">
              <label className="field">
                <span>Nombre del producto</span>
                <input required minLength={2} maxLength={100} value={formName} onChange={e => setFormName(e.target.value)} />
              </label>
              <label className="field">
                <span>Categoría</span>
                <input required minLength={2} maxLength={50} value={formCategory} onChange={e => setFormCategory(e.target.value)} />
              </label>
              <label className="field">
                <span>Precio (S/)</span>
                <input required inputMode="decimal" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} style={{ width: 'auto' }} />
                <span>Producto activo y visible para pedidos</span>
              </label>
              <label className="field">
                <span>Estación</span>
                <select disabled={hasCommercialHistory(editingProduct.id)} value={formStation} onChange={e => changeStation(e.target.value as Station)}>
                  <option value="cocina">Cocina</option>
                  <option value="heladeria">Heladería</option>
                  <option value="caja">Bebidas de Caja</option>
                </select>
              </label>
              <label className="field">
                <span>Política de stock</span>
                <select disabled={hasCommercialHistory(editingProduct.id)} value={formStockPolicy} onChange={e => changePolicy(e.target.value as 'none' | 'unit')}>
                  <option value="none">Sin control de stock</option>
                  <option value="unit">Control por unidad</option>
                </select>
              </label>
              {formStockPolicy === 'unit' && !hasCommercialHistory(editingProduct.id) && (
                <label className="field">
                  <span>Ítem de inventario vinculado</span>
                  <select required value={formStockItemId} onChange={e => setFormStockItemId(e.target.value)}>
                    <option value="">Selecciona inventario de {stationName[formStation]}</option>
                    {compatibleStock.map(s => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)}
                  </select>
                  {!compatibleStock.length && <small role="status">No hay inventario por unidad en esta estación. Usa sin control de stock para este producto o solicita la configuración del inventario correspondiente.</small>}
                </label>
              )}
              <label className="field">
                <span>Motivo de la modificación</span>
                <input required minLength={3} maxLength={500} value={formReason} onChange={e => setFormReason(e.target.value)} placeholder="Ej.: Actualización de costo de mercado" />
              </label>
              <div className="button-row" style={{ marginTop: '1rem' }}>
                <button type="button" className="secondary" disabled={disabled} onClick={() => setEditingProduct(null)}>Cancelar</button>
                <button type="submit" className="primary" disabled={disabled || !bindingValid}>Guardar cambios</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
