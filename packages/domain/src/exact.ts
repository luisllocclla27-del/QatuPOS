/** Exact PEN minor units and milli-units; no floating-point quantities enter the ledger. */
export class DomainError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 409, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
  }
}

export function invariant(condition: unknown, code: string, message: string, status = 409): asserts condition {
  if (!condition) throw new DomainError(code, message, status);
}

export function minor(value: number, positive = false): number {
  invariant(Number.isSafeInteger(value) && value >= (positive ? 1 : 0), 'INVALID_AMOUNT', 'El importe debe ser un entero válido en céntimos.', 400);
  return value;
}

export function addExact(...values: number[]): number {
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n);
  invariant(total <= BigInt(Number.MAX_SAFE_INTEGER) && total >= BigInt(Number.MIN_SAFE_INTEGER), 'AMOUNT_OVERFLOW', 'El importe supera el límite exacto.', 400);
  return Number(total);
}

/** Positive rational money calculation, rounded once half up without floating multiplication. */
export function roundRatio(amount: number, numerator: number, denominator: number): number {
  minor(amount); minor(numerator); minor(denominator, true);
  const divisor = BigInt(denominator);
  const result = (BigInt(amount) * BigInt(numerator) * 2n + divisor) / (divisor * 2n);
  invariant(result <= BigInt(Number.MAX_SAFE_INTEGER), 'AMOUNT_OVERFLOW', 'El importe supera el límite exacto.', 400);
  return Number(result);
}

export function quantity(value: string): number {
  invariant(typeof value === 'string' && /^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(value), 'INVALID_QUANTITY', 'La cantidad requiere hasta tres decimales y nueve dígitos enteros.', 400);
  const [whole = '0', decimal = ''] = value.split('.');
  const result = BigInt(whole) * 1000n + BigInt(decimal.padEnd(3, '0'));
  invariant(result > 0n, 'INVALID_QUANTITY', 'La cantidad debe ser mayor que cero.', 400);
  return Number(result);
}

export function quantityString(milli: number): string {
  invariant(Number.isSafeInteger(milli) && milli >= 0, 'INVALID_QUANTITY', 'Cantidad interna inválida.', 400);
  const decimal = String(milli % 1000).padStart(3, '0').replace(/0+$/, '');
  return `${Math.floor(milli / 1000)}${decimal ? `.${decimal}` : ''}`;
}

/** Round once per commercial line, half up, including fractional quantities. */
export function lineTotal(unitMinor: number, milli: number): number {
  minor(unitMinor);
  invariant(Number.isSafeInteger(milli) && milli > 0, 'INVALID_QUANTITY', 'Cantidad interna inválida.', 400);
  const rounded = (BigInt(unitMinor) * BigInt(milli) + 500n) / 1000n;
  invariant(rounded <= BigInt(Number.MAX_SAFE_INTEGER), 'AMOUNT_OVERFLOW', 'La línea supera el límite exacto.', 400);
  return Number(rounded);
}
