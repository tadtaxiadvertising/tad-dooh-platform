-- Migration: add_currency_to_financial_transactions
-- Date: 2026-09-17
-- Multi-moneda: añade campo `currency` (ISO 4217) a financial_transactions.
--
-- Contexto: el código ya emitía `currency: "DOP"` en varios objetos de respuesta,
-- pero el modelo no tenía el campo → la moneda no se persistía. Se añade ahora
-- como enum Currency (DOP default) + índice para consultas por moneda.
-- No hay pérdida de datos: todas las transacciones existentes son DOP.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'Currency'
  ) THEN
    CREATE TYPE "Currency" AS ENUM ('DOP', 'USD', 'EUR');
  END IF;
END $$;

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS currency "Currency" NOT NULL DEFAULT 'DOP';

CREATE INDEX IF NOT EXISTS idx_financial_transactions_currency
  ON financial_transactions (currency);

COMMENT ON COLUMN financial_transactions.currency
  IS 'ISO 4217 — moneda funcional de la transacción. Default DOP.';

-- Verificación:
-- SELECT currency, COUNT(*) FROM financial_transactions GROUP BY currency;