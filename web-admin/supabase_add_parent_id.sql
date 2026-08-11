-- ==========================================
-- BỔ SUNG CỘT PARENT_ID VÀ LIÊN KẾT CHO KẾ HOẠCH VÀ MUA HÀNG
-- Chạy đoạn SQL này trên Supabase SQL Editor
-- ==========================================

-- Bổ sung parent_id cho bảng material_plans (nếu chưa có)
ALTER TABLE material_plans 
ADD COLUMN IF NOT EXISTS parent_id UUID;

-- Bổ sung parent_id và material_plan_id cho bảng purchasing_plans
ALTER TABLE purchasing_plans 
ADD COLUMN IF NOT EXISTS parent_id UUID,
ADD COLUMN IF NOT EXISTS material_plan_id UUID;
