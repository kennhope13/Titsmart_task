-- ==========================================
-- BỔ SUNG CỘT CÒN THIẾU CHO BẢNG material_plans VÀ purchasing_plans
-- Chạy đoạn này SAU KHI đã chạy file supabase_schema_complete.sql
-- ==========================================

-- 1. Bổ sung cột cho bảng material_plans
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS tech_spec_model TEXT;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS tech_spec_origin TEXT;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS progress_status TEXT;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS ordered_volume NUMERIC DEFAULT 0;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS ordered_status TEXT;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS expected_date TEXT;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS issue_content TEXT;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS issue_status TEXT;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS doc_co BOOLEAN DEFAULT false;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS doc_cq BOOLEAN DEFAULT false;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS doc_fire_inspection BOOLEAN DEFAULT false;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS dispatch_to_site BOOLEAN DEFAULT false;
ALTER TABLE material_plans ADD COLUMN IF NOT EXISTS supply_scope TEXT;

-- 2. Bổ sung cột cho bảng purchasing_plans
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS volume_contract NUMERIC DEFAULT 0;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS volume_order NUMERIC DEFAULT 0;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 10;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS prepay_percent NUMERIC DEFAULT 0;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS prepay_amount NUMERIC DEFAULT 0;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC DEFAULT 0;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS order_status TEXT;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS contract_status TEXT;
ALTER TABLE purchasing_plans ADD COLUMN IF NOT EXISTS invoice_status TEXT;
