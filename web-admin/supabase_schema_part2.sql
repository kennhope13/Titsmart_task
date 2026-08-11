-- ==========================================
-- PHẦN 2: CÁC BẢNG KẾ TOÁN & KẾ HOẠCH
-- ==========================================

-- 1. Kế hoạch vật tư (Kỹ thuật & Tiến độ)
CREATE TABLE material_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stt TEXT,
    job_content TEXT,
    unit TEXT,
    contract_volume NUMERIC DEFAULT 0,
    technical_standards TEXT,
    status TEXT,
    progress TEXT,
    notes TEXT,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Kế hoạch mua sắm (Đặt hàng & Vướng mắc)
CREATE TABLE purchasing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stt TEXT,
    job_content TEXT,
    unit TEXT,
    contract_volume NUMERIC DEFAULT 0,
    contractor_volume NUMERIC DEFAULT 0,
    supplier_quote NUMERIC DEFAULT 0,
    selected_supplier TEXT,
    unit_price NUMERIC DEFAULT 0,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    order_status TEXT,
    issues TEXT,
    resolution TEXT,
    resolved BOOLEAN DEFAULT false,
    notes TEXT,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Chi phí công trình
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE,
    content TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    category TEXT,
    payment_method TEXT,
    requester TEXT,
    status TEXT,
    notes TEXT,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Lương công nhật
CREATE TABLE labor_payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_name TEXT NOT NULL,
    role TEXT,
    working_days NUMERIC DEFAULT 0,
    daily_rate NUMERIC DEFAULT 0,
    total_salary NUMERIC DEFAULT 0,
    advance_payment NUMERIC DEFAULT 0,
    remaining_payment NUMERIC DEFAULT 0,
    payment_status TEXT,
    notes TEXT,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Theo dõi hồ sơ chứng từ
CREATE TABLE document_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type TEXT NOT NULL,
    submission_date DATE,
    recipient TEXT,
    status TEXT,
    expected_approval_date DATE,
    actual_approval_date DATE,
    hard_copy_location TEXT,
    soft_copy_link TEXT,
    notes TEXT,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Nhật ký hiện trường
CREATE TABLE field_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    date DATE,
    weather TEXT,
    temperature TEXT,
    work_completed TEXT,
    equipment_used TEXT,
    workers_present INTEGER DEFAULT 0,
    issues TEXT,
    photos JSONB, -- Mảng các đường dẫn ảnh
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- BẬT BẢO MẬT (RLS) CHO CÁC BẢNG MỚI (Chỉ nhân viên đăng nhập mới được truy cập)
ALTER TABLE material_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchasing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chỉ NV Đăng Nhập" ON material_plans FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON purchasing_plans FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON labor_payrolls FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON document_tracks FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON field_logs FOR ALL TO authenticated USING (true);
