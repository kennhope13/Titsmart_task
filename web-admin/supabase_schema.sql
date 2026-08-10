-- Khởi tạo Cơ sở dữ liệu cho TITSMART
-- Hướng dẫn: Copy toàn bộ nội dung file này và dán vào cửa sổ SQL Editor trên trang quản trị Supabase, sau đó bấm RUN.

-- Bật tính năng tạo ID tự động (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng Engineers (Nhân sự)
CREATE TABLE engineers (
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
CREATE TABLE projects (
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

-- Bảng phụ: Project Members (Nhiều-Nhiều giữa Project và Engineer)
CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    engineer_id UUID REFERENCES engineers(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, engineer_id)
);

-- 3. Bảng Tasks (Công việc)
CREATE TABLE tasks (
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
CREATE TABLE materials (
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
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL, -- 'IMPORT' hoặc 'EXPORT'
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
CREATE TABLE issues (
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

-- Bảng phụ: Issue Timeline Logs (Lịch sử sự cố)
CREATE TABLE issue_timeline_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    time TIMESTAMP WITH TIME ZONE,
    author TEXT,
    message TEXT
);

-- 7. Bảng Activity Logs (Lịch sử hoạt động)
CREATE TABLE activity_logs (
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
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    read BOOLEAN DEFAULT false,
    type TEXT,
    icon TEXT
);

-- TẮT TÍNH NĂNG BẢO MẬT (ROW LEVEL SECURITY) ĐỂ PHẦN MỀM ĐỌC/GHI NHANH GỌN
-- Chú ý: Đây là thiết lập phục vụ quá trình chuyển đổi.
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE engineers DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
