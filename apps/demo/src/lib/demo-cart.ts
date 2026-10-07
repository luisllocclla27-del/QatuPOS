export interface CartItem {
  product_id: string;
  quantity: number;
  note?: string;
}

export interface TaxBreakdown {
  subtotalCents: number; // Base imponible sin IGV
  igvCents: number;      // IGV 18% incluido
  totalCents: number;    // Precio total de venta al público
}

/**
 * Computes the Peruvian tax breakdown for retail prices that already include 18% IGV.
 *
 * In Peru, restaurant prices displayed on menus are final prices (inclusive of 18% IGV).
 * Subtotal (Base Imponible) = Math.round(totalCents / 1.18)
 * IGV = totalCents - subtotalCents
 *
 * Invariant: subtotalCents + igvCents === totalCents.
 */
export function computeTaxBreakdown(totalCents: number): TaxBreakdown {
  if (totalCents <= 0) {
    return { subtotalCents: 0, igvCents: 0, totalCents: 0 };
  }
  const subtotalCents = Math.round(totalCents / 1.18);
  const igvCents = totalCents - subtotalCents;
  return {
    subtotalCents,
    igvCents,
    totalCents,
  };
}

/**
 * Calculates total price in cents for a cart given product definitions.
 */
export function calculateCartTotal(
  cart: CartItem[],
  products: { id: string; price_cents: number }[]
): number {
  return cart.reduce((total, item) => {
    const prod = products.find(p => p.id === item.product_id);
    return total + (prod ? prod.price_cents * item.quantity : 0);
  }, 0);
}

/**
 * Calculates total item count across all cart items.
 */
export function calculateCartItemCount(cart: CartItem[]): number {
  return cart.reduce((acc, item) => acc + item.quantity, 0);
}
