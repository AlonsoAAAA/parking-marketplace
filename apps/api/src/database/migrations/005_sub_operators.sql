-- ================================================================
-- 005_sub_operators.sql
-- Adds sub-operator support: parent link, is_active flag, role update
-- ================================================================

-- 1. Add is_active column (default true — existing users unaffected)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Add parent_operator_id for sub-operator → operator link
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_operator_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 3. Expand role constraint to include sub_operator
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'operator', 'sub_operator', 'user'));

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('is_active', 'parent_operator_id', 'role');
