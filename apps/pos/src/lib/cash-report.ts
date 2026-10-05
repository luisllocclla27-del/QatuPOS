import type { PosSnapshot, ProjectedCashSession } from '@qatu/contracts';

/** Read-only display scope: emission time belongs to a shift, independently of collection. */
export function cashReportScope(snapshot: PosSnapshot) {
  const sessions = snapshot.cash_sessions.filter(s => snapshot.user.role === 'admin' || s.owner_id === snapshot.user.id);
  const session = sessions.find(s => s.state === 'open') ?? sessions.at(-1);
  if (!session || session.state === 'counting' || session.expected_minor === null ||
      snapshot.handovers.some(h => h.state === 'prepared' && (h.outgoing_user_id === snapshot.user.id || h.incoming_user_id === snapshot.user.id))) {
    return { available: false as const, session, documents: [], reason: 'El reporte no está disponible durante el conteo ciego o sin una caja propia.' };
  }
  return { available: true as const, session, documents: documentsInSession(snapshot, session), reason: '' };
}
export function documentsInSession(snapshot: PosSnapshot, session: ProjectedCashSession) {
  const start = Date.parse(session.opened_at), end = Date.parse(session.closed_at ?? snapshot.server_time);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  return (snapshot.fiscal_documents ?? []).filter(d => {
    const at = Date.parse(d.created_at);
    return at >= start && (session.closed_at ? at < end : at <= end);
  });
}
