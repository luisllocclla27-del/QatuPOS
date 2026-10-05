/** Parse a money column only; never globally coerce PostgreSQL bigint IDs/versions. */
export function sqlMoney(value: unknown): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) { const exact = BigInt(value); if (exact <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(exact); }
  throw new Error('Persisted monetary value outside the exact domain.');
}
