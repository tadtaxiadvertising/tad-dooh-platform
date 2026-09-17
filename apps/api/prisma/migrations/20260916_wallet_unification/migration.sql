-- Wallet Unification Migration (VULN #7)
-- Consolidates Driver.wallet_balance into Wallet.availableBalance as authoritative source
-- 
-- Steps:
-- 1. Create Wallet records for all drivers that don't have one
-- 2. Migrate balance from Driver.wallet_balance to Wallet.availableBalance
-- 3. Drop Driver.wallet_balance column (after verification)

-- Step 1: Create Wallet records for drivers without wallet
-- Use INSERT ON CONFLICT to avoid duplicates
INSERT INTO wallets (id, driver_id, available_balance, pending_withdrawal, bank_info)
SELECT 
  gen_random_uuid(),
  d.id,
  COALESCE(d.wallet_balance, 0)::numeric,
  0,
  d.bank_account
FROM drivers d
LEFT JOIN wallets w ON w.driver_id = d.id
WHERE w.id IS NULL;

-- Step 2: For drivers with both wallet and driver.wallet_balance,
-- update wallet with driver balance (take max to avoid data loss)
UPDATE wallets w
SET available_balance = GREATEST(w.available_balance, COALESCE(d.wallet_balance, 0))
FROM drivers d
WHERE w.driver_id = d.id
  AND COALESCE(d.wallet_balance, 0) > w.available_balance;

-- Step 3: Also copy bank_account to bank_info where wallet doesn't have it
UPDATE wallets w
SET bank_info = d.bank_account
FROM drivers d
WHERE w.driver_id = d.id
  AND w.bank_info IS NULL
  AND d.bank_account IS NOT NULL;

-- Verification query (run manually after migration):
-- SELECT d.id, d.full_name, d.wallet_balance, w.available_balance, w.bank_info
-- FROM drivers d
-- LEFT JOIN wallets w ON w.driver_id = d.id
-- ORDER BY d.created_at DESC
-- LIMIT 20;

-- Step 4: Drop the redundant column from drivers table
-- UNCOMMENT AFTER VERIFICATION:
-- ALTER TABLE drivers DROP COLUMN wallet_balance;