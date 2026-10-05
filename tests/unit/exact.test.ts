import { describe, it, expect } from 'vitest';
import { addExact, lineTotal, minor, quantity, quantityString } from '../../packages/domain/src/exact.js';

describe('exact money and operational quantities', () => {
  it('represents fractions as milli-units without binary rounding', () => {
    expect(quantity('0.125')).toBe(125);
    expect(quantity('12.03')).toBe(12030);
    expect(quantityString(12030)).toBe('12.03');
    expect(quantityString(1000)).toBe('1');
  });
  it.each(['0', '0.000', '-1', '1e3', '01', '1.0001', '1.', '1000000000', 'NaN'])('rejects invalid quantity %s', (input) => {
    expect(() => quantity(input)).toThrow();
  });
  it('rounds per line only and half up', () => {
    expect(lineTotal(105, quantity('0.1'))).toBe(11);
    expect(lineTotal(101, quantity('0.1'))).toBe(10);
    expect(lineTotal(99, quantity('3'))).toBe(297);
  });
  it('does not accept fractional or unsafe money', () => {
    expect(() => minor(0.5)).toThrow();
    expect(() => minor(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(() => minor(-1)).toThrow();
  });
  it('detects overflow before converting back to number', () => {
    expect(() => addExact(Number.MAX_SAFE_INTEGER, 1)).toThrow();
    expect(addExact(4000, -500, 1000)).toBe(4500);
    expect(() => lineTotal(Number.MAX_SAFE_INTEGER, quantity('2'))).toThrow();
  });
});
