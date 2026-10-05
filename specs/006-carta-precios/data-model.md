# Data Model: Carta Configurable y Cotizaciones

## 1. Entidades de Base de Datos (Relacional)

### Tabla `order_quotes`
```sql
CREATE TABLE IF NOT EXISTS order_quotes (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  id uuid NOT NULL,
  visit_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  principal_kind text NOT NULL CHECK (principal_kind IN ('staff', 'guest')),
  guest_session_id uuid,
  total_minor integer NOT NULL CHECK (total_minor >= 0),
  lines jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id, id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_order_quotes_expiry ON order_quotes(expires_at) WHERE consumed_at IS NULL;
```

### Tabla `catalog_audit`
```sql
CREATE TABLE IF NOT EXISTS catalog_audit (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  product_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update')),
  previous_version integer,
  new_version integer NOT NULL,
  changes jsonb NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id, id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id),
  FOREIGN KEY (tenant_id, branch_id, actor_id) REFERENCES staff_memberships(tenant_id, branch_id, id)
);
```

---

## 2. Entidades de Dominio en Memoria (TypeScript)

### Product
```typescript
export interface Product {
  id: UUID;
  name: string;
  category: string;
  price_minor: MoneyMinor; // Entero céntimos PEN (> 0)
  station: Station;        // 'cocina' | 'heladeria' | 'caja'
  stock_policy: 'none' | 'unit';
  stock_item_id: UUID | null;
  active: boolean;
  version: number;
}
```

### OrderQuote
```typescript
export interface QuoteLine {
  product_id: UUID;
  product_name: string;
  station: Station;
  unit_price_minor: MoneyMinor;
  quantity: number;
  product_version: number;
  note: string;
}

export interface OrderQuote {
  id: UUID;
  visit_id: UUID;
  total_minor: MoneyMinor;
  expires_at: string;
  lines: QuoteLine[];
}
```

### CatalogAuditEntry
```typescript
export interface CatalogAuditEntry {
  id: UUID;
  operation_id: UUID;
  actor_id: UUID;
  product_id: UUID;
  action: 'create' | 'update';
  previous_version: number | null;
  new_version: number;
  changes: Record<string, { old: unknown; new: unknown }>;
  reason: string;
  created_at: string;
}
```

### Comandos Nuevos / Modificados
```typescript
export interface CatalogProductCreateCommand {
  operation_id: UUID;
  type: 'catalog.product.create';
  product_id?: UUID;
  name: string;
  category: string;
  price_minor: MoneyMinor;
  station: Station;
  stock_policy: 'none' | 'unit';
  stock_item_id?: UUID | null;
  reason: string;
}

export interface CatalogProductUpdateCommand {
  operation_id: UUID;
  type: 'catalog.product.update';
  product_id: UUID;
  expected_version: number;
  name: string;
  category: string;
  price_minor: MoneyMinor;
  active: boolean;
  station?: Station;
  stock_policy?: 'none' | 'unit';
  stock_item_id?: UUID | null;
  reason: string;
}

export interface OrderCreateCommand {
  operation_id: UUID;
  type: 'order.create';
  visit_id: UUID;
  expected_version: number;
  quote_id: UUID;
}
```
