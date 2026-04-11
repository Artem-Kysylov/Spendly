ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS recurring_rule_id uuid;

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_rule_id
ON public.transactions(recurring_rule_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_recurring_rule_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_recurring_rule_id_fkey
    FOREIGN KEY (recurring_rule_id)
    REFERENCES public.recurring_rules(id)
    ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.transactions.recurring_rule_id IS 'Optional link to the parent recurring_rules entry that generated or governs this transaction.';
