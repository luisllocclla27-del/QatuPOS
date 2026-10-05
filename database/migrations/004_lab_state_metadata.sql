-- Upgrade only missing metadata from the initial laboratory seed, preserving all sales.
UPDATE branch_state
SET state = jsonb_set(state, '{business_days}', jsonb_build_array(state->'business_day'))
WHERE NOT state ? 'business_days';
UPDATE branch_state
SET state = jsonb_set(state, '{count_versions}', '{}'::jsonb)
WHERE NOT state ? 'count_versions';
