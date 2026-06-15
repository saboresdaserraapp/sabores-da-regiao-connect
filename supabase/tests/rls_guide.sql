-- RLS Verification Script for Sabores da Serra

-- 1. Test: Owner can only update their own establishment
-- EXPECTED: Success for own ID, Error for others
-- UPDATE establishments SET name = 'Novo Nome' WHERE id = 'OWN_ID';
-- UPDATE establishments SET name = 'Hack' WHERE id = 'OTHER_ID';

-- 2. Test: Owner can only create/update categories in their store
-- EXPECTED: Success if establishment_id is theirs
-- INSERT INTO menu_categories (establishment_id, name) VALUES ('OWN_ID', 'Nova Cat');

-- 3. Test: Public cannot see pending stores
-- SELECT count(*) FROM establishments WHERE approval_status = 'pending_approval';
-- (This should return 0 if run as 'anon' role with proper RLS)

-- 4. Test: Owner can only see their own stock movements
-- SELECT * FROM stock_movements WHERE establishment_id <> 'OWN_ID';
-- (Should return 0)

-- 5. Test: Team basic plan limits
-- INSERT INTO establishment_owners (establishment_id, user_id, role) 
-- VALUES ('OWN_ID', 'FRIEND_ID', 'attendant');
-- (Should be blocked by trigger if plan is 'presenca')
