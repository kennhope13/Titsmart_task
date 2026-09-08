-- Bật tính năng tạo ID tự động (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- PHẦN 1: CÁC BẢNG CƠ BẢN (DỰ ÁN, NHÂN SỰ, CÔNG VIỆC)
-- ==========================================

-- 1. Bảng Engineers (Nhân sự)
CREATE TABLE IF NOT EXISTS engineers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    avatar TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Bảng Projects (Dự án)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    client TEXT,
    location TEXT,
    contract_value NUMERIC,
    progress_percent NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    active_teams INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    issue_tasks_count INTEGER DEFAULT 0,
    manager_id UUID REFERENCES engineers(id),
    manager_name TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Bảng phụ: Project Members
CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    engineer_id UUID REFERENCES engineers(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, engineer_id)
);

-- 3. Bảng Tasks (Công việc)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stt TEXT,
    code TEXT,
    name TEXT NOT NULL,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    project_name TEXT,
    volume NUMERIC DEFAULT 0,
    unit TEXT,
    progress NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Chưa làm',
    purchase_status TEXT,
    constr_status TEXT,
    issue TEXT,
    issue_status TEXT,
    is_done BOOLEAN DEFAULT false,
    is_section_header BOOLEAN DEFAULT false,
    section_name TEXT,
    parent_id UUID,
    notes TEXT,
    assigner_id UUID,
    assigner_name TEXT,
    assigned_engineer_id UUID,
    assigned_engineer_name TEXT,
    reviewer_id UUID,
    reviewer_name TEXT,
    due_date DATE,
    priority TEXT DEFAULT 'Medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Bảng Materials (Vật tư)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    english_name TEXT,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    project_name TEXT,
    volume NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    unit_price NUMERIC,
    status TEXT,
    constr_status TEXT,
    supplier TEXT,
    initial_stock NUMERIC DEFAULT 0,
    current_stock NUMERIC DEFAULT 0,
    total_import NUMERIC DEFAULT 0,
    total_export NUMERIC DEFAULT 0,
    category TEXT,
    specs TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Bảng Inventory Transactions (Lịch sử Nhập/Xuất kho)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    material_code TEXT,
    material_name TEXT,
    specs TEXT,
    category TEXT,
    unit TEXT,
    quantity NUMERIC NOT NULL,
    source_or_project TEXT,
    receiver_name TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Bảng Issues (Sự cố)
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_code TEXT NOT NULL,
    title TEXT NOT NULL,
    project_name TEXT,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    location TEXT,
    reported_by TEXT,
    reported_time TIMESTAMP WITH TIME ZONE,
    description TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'OPEN',
    priority TEXT DEFAULT 'STANDARD',
    assigned_to TEXT,
    manager_directives TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Bảng phụ: Issue Timeline Logs
CREATE TABLE IF NOT EXISTS issue_timeline_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    time TIMESTAMP WITH TIME ZONE,
    author TEXT,
    message TEXT
);

-- 7. Bảng Activity Logs (Lịch sử hoạt động)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user" TEXT NOT NULL,
    action TEXT NOT NULL,
    project TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    icon TEXT,
    badge_bg TEXT,
    icon_color TEXT
);

-- 8. Bảng Notifications (Thông báo)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    read BOOLEAN DEFAULT false,
    type TEXT,
    icon TEXT
);


-- ==========================================
-- PHẦN 2: CÁC BẢNG KẾ TOÁN & KẾ HOẠCH
-- ==========================================

-- 1. Kế hoạch vật tư (Kỹ thuật & Tiến độ)
CREATE TABLE IF NOT EXISTS material_plans (
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
CREATE TABLE IF NOT EXISTS purchasing_plans (
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
CREATE TABLE IF NOT EXISTS expenses (
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
CREATE TABLE IF NOT EXISTS labor_payrolls (
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
CREATE TABLE IF NOT EXISTS document_tracks (
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
CREATE TABLE IF NOT EXISTS field_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    date DATE,
    weather TEXT,
    temperature TEXT,
    work_completed TEXT,
    equipment_used TEXT,
    workers_present INTEGER DEFAULT 0,
    issues TEXT,
    photos JSONB,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- PHẦN 3: BẬT BẢO MẬT & PHÂN QUYỀN (RLS)
-- ==========================================

-- Bật RLS cho TẤT CẢ các bảng
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_timeline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchasing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_logs ENABLE ROW LEVEL SECURITY;

-- Xóa Policy cũ (nếu có) để tránh lỗi trùng lặp khi chạy nhiều lần
DO \$\$ 
DECLARE
    table_name TEXT;
    policy_name TEXT;
BEGIN
    FOR table_name, policy_name IN (
        SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
    END LOOP;
END \$\$;

-- Tạo Policy mới: Chống rò rỉ dữ liệu (Chỉ nhân viên đã đăng nhập mới được truy cập)
CREATE POLICY "Chỉ NV Đăng Nhập" ON projects FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON project_members FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON materials FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON inventory_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON issues FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON issue_timeline_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON engineers FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON activity_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON notifications FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON material_plans FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON purchasing_plans FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON labor_payrolls FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON document_tracks FOR ALL TO authenticated USING (true);
CREATE POLICY "Chỉ NV Đăng Nhập" ON field_logs FOR ALL TO authenticated USING (true);

