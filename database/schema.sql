-- =============================================================================
-- TITSMART WORK MANAGEMENT SYSTEM - FULL SUPABASE / POSTGRESQL SCHEMA DDL
-- File: database/schema.sql
-- Mô tả: File khởi tạo cấu trúc đầy đủ các bảng CSDL Supabase (không bao gồm dữ liệu).
-- Người dùng clone code về local có thể thực thi trực tiếp file này trên Supabase SQL Editor / PostgreSQL.
-- =============================================================================

-- 1. Kích hoạt Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. BẢNG ENGINEERS (Nhân sự & Tài khoản)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS engineers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT,
    username TEXT UNIQUE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    avatar TEXT,
    phone TEXT,
    email TEXT,
    role TEXT DEFAULT 'Kỹ sư',
    status TEXT DEFAULT 'Hoạt động',
    password TEXT,
    password_hash TEXT,
    project_codes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- -----------------------------------------------------------------------------
-- 2. BẢNG PROJECTS (Dự án)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    client TEXT,
    location TEXT DEFAULT '',
    contract_value NUMERIC DEFAULT 0,
    progress_percent NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    active_teams INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    issue_tasks_count INTEGER DEFAULT 0,
    manager_id UUID REFERENCES engineers(id) ON DELETE SET NULL,
    manager_name TEXT,
    members JSONB DEFAULT '[]'::jsonb,
    member_ids JSONB DEFAULT '[]'::jsonb,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- Bảng liên kết thành viên dự án
CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    engineer_id UUID REFERENCES engineers(id) ON DELETE CASCADE,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (project_id, engineer_id)
);

-- -----------------------------------------------------------------------------
-- 3. BẢNG TASKS (Tiến độ & Hạng mục Công việc)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stt TEXT,
    code TEXT,
    name TEXT NOT NULL,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    project_name TEXT,
    volume NUMERIC DEFAULT 0,
    unit TEXT DEFAULT '',
    progress NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Chưa làm',
    priority TEXT DEFAULT 'Medium',
    purchase_status TEXT DEFAULT '',
    constr_status TEXT DEFAULT '',
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
    source_row JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- -----------------------------------------------------------------------------
-- 4. BẢNG MATERIALS (Danh mục & Kho Vật tư)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    english_name TEXT,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    project_name TEXT,
    volume NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    unit_price NUMERIC DEFAULT 0,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- -----------------------------------------------------------------------------
-- 5. BẢNG INVENTORY_TRANSACTIONS (Giao dịch Nhập / Xuất Kho)
-- -----------------------------------------------------------------------------
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
    quantity NUMERIC NOT NULL DEFAULT 0,
    source_or_project TEXT,
    receiver_name TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- -----------------------------------------------------------------------------
-- 6. BẢNG ISSUES (Sự cố & Vướng mắc)
-- -----------------------------------------------------------------------------
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- Bảng phụ: Nhật ký xử lý sự cố
CREATE TABLE IF NOT EXISTS issue_timeline_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    author TEXT,
    message TEXT
);

-- -----------------------------------------------------------------------------
-- 7. BẢNG MATERIAL_PLANS (Kế hoạch vật tư & Kỹ thuật)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    stt TEXT,
    job_content TEXT,
    unit TEXT,
    contract_volume NUMERIC DEFAULT 0,
    tech_spec_model TEXT,
    tech_spec_origin TEXT,
    ordered_volume NUMERIC DEFAULT 0,
    ordered_status TEXT,
    expected_date DATE,
    issue_content TEXT,
    issue_status TEXT,
    doc_co BOOLEAN DEFAULT false,
    doc_cq BOOLEAN DEFAULT false,
    doc_fire_inspection BOOLEAN DEFAULT false,
    dispatch_to_site BOOLEAN DEFAULT false,
    dispatch_date DATE,
    supply_scope TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- -----------------------------------------------------------------------------
-- 8. BẢNG PURCHASING_PLANS (Kế hoạch Mua hàng & Tài chính)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchasing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_plan_id UUID REFERENCES material_plans(id) ON DELETE CASCADE,
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    stt TEXT,
    content TEXT,
    unit TEXT,
    volume_contract NUMERIC DEFAULT 0,
    volume_order NUMERIC DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    vat_rate NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    prepay_percent NUMERIC DEFAULT 0,
    prepay_amount NUMERIC DEFAULT 0,
    remaining_amount NUMERIC DEFAULT 0,
    order_status TEXT,
    contract_status TEXT,
    payment_date DATE,
    invoice_status TEXT,
    supplier_quote NUMERIC DEFAULT 0,
    selected_supplier TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- -----------------------------------------------------------------------------
-- 9. BẢNG EXPENSES (Chi phí Dự án / Văn phòng)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    date DATE,
    content TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    category TEXT,
    payment_method TEXT,
    requester TEXT,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- -----------------------------------------------------------------------------
-- 10. BẢNG LABOR_PAYROLLS (Chi phí Lương công nhật)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS labor_payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    worker_name TEXT NOT NULL,
    role TEXT,
    working_days NUMERIC DEFAULT 0,
    daily_rate NUMERIC DEFAULT 0,
    total_salary NUMERIC DEFAULT 0,
    advance_payment NUMERIC DEFAULT 0,
    remaining_payment NUMERIC DEFAULT 0,
    payment_status TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- -----------------------------------------------------------------------------
-- 11. BẢNG DOCUMENT_TRACKS (Theo dõi Hồ sơ & Chứng từ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code TEXT REFERENCES projects(code) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    submission_date DATE,
    recipient TEXT,
    status TEXT,
    expected_approval_date DATE,
    actual_approval_date DATE,
    hard_copy_location TEXT,
    soft_copy_link TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- -----------------------------------------------------------------------------
-- 12. BẢNG FIELD_LOGS (Nhật ký Hiện trường / Chấm công)
-- -----------------------------------------------------------------------------
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
    action TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- -----------------------------------------------------------------------------
-- 13. BẢNG ACTIVITY_LOGS (Lịch sử Hoạt động & Nhật ký Cập nhật)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name TEXT,
    "user" TEXT,
    action TEXT NOT NULL,
    project TEXT,
    project_code TEXT,
    icon TEXT,
    badge_bg TEXT,
    icon_color TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 14. BẢNG NOTIFICATIONS (Thông báo Hệ thống)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    type TEXT,
    icon TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- CHỈ MỤC INDEXES (Tối ưu truy vấn)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tasks_project_code ON tasks(project_code);
CREATE INDEX IF NOT EXISTS idx_materials_project_code ON materials(project_code);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_material_id ON inventory_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_issues_project_code ON issues(project_code);
CREATE INDEX IF NOT EXISTS idx_material_plans_project_code ON material_plans(project_code);
CREATE INDEX IF NOT EXISTS idx_purchasing_plans_project_code ON purchasing_plans(project_code);
CREATE INDEX IF NOT EXISTS idx_expenses_project_code ON expenses(project_code);
CREATE INDEX IF NOT EXISTS idx_labor_payrolls_project_code ON labor_payrolls(project_code);
CREATE INDEX IF NOT EXISTS idx_document_tracks_project_code ON document_tracks(project_code);
CREATE INDEX IF NOT EXISTS idx_field_logs_project_code ON field_logs(project_code);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);

-- -----------------------------------------------------------------------------
-- PHÂN QUYỀN VÀ BẢO MẬT (RLS - Row Level Security)
-- -----------------------------------------------------------------------------
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

-- Policy mặc định cho phép truy cập đầy đủ từ ứng dụng
DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public Full Access" ON %I', t);
        EXECUTE format('CREATE POLICY "Public Full Access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;
