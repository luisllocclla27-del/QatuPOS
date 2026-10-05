/** Defensive cloud substitute for filesystem adapter; never generates a fallback key. */
export function localGuestKey():never {throw new Error('Cloud cannot read or create a local guest signing key.');}
