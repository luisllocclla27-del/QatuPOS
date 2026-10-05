import type { StaffPasswordRequest, StaffPasswordResponse } from '@qatu/contracts';
import { ApiError } from './client';
export async function setStaffPassword(id: string, input: StaffPasswordRequest, csrf: string): Promise<StaffPasswordResponse> {
  const response = await fetch('/v1/pos/staff/' + encodeURIComponent(id) + '/password', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(input) });
  const body = await response.json(); if (!response.ok) throw new ApiError(body.error?.code ?? 'AUTHORITY_UNAVAILABLE', body.error?.message ?? 'No se pudo establecer la credencial.', response.status); return body;
}
