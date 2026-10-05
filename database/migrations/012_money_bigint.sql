-- Forward-only conversion; preserve rows, constraints and all business values.
ALTER TABLE order_quotes ALTER COLUMN total_minor TYPE bigint;
ALTER TABLE order_quotes ADD CONSTRAINT order_quotes_money_safe CHECK(total_minor BETWEEN 0 AND 9007199254740991);
ALTER TABLE order_void_audit ALTER COLUMN amount_minor TYPE bigint;
ALTER TABLE order_void_audit ADD CONSTRAINT order_void_money_safe CHECK(amount_minor BETWEEN 0 AND 9007199254740991);
ALTER TABLE fiscal_documents ALTER COLUMN op_gravada_minor TYPE bigint, ALTER COLUMN igv_minor TYPE bigint, ALTER COLUMN total_minor TYPE bigint;
ALTER TABLE fiscal_documents ADD CONSTRAINT fiscal_money_safe CHECK(op_gravada_minor BETWEEN 0 AND 9007199254740991 AND igv_minor BETWEEN 0 AND 9007199254740991 AND total_minor BETWEEN 0 AND 9007199254740991);
ALTER TABLE check_discount_audit ALTER COLUMN discount_minor TYPE bigint;
ALTER TABLE check_discount_audit ADD CONSTRAINT discount_money_safe CHECK(discount_minor BETWEEN 0 AND 9007199254740991);
