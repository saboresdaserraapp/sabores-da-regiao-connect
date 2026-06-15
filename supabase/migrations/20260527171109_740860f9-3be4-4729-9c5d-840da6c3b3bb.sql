
-- Extend order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'recebido';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmado';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'em_preparo';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pronto';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'saiu_entrega';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'concluido';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelado';
