-- No extra tables needed as audit_log already exists, but let's ensure we have a trigger or explicit inserts.
-- The current request asks for registration of:
-- 1. Private link generation
-- 2. Address snapshot
-- 3. WhatsApp delivery status

-- Since we are already doing this in the code, I will add an explicit audit log entry for these actions.
-- I'll create a helper function if needed, but for now, I'll just ensure the audit_log table is ready to receive these.

-- Adding metadata columns to audit_log if they don't exist is risky if it's already used.
-- The existing audit_log has: action, actor_id, actor_role, meta (Json), target_id, target_type.

-- I will use the code to insert into audit_log when these events happen.
