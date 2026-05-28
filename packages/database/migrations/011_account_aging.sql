-- Aging view for account receivables
CREATE OR REPLACE VIEW account_aging AS
SELECT
  am.tenant_id,
  am.client_id,
  c.name AS client_name,
  SUM(CASE WHEN am.movement_date >= CURRENT_DATE - 30  AND am.debit > 0 THEN am.debit ELSE 0 END) AS current_bucket,
  SUM(CASE WHEN am.movement_date BETWEEN CURRENT_DATE - 60 AND CURRENT_DATE - 31 AND am.debit > 0 THEN am.debit ELSE 0 END) AS days_31_60,
  SUM(CASE WHEN am.movement_date BETWEEN CURRENT_DATE - 90 AND CURRENT_DATE - 61 AND am.debit > 0 THEN am.debit ELSE 0 END) AS days_61_90,
  SUM(CASE WHEN am.movement_date < CURRENT_DATE - 90  AND am.debit > 0 THEN am.debit ELSE 0 END) AS over_90,
  c.current_account AS current_balance
FROM account_movements am
JOIN clients c ON c.id = am.client_id
GROUP BY am.tenant_id, am.client_id, c.name, c.current_account;
