/** Staff-only laboratory POS contract. Integers are PEN cents or whole sale units.
 * Server derives tenant, branch, roles, prices, stock policy and business-day scope.
 * Never use these interfaces as an authorization substitute.
 */
export type UUID = string;
export type MoneyMinor = number;
export type Station = 'cocina' | 'heladeria' | 'caja';
export type StaffRole = 'waiter' | 'cashier' | 'kitchen' | 'admin';
export type PaymentMethod = 'cash' | 'card' | 'yape';
export interface StaffUser { active?: boolean; version?: number; credential_ready?: boolean; id: UUID; username: string; name: string; role: StaffRole; station: Station | null }
export interface SessionResponse { user: StaffUser; expires_at: string; csrf_token: string }
export interface LoginRequest { username: string; password: string }
export interface Product { id: UUID; name: string; category: string; price_minor: MoneyMinor; station: Station; stock_policy: 'none' | 'unit'; stock_item_id: UUID | null; active: boolean; version: number }
export interface DiningTable { id: UUID; label: string; seats: number; version: number; visit_id: UUID | null }
export interface TableVisit { id: UUID; table_id: UUID; check_id: UUID; version: number; status: 'open' | 'closed'; opened_by: UUID; opened_at: string; closed_at: string | null; responsible_waiter_id?: UUID; responsible_waiter_name?: string }
export interface GuestAccess { id: UUID; visit_id: UUID; state: 'active' | 'settled' | 'revoked'; created_by: UUID; created_at: string; ended_at: string | null }
export interface GuestAccessView { access_id: UUID; visit_id: UUID; code: string }
export interface GuestSessionResponse { session_id: UUID; visit_id: UUID; table_label: string; restaurant: string; csrf_token: string; expires_at: string }
export interface GuestOrderInput { operation_id: UUID; expected_version: number; quote_id: UUID; lines?: { product_id: UUID; quantity: number; note?: string }[] }
export type ServiceMode = 'full_service' | 'beverages_only';
export interface DispatchClaim { actor_id: UUID; actor_name: string; quantity: number; claimed_at: string }
export interface GuestSnapshot { service_mode?: ServiceMode; visit_id: UUID; visit_version: number; table_label: string; restaurant: string; server_time: string; ordering_allowed: boolean; products: Pick<Product,'id'|'name'|'category'|'price_minor'|'station'>[]; orders: { id: UUID; batch_number: number; created_at: string; lines: Pick<OrderLine,'product_name'|'quantity'|'unit_price_minor'|'note'|'prepared_quantity'|'fulfilled_quantity'>[] }[] }
export interface GuestOrderResponse { operation_id: UUID; replayed: boolean; order_id: UUID; snapshot: GuestSnapshot }
export interface QuoteLineInput { product_id: UUID; quantity: number; note?: string }
export interface QuoteRequest { visit_id?: UUID; lines: QuoteLineInput[] }
export interface QuoteLineView { product_id: UUID; product_name: string; station: Station; unit_price_minor: MoneyMinor; quantity: number; product_version: number; note: string }
export interface QuoteResponse { quote_id: UUID; visit_id: UUID; total_minor: MoneyMinor; server_time: string; expires_at: string; lines: QuoteLineView[] }
export interface OrderQuote { id: UUID; tenant_id?: UUID; branch_id?: UUID; visit_id: UUID; actor_id: UUID; principal_kind: 'staff' | 'guest'; guest_session_id: UUID | null; total_minor: MoneyMinor; lines: QuoteLineView[]; expires_at: string; consumed_at: string | null; created_at: string }
export interface CatalogAuditEntry { id: UUID; actor_id: UUID; operation_id: UUID; product_id: UUID; action: 'create' | 'update'; previous_version: number | null; new_version: number; changes: Record<string, { old: unknown; new: unknown }>; reason: string; created_at: string }
export interface OrderVoidAuditEntry { id: UUID; actor_id: UUID; operation_id: UUID; line_id: UUID; order_id: UUID; visit_id: UUID; quantity: number; amount_minor: MoneyMinor; restored_stock: boolean; reason: string; created_at: string }
export interface OrderLine { dispatch_claim?: DispatchClaim | null; prepared_at?: string; delivered_at?: string; id: UUID; order_id: UUID; product_id: UUID; product_name: string; station: Station; unit_price_minor: MoneyMinor; quantity: number; prepared_quantity: number; fulfilled_quantity: number; voided_quantity: number; void_reason?: string; stock_policy: 'none' | 'unit'; stock_item_id: UUID | null; note: string; version: number }
export type DiscountKind = 'percentage' | 'fixed';
export interface CheckDiscountAuditEntry { id: UUID; actor_id: UUID; operation_id: UUID; check_id: UUID; visit_id: UUID; discount_minor: MoneyMinor; discount_kind: DiscountKind; discount_percent?: number | null; reason: string; created_at: string }
export interface Order { service_sequence?: number; priority?: 'normal' | 'urgent'; priority_reason?: string; production_version?: number; responsible_name?: string; id: UUID; visit_id: UUID; check_id: UUID; batch_number: number; created_by: UUID; created_at: string; business_day_id: UUID; status: 'accepted' | 'closed'; source?: 'staff' | 'guest'; guest_session_id?: UUID; lines: OrderLine[] }
export interface Check { id: UUID; visit_id: UUID; version: number; status: 'open' | 'closed'; total_minor: MoneyMinor; paid_minor: MoneyMinor; held_minor: MoneyMinor; remaining_collectible_minor: MoneyMinor; fiscal_status: 'pending' | 'issued'; currency: 'PEN'; discount_minor: MoneyMinor; discount_reason?: string | null; discount_kind?: DiscountKind | null; discount_percent?: number | null }
export type FiscalDocType = 'boleta' | 'factura' | 'nota_credito';
export type CustomerDocType = 'dni' | 'ruc' | 'sin_documento';
export type SunatCreditReasonCode = '01' | '02' | '03' | '06' | '07';
export interface FiscalItem { product_name: string; quantity: number; unit_price_minor: MoneyMinor; subtotal_minor: MoneyMinor }
export interface FiscalDocument {
  id: UUID; check_id: UUID; visit_id: UUID; doc_type: FiscalDocType; series: string; number: number; full_number: string;
  customer_doc_type: CustomerDocType; customer_doc_number: string | null; customer_name: string; customer_address: string | null;
  currency: 'PEN'; op_gravada_minor: MoneyMinor; igv_minor: MoneyMinor; total_minor: MoneyMinor; digest_hash: string; qr_payload: string;
  items: FiscalItem[]; status: 'accepted_simulated' | 'annulled'; actor_id: UUID; created_at: string;
  modified_document_id?: UUID | null;
  modified_document_full_number?: string | null;
  sunat_reason_code?: SunatCreditReasonCode | null;
  sunat_reason_description?: string | null;
  credit_note_id?: UUID | null;
  credit_note_full_number?: string | null;
}
export interface StockItem { beverage_kind?: 'beer' | 'soda' | 'water'; id: UUID; name: string; sku: string; unit: 'unit'; station: Station; on_hand: number; reserved: number; available: number; version: number }
export interface StockMovement { receipt_reference?: string; id: UUID; stock_item_id: UUID; quantity_delta: number; kind: 'opening' | 'fulfillment' | 'adjustment' | 'receipt'; operation_id: UUID; actor_id: UUID; created_at: string; reason: string }
export interface PrintJob { kind?: 'order' | 'void' | 'priority'; table_label?: string; batch_number?: number; service_sequence?: number; responsible_name?: string; priority?: 'normal' | 'urgent'; id: UUID; order_id: UUID; station: 'cocina' | 'heladeria'; state: 'queued' | 'bridge_received' | 'confirmed' | 'failed_before_send' | 'ambiguous'; version: number; copy_of: UUID | null; reason: string | null; created_at: string; payload_hash: string; lines: { product_name: string; quantity: number; note: string }[] }
export interface CollectionAuthorization { id: UUID; check_id: UUID; check_version: number; amount_minor: MoneyMinor; method: PaymentMethod; status: 'reserved' | 'consumed' | 'settled' | 'released'; registry_ack: 'laboratory_local' | 'local_authority'; cash_session_id: UUID; created_by: UUID; created_at: string }
export interface MerchantEvidence { source: 'merchant_verified'; merchant_account: string; external_reference: string; observed_at: string }
export interface Payment { id: UUID; authorization_id: UUID; check_id: UUID; cash_session_id: UUID; initiated_cash_session_id: UUID; business_day_id: UUID; method: PaymentMethod; amount_minor: MoneyMinor; received_minor: MoneyMinor | null; change_minor: MoneyMinor | null; status: 'succeeded' | 'unknown'; evidence: MerchantEvidence | null; actor_id: UUID; created_at: string; confirmed_at: string | null; version: number }
export interface CashSession { id: UUID; drawer_id: UUID; business_day_id: UUID; owner_id: UUID; shift_label: 'diurno' | 'nocturno'; opening_minor: MoneyMinor; expected_minor: MoneyMinor; counted_minor: MoneyMinor | null; difference_minor: MoneyMinor | null; state: 'open' | 'counting' | 'closed'; version: number; opened_at: string; closed_at: string | null; predecessor_handover_id: UUID | null }
export interface CashMovement { id: UUID; cash_session_id: UUID; kind: 'paid_in' | 'paid_out'; amount_minor: MoneyMinor; reason: string; actor_id: UUID; created_at: string }
export interface StockCountLine { stock_item_id: UUID; expected_quantity: number; counted_quantity: number; difference_quantity: number; expected_stock_version?: number }
export interface InventoryCount { id: UUID; actor_id: UUID; created_at: string; reason: string; lines: StockCountLine[]; status: 'declared' | 'adjusted' | 'superseded'; business_day_id?: UUID; superseded_by?: UUID }
export interface ShiftHandover { cancelled_by?: UUID; cancelled_at?: string; cancellation_reason?: string; id: UUID; cash_session_id: UUID; version: number; state: 'prepared' | 'declared' | 'accepted' | 'disputed' | 'cancelled'; outgoing_user_id: UUID; incoming_user_id: UUID; expected_cash_minor: MoneyMinor; counted_cash_minor: MoneyMinor | null; difference_cash_minor: MoneyMinor | null; stock_lines: StockCountLine[]; pending_payment_ids: UUID[]; successor_cash_session_id: UUID | null; discrepancy_approved_by: UUID | null; discrepancy_approval_reason: string | null; reason: string | null; created_at: string }
export interface BusinessDay { id: UUID; business_date: string; timezone: 'America/Lima'; state: 'open' | 'provisionally_closed' | 'reconciled'; version: number }
export interface DayClose { operational_status?: 'pending' | 'reconciled'; close_mode?: 'provisional' | 'operational_final'; cash_approval_id?: UUID | null; id: UUID; business_day_id: UUID; revision: number; state: 'provisionally_closed' | 'reconciled'; sales_minor: MoneyMinor; collections_minor: MoneyMinor; cash_collections_minor: MoneyMinor; card_collections_minor: MoneyMinor; yape_collections_minor: MoneyMinor; prior_day_collections_minor: MoneyMinor; initial_external_float_minor: MoneyMinor; external_paid_in_minor: MoneyMinor; external_paid_out_minor: MoneyMinor; expected_final_cash_minor: MoneyMinor; counted_final_cash_minor: MoneyMinor; cash_difference_minor: MoneyMinor; included_cash_session_ids: UUID[]; included_payment_ids: UUID[]; unknown_payment_ids: UUID[]; open_check_ids: UUID[]; pending_fiscal_check_ids: UUID[]; stock_lines: StockCountLine[]; created_by: UUID; created_at: string; reconciliation_notes: string[]; pending_inventory_count_ids?: UUID[] }
export interface SalesNote { id: UUID; reference: string; check_id: UUID; total_minor: MoneyMinor; legend: 'NOTA DE VENTA INTERNA - NO ES COMPROBANTE DE PAGO'; created_at: string }
export interface AuditEntry { source?: 'staff' | 'guest'; guest_session_id?: UUID; reason?: string; id: UUID; actor_id: UUID; operation_id: UUID; action: string; entity_id: UUID; created_at: string }
/** Blind-count projections redact expectations until a count is sealed. Internal state stays exact. */
export type ProjectedStockItem = Omit<StockItem, 'on_hand' | 'reserved' | 'available'> & { on_hand: number | null; reserved: number | null; available: number | null };
export type ProjectedCashSession = Omit<CashSession, 'expected_minor'> & { expected_minor: MoneyMinor | null };
export type ProjectedStockCountLine = Omit<StockCountLine, 'expected_quantity' | 'difference_quantity'> & { expected_quantity: number | null; difference_quantity: number | null };
export type ProjectedHandover = Omit<ShiftHandover, 'expected_cash_minor' | 'stock_lines'> & { expected_cash_minor: MoneyMinor | null; stock_lines: ProjectedStockCountLine[] };
export interface CashCloseApproval { id: UUID; cash_session_id: UUID; business_day_id: UUID; cash_version: number; day_version: number; seal_state_version: number; counted_cash_minor: MoneyMinor; stock_counts: { stock_item_id: UUID; counted_quantity: number }[]; actor_id: UUID; reason: string; created_at: string }
export interface PosSnapshot {
  service_mode?: ServiceMode; available_product_ids?: UUID[]; cash_close_approvals?: CashCloseApproval[];
  server_time: string; environment: 'laboratory' | 'operational'; authority: { mode: 'cloud'; node_id: string; epoch: number }; version: number;
  branch: { id: UUID; name: string; currency: 'PEN'; timezone: 'America/Lima'; drawer_id: UUID };
  user: StaffUser; staff: StaffUser[]; guest_accesses: GuestAccess[]; products: Product[]; tables: DiningTable[]; visits: TableVisit[]; orders: Order[];
  checks: Check[]; stock: ProjectedStockItem[]; stock_movements: StockMovement[]; print_jobs: PrintJob[]; authorizations: CollectionAuthorization[];
  payments: Payment[]; cash_sessions: ProjectedCashSession[]; cash_movements: CashMovement[]; handovers: ProjectedHandover[]; inventory_counts: InventoryCount[];
  business_day: BusinessDay; business_days: BusinessDay[]; day_closes: DayClose[]; sales_notes: SalesNote[]; fiscal_documents: FiscalDocument[]; audit: AuditEntry[]; catalog_audit: CatalogAuditEntry[]; void_audit: OrderVoidAuditEntry[]; discount_audit: CheckDiscountAuditEntry[];
  capabilities: { qr_orders: false; ecommerce: false; delivery: false; real_payments: false; fiscal_issuance: false; network_printing: false; offline_writer: false };
}
interface CommandBase { operation_id: UUID }
export interface GuestAccessCommand extends CommandBase { type: 'guest.access'; visit_id: UUID; expected_version: number; action: 'activate' | 'rotate' | 'revoke'; reason: string }
export interface TableOpenCommand extends CommandBase { type: 'table.open'; table_id: UUID; expected_version: number }
export interface TableCloseCommand extends CommandBase { type: 'table.close'; visit_id: UUID; expected_version: number }
export interface OrderCreateCommand extends CommandBase { type: 'order.create'; visit_id: UUID; expected_version: number; quote_id: UUID; lines?: { product_id: UUID; quantity: number; note?: string }[] }
export interface LinePrepareCommand extends CommandBase { type: 'line.prepare'; line_id: UUID; expected_version: number; quantity: number }
export interface LineFulfillCommand extends CommandBase { type: 'line.fulfill'; line_id: UUID; expected_version: number; quantity: number }
export interface OrderLineVoidCommand extends CommandBase { type: 'order.line.void'; line_id: UUID; expected_version: number; quantity: number; restore_stock: boolean; reason: string }
export interface PrintCopyCommand extends CommandBase { type: 'print.copy'; print_job_id: UUID; expected_version: number; reason: string }
export interface PrintAckCommand extends CommandBase { type: 'print.ack'; print_job_id: UUID; expected_version: number; state: 'bridge_received' | 'confirmed' | 'failed_before_send' | 'ambiguous'; evidence: string }
export interface CollectionAuthorizeCommand extends CommandBase { type: 'collection.authorize'; check_id: UUID; expected_version: number; cash_session_id: UUID; method: PaymentMethod; amount_minor: MoneyMinor }
export interface CollectionReleaseCommand extends CommandBase { type: 'collection.release'; authorization_id: UUID; expected_version: number; reason: string }
export interface PaymentConfirmCommand extends CommandBase { type: 'payment.confirm'; authorization_id: UUID; received_minor?: MoneyMinor; evidence?: MerchantEvidence }
export interface PaymentUnknownCommand extends CommandBase { type: 'payment.unknown'; authorization_id: UUID; reason: string }
export interface PaymentResolveCommand extends CommandBase { type: 'payment.resolve'; payment_id: UUID; expected_version: number; cash_session_id: UUID; evidence: MerchantEvidence }
export interface CashOpenCommand extends CommandBase { type: 'cash.open'; opening_minor: MoneyMinor; shift_label: 'diurno' | 'nocturno'; expected_day_version: number }
export interface CashMoveCommand extends CommandBase { type: 'cash.move'; cash_session_id: UUID; expected_version: number; kind: 'paid_in' | 'paid_out'; amount_minor: MoneyMinor; reason: string }
export interface HandoverBeginCommand extends CommandBase { type: 'handover.begin'; cash_session_id: UUID; expected_version: number; incoming_user_id: UUID }
export interface HandoverCountCommand extends CommandBase { type: 'handover.count'; handover_id: UUID; expected_version: number; counted_cash_minor: MoneyMinor; stock_counts: { stock_item_id: UUID; counted_quantity: number }[] }
export interface HandoverApproveCommand extends CommandBase { type: 'handover.approve'; handover_id: UUID; expected_version: number; reason: string }
export interface HandoverAcceptCommand extends CommandBase { type: 'handover.accept'; handover_id: UUID; expected_version: number }
export interface HandoverRejectCommand extends CommandBase { type: 'handover.reject'; handover_id: UUID; expected_version: number; reason: string }
export interface DayCloseCommand extends CommandBase { type: 'day.close'; mode?: 'provisional' | 'operational_final'; approval_id?: UUID; cash_session_id: UUID; expected_version: number; expected_day_version: number; counted_cash_minor: MoneyMinor; stock_counts: { stock_item_id: UUID; counted_quantity: number }[]; reason: string }
export interface DayOpenCommand extends CommandBase { type: 'day.open'; expected_day_version: number; reason: string }
export interface InventoryCountCommand extends CommandBase { type: 'inventory.count'; reason: string; lines: { stock_item_id: UUID; expected_version: number; counted_quantity: number }[] }
export interface InventoryAdjustCommand extends CommandBase { type: 'inventory.adjust'; inventory_count_id: UUID; approval_reason: string }
export interface SalesNoteCommand extends CommandBase { type: 'sale.note'; check_id: UUID; expected_version: number }
export interface CatalogProductCreateCommand extends CommandBase { type: 'catalog.product.create'; product_id?: UUID; name: string; category: string; price_minor: MoneyMinor; station: Station; stock_policy: 'none' | 'unit'; stock_item_id?: UUID | null; reason: string }
export interface CatalogProductUpdateCommand extends CommandBase { type: 'catalog.product.update'; product_id: UUID; expected_version: number; name: string; category: string; price_minor: MoneyMinor; active: boolean; station?: Station; stock_policy?: 'none' | 'unit'; stock_item_id?: UUID | null; reason: string }
export interface FiscalDocumentIssueCommand extends CommandBase {
  type: 'fiscal.document.issue';
  check_id: UUID;
  expected_check_version: number;
  doc_type: FiscalDocType;
  customer_doc_type: CustomerDocType;
  customer_doc_number?: string;
  customer_name: string;
  customer_address?: string;
}
export interface CheckDiscountApplyCommand extends CommandBase {
  type: 'check.discount.apply';
  check_id: UUID;
  expected_version: number;
  kind: DiscountKind;
  percent?: number;
  amount_minor?: MoneyMinor;
  reason: string;
}
export interface CheckDiscountRemoveCommand extends CommandBase {
  type: 'check.discount.remove';
  check_id: UUID;
  expected_version: number;
  reason: string;
}
export interface FiscalCreditNoteIssueCommand extends CommandBase {
  type: 'fiscal.credit_note.issue';
  document_id: UUID;
  reason_code: SunatCreditReasonCode;
  reason_description: string;
}
export interface TableAssignCommand extends CommandBase { type: 'table.assign'; visit_id: UUID; expected_version: number; waiter_id: UUID; reason: string }
export interface OrderPriorityCommand extends CommandBase { type: 'order.priority'; order_id: UUID; expected_version: number; priority: 'normal' | 'urgent'; reason: string }
export interface LineClaimCommand extends CommandBase { type: 'line.claim'; line_id: UUID; expected_version: number; action: 'claim' | 'release'; quantity?: number; reason: string }
export interface CashCloseApproveCommand extends CommandBase { type: 'cash.close.approve'; cash_session_id: UUID; expected_version: number; expected_day_version: number; counted_cash_minor: MoneyMinor; stock_counts: { stock_item_id: UUID; counted_quantity: number }[]; reason: string }
export interface LineReadyConfirmCommand extends CommandBase { type: 'line.ready.confirm'; line_id: UUID; expected_version: number; quantity: number; reason: string }
export interface HandoverCancelCommand extends CommandBase { type: 'handover.cancel'; handover_id: UUID; expected_version: number; reason: string }
export interface StaffCreateCommand extends CommandBase { type: 'staff.create'; username: string; name: string; role: StaffRole; station: Station | null; reason: string }
export interface StaffUpdateCommand extends CommandBase { type: 'staff.update'; staff_id: UUID; expected_version: number; name: string; role: StaffRole; station: Station | null; active: boolean; reason: string }
export interface StaffPasswordRequest { expected_version: number; current_password: string; new_password: string; reason: string }
export interface StaffPasswordResponse { staff_id: UUID; version: number; credential_ready: true }
export interface StockCreateCommand extends CommandBase { type: 'stock.create'; name: string; sku: string; station: 'caja' | 'heladeria'; beverage_kind: 'beer' | 'soda' | 'water' | null; reason: string }
export interface StockReceiveCommand extends CommandBase { type: 'stock.receive'; stock_item_id: UUID; expected_version: number; quantity: number; receipt_reference: string; reason: string }
export type PosCommand = StockCreateCommand | StockReceiveCommand | StaffCreateCommand | StaffUpdateCommand | HandoverCancelCommand | LineReadyConfirmCommand | TableAssignCommand | OrderPriorityCommand | LineClaimCommand | CashCloseApproveCommand | GuestAccessCommand | TableOpenCommand | TableCloseCommand | OrderCreateCommand | LinePrepareCommand | LineFulfillCommand | OrderLineVoidCommand | PrintCopyCommand | PrintAckCommand | CollectionAuthorizeCommand | CollectionReleaseCommand | PaymentConfirmCommand | PaymentUnknownCommand | PaymentResolveCommand | CashOpenCommand | CashMoveCommand | HandoverBeginCommand | HandoverCountCommand | HandoverApproveCommand | HandoverAcceptCommand | HandoverRejectCommand | DayCloseCommand | DayOpenCommand | InventoryCountCommand | InventoryAdjustCommand | SalesNoteCommand | CatalogProductCreateCommand | CatalogProductUpdateCommand | FiscalDocumentIssueCommand | CheckDiscountApplyCommand | CheckDiscountRemoveCommand | FiscalCreditNoteIssueCommand;
export interface CommandResponse { operation_id: UUID; replayed: boolean; entity_id: UUID; snapshot: PosSnapshot }
export type PosErrorCode = 'RECOVERY_QUARANTINE' | 'DATABASE_UNAVAILABLE' | 'IDENTITY_PROJECTION_MISMATCH' | 'DAY_DATE_NOT_ADVANCED' | 'ENVIRONMENT_MISMATCH' | 'STAFF_USERNAME_CONFLICT' | 'REAUTHENTICATION_REQUIRED' | 'SERVICE_MODE_RESTRICTED' | 'DISPATCH_CLAIMED' | 'OPERATIONAL_CLOSE_BLOCKED' | 'AUTHENTICATION_REQUIRED' | 'INVALID_CREDENTIALS' | 'FORBIDDEN' | 'CSRF_INVALID' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'VERSION_CONFLICT' | 'IDEMPOTENCY_CONFLICT' | 'TABLE_OCCUPIED' | 'VISIT_NOT_OPEN' | 'INSUFFICIENT_STOCK' | 'QUANTITY_EXCEEDED' | 'CHECK_BALANCE_EXCEEDED' | 'CASH_NOT_OPEN' | 'RESOURCE_COUNTING' | 'DUPLICATE_EVIDENCE' | 'AUTHORIZATION_USED' | 'INVALID_TRANSITION' | 'DISCREPANCY_APPROVAL_REQUIRED' | 'UNSUPPORTED_CAPABILITY' | 'AUTHORITY_UNAVAILABLE' | 'GUEST_ACCESS_ENDED' | 'INVALID_GUEST_CODE' | 'GUEST_KEY_UNAVAILABLE' | 'QUOTE_EXPIRED' | 'PRICE_CHANGED' | 'PRODUCT_UNAVAILABLE' | 'COMMERCIAL_HISTORY_LOCKED' | 'CATALOG_VERSION_CONFLICT' | 'PRODUCT_ID_CONFLICT' | 'BUSINESS_DAY_LOCKED' | 'STOCK_RESERVATIONS_EXCEED_COUNT' | 'ALREADY_ISSUED' | 'DISCOUNT_NOT_ALLOWED' | 'INVALID_DISCOUNT' | 'ALREADY_ANNULLED' | 'INVALID_CREDIT_REASON';
export interface PosError { error: { code: PosErrorCode; message: string; operation_id?: UUID; current_version?: number; details?: Record<string, unknown> } }

