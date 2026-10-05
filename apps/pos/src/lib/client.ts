import type { PosError, PosCommand, SessionResponse, CommandResponse, PosSnapshot, GuestAccessView, QuoteResponse } from '@qatu/contracts';

export type CommandInput = PosCommand extends infer C ? C extends PosCommand ? Omit<C, 'operation_id'> : never : never;
export class ApiError extends Error {
  details?: Record<string, unknown>;
  constructor(public code: string, message: string, public status = 0, details?: Record<string, unknown>) {
    super(message);
    this.details = details;
  }
}
async function request<T>(path: string, options: RequestInit = {}, confirmedStatus?: number): Promise<T> {
  let response: Response;
  try { response = await fetch(`/v1/pos${path}`, { ...options, credentials: 'same-origin', cache: 'no-store' }); }
  catch { throw new ApiError('NETWORK', 'No pudimos confirmar la respuesta. Conservamos la operación para recuperarla.'); }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as PosError | null;
    throw new ApiError(payload?.error?.code ?? 'SERVER', payload?.error?.message ?? 'El servicio no respondió correctamente.', response.status, payload?.error?.details);
  }
  if (confirmedStatus!==undefined && response.status!==confirmedStatus) throw new ApiError('NETWORK', 'El servicio recibió la solicitud, pero no confirmó la operación. Conservamos su recuperación.', response.status);
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export const getRuntime = () => request<{ environment: 'laboratory' | 'operational' }>('/runtime');
export const getSession = () => request<SessionResponse>('/session');
export const login = (username: string, password: string) => request<SessionResponse>('/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
export const logout = (csrf: string) => request<void>('/session', { method: 'DELETE', headers: { 'X-CSRF-Token': csrf } });
export const getSnapshot = () => request<PosSnapshot>('/snapshot');
export const getGuestCode = (visit: string) => request<GuestAccessView>('/guest-access/' + visit);
export const requestQuote = (visitId: string, lines: { product_id: string; quantity: number; note?: string }[], csrf?: string) =>
  request<QuoteResponse>('/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify({ visit_id: visitId, lines }) });
export const sendCommand = (command: PosCommand, csrf: string) => request<CommandResponse>('/commands', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(command) }, 200);

export const money = (minor: number) => { if (!Number.isSafeInteger(minor)) throw new ApiError('INPUT', 'Importe fuera del rango exacto.'); const exact = BigInt(minor), absolute = exact < 0n ? -exact : exact; const parts = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).formatToParts(absolute / 100n); return (exact < 0n ? '-' : '') + parts.map(p => p.type === 'fraction' ? String(absolute % 100n).padStart(2, '0') : p.value).join(''); };
export function parseMoney(value: string): number {
  const text = value.trim().replace(',', '.');
  if (!/^\d{1,14}(\.\d{1,2})?$/.test(text)) throw new ApiError('INPUT', 'Ingresa un importe válido, por ejemplo 40.50.');
  const [whole = '0', decimals = ''] = text.split('.');
  const exact = BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'));
  if (exact > BigInt(Number.MAX_SAFE_INTEGER)) throw new ApiError('INPUT', 'El importe supera el rango exacto.');
  return Number(exact);
}
export function parseQuantity(value: string): number {
  if (!/^\d{1,5}$/.test(value)) throw new ApiError('INPUT', 'Ingresa una cantidad entera válida.');
  return Number(value);
}
export const roleName = { waiter: 'Mozo', cashier: 'Caja', kitchen: 'Estación', admin: 'Administración' };
export const stationName = { cocina: 'Cocina', heladeria: 'Heladería', caja: 'Bebidas de Caja' };
export const printState = { queued: 'En cola', bridge_received: 'Recibido por puente', confirmed: 'Confirmado en simulación', failed_before_send: 'Falló antes de enviar', ambiguous: 'Resultado incierto' };
