-- Additive semantic correction: simulated history is never real fiscal acceptance.
-- Preserve all documents, financial values and guest access. Test before interactive application.
WITH corrected AS (
  SELECT b.tenant_id, b.branch_id, jsonb_agg(
    CASE WHEN c->>'fiscal_status' = 'issued' AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(b.state->'fiscal_documents', '[]'::jsonb)) d
      WHERE d->>'check_id' = c->>'id' AND d->>'status' IN ('accepted_simulated', 'annulled')
    ) THEN jsonb_set(c, '{fiscal_status}', '"pending"'::jsonb) ELSE c END ORDER BY ordinal
  ) AS checks
  FROM branch_state b CROSS JOIN LATERAL jsonb_array_elements(b.state->'checks') WITH ORDINALITY AS items(c, ordinal)
  GROUP BY b.tenant_id, b.branch_id
)
UPDATE branch_state b SET
  state = jsonb_set(jsonb_set(b.state, '{checks}', corrected.checks), '{version}', to_jsonb(b.version + 1)),
  version = b.version + 1, updated_at = now()
FROM corrected
WHERE b.tenant_id = corrected.tenant_id AND b.branch_id = corrected.branch_id AND b.state->'checks' IS DISTINCT FROM corrected.checks;
