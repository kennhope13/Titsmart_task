BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'procurement', 'engineer', 'viewer');
CREATE TYPE account_status AS ENUM ('active', 'locked', 'inactive');
CREATE TYPE project_status AS ENUM ('active', 'completed', 'on_hold');
CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE issue_status AS ENUM ('open', 'processing', 'resolved');
CREATE TYPE issue_priority AS ENUM ('standard', 'warning', 'critical');
CREATE TYPE notification_type AS ENUM ('task_assigned', 'issue_alert', 'material_update', 'system');
CREATE TYPE inventory_transaction_type AS ENUM ('import', 'export');
CREATE TYPE attachment_owner_type AS ENUM ('task', 'issue', 'progress_update', 'material', 'document_track', 'expense', 'labor_payroll');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) UNIQUE,
  full_name varchar(255) NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  phone varchar(50),
  password_hash text,
  role user_role NOT NULL DEFAULT 'engineer',
  title varchar(255),
  avatar_url text,
  status account_status NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) UNIQUE NOT NULL,
  name varchar(255) NOT NULL,
  location varchar(255) NOT NULL DEFAULT '',
  status project_status NOT NULL DEFAULT 'active',
  manager_id uuid REFERENCES users(id) ON DELETE SET NULL,
  manager_name varchar(255),
  start_date date,
  end_date date,
  active_teams integer NOT NULL DEFAULT 0 CHECK (active_teams >= 0),
  progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  total_tasks integer NOT NULL DEFAULT 0 CHECK (total_tasks >= 0),
  completed_tasks integer NOT NULL DEFAULT 0 CHECK (completed_tasks >= 0),
  issue_tasks_count integer NOT NULL DEFAULT 0 CHECK (issue_tasks_count >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stt varchar(50),
  code varchar(100) UNIQUE NOT NULL,
  name text NOT NULL,
  volume numeric(18,4) NOT NULL DEFAULT 0,
  unit varchar(50) NOT NULL DEFAULT '',
  progress numeric(7,4) NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  status task_status NOT NULL DEFAULT 'not_started',
  priority task_priority NOT NULL DEFAULT 'medium',
  purchase_status varchar(255) NOT NULL DEFAULT '',
  construction_status varchar(255) NOT NULL DEFAULT '',
  issue_summary text,
  issue_status_text varchar(255),
  is_done boolean NOT NULL DEFAULT false,
  is_section_header boolean NOT NULL DEFAULT false,
  section_name text,
  notes text,
  assigned_engineer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  due_date date,
  source_row jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE (task_id, user_id)
);

CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  code varchar(100) UNIQUE NOT NULL,
  name text NOT NULL,
  english_name text,
  volume numeric(18,4) NOT NULL DEFAULT 0,
  unit varchar(50) NOT NULL DEFAULT '',
  unit_price numeric(18,2) NOT NULL DEFAULT 0,
  status varchar(255) NOT NULL DEFAULT '',
  construction_status varchar(255),
  supplier varchar(255),
  initial_stock numeric(18,4) NOT NULL DEFAULT 0,
  current_stock numeric(18,4) NOT NULL DEFAULT 0,
  total_import numeric(18,4) NOT NULL DEFAULT 0,
  total_export numeric(18,4) NOT NULL DEFAULT 0,
  category varchar(255),
  specs text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  type inventory_transaction_type NOT NULL,
  transaction_date date NOT NULL,
  quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
  source_or_project varchar(255) NOT NULL DEFAULT '',
  receiver_name varchar(255),
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE progress_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  progress numeric(7,4) NOT NULL CHECK (progress >= 0 AND progress <= 1),
  status task_status NOT NULL,
  note text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  incident_code varchar(100) UNIQUE NOT NULL,
  title text NOT NULL,
  location text NOT NULL DEFAULT '',
  reported_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reported_by_name varchar(255),
  reported_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL DEFAULT '',
  photo_url text,
  status issue_status NOT NULL DEFAULT 'open',
  priority issue_priority NOT NULL DEFAULT 'standard',
  assigned_to_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_name varchar(255),
  manager_directives text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE issue_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_name varchar(255),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type attachment_owner_type NOT NULL,
  owner_id uuid NOT NULL,
  file_name varchar(255) NOT NULL,
  file_url text NOT NULL,
  mime_type varchar(120),
  file_size_bytes bigint CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  message text NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  icon varchar(80),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_name varchar(255) NOT NULL,
  action text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  project_name varchar(255),
  icon varchar(80),
  badge_bg varchar(80),
  icon_color varchar(80),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_material_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stt varchar(50),
  job_content text NOT NULL,
  unit varchar(50) NOT NULL DEFAULT '',
  contract_volume numeric(18,4) NOT NULL DEFAULT 0,
  tech_spec_model text,
  tech_spec_origin text,
  progress_status varchar(255),
  ordered_volume numeric(18,4) NOT NULL DEFAULT 0,
  ordered_status varchar(255),
  expected_date date,
  issue_content text,
  issue_status text,
  doc_co boolean NOT NULL DEFAULT false,
  doc_cq boolean NOT NULL DEFAULT false,
  doc_fire_inspection boolean NOT NULL DEFAULT false,
  dispatch_to_site boolean NOT NULL DEFAULT false,
  dispatch_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_purchasing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stt varchar(50),
  content text NOT NULL,
  unit varchar(50) NOT NULL DEFAULT '',
  volume_contract numeric(18,4) NOT NULL DEFAULT 0,
  volume_order numeric(18,4) NOT NULL DEFAULT 0,
  unit_price numeric(18,2) NOT NULL DEFAULT 0,
  vat_rate numeric(5,2) NOT NULL DEFAULT 0,
  vat_amount numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  prepay_percent numeric(5,2) NOT NULL DEFAULT 0,
  prepay_amount numeric(18,2) NOT NULL DEFAULT 0,
  remaining_amount numeric(18,2) NOT NULL DEFAULT 0,
  order_status varchar(255) NOT NULL DEFAULT '',
  contract_status varchar(255) NOT NULL DEFAULT '',
  payment_date date,
  invoice_status varchar(255),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stt varchar(50),
  expense_date date NOT NULL,
  content text NOT NULL,
  description text NOT NULL DEFAULT '',
  unit varchar(50) NOT NULL DEFAULT '',
  quantity numeric(18,4) NOT NULL DEFAULT 0,
  unit_price numeric(18,2) NOT NULL DEFAULT 0,
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  income_amount numeric(18,2) NOT NULL DEFAULT 0,
  balance_fund numeric(18,2) NOT NULL DEFAULT 0,
  notes text,
  invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE labor_payrolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stt varchar(50),
  payroll_date date NOT NULL,
  content text NOT NULL,
  description text NOT NULL DEFAULT '',
  worker_name varchar(255),
  unit varchar(50) NOT NULL DEFAULT '',
  quantity numeric(18,4) NOT NULL DEFAULT 0,
  unit_price numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  bank_account varchar(255) NOT NULL DEFAULT '',
  bank_info text,
  id_card_front_url text,
  id_card_back_url text,
  payment_status varchar(255) NOT NULL DEFAULT '',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE document_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stt varchar(50),
  contract_no varchar(120) NOT NULL,
  contract_name text NOT NULL,
  company varchar(255) NOT NULL DEFAULT '',
  receiver_name varchar(255) NOT NULL DEFAULT '',
  phone varchar(50) NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  send_date date NOT NULL,
  receive_date date,
  doc_status varchar(255) NOT NULL DEFAULT '',
  side varchar(255),
  contract_value numeric(18,2) NOT NULL DEFAULT 0,
  prepay_percent numeric(5,2) NOT NULL DEFAULT 0,
  prepay_amount numeric(18,2) NOT NULL DEFAULT 0,
  payment_status varchar(255) NOT NULL DEFAULT '',
  is_completed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER materials_set_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER issues_set_updated_at BEFORE UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER project_material_plans_set_updated_at BEFORE UPDATE ON project_material_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER project_purchasing_set_updated_at BEFORE UPDATE ON project_purchasing FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER project_expenses_set_updated_at BEFORE UPDATE ON project_expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER labor_payrolls_set_updated_at BEFORE UPDATE ON labor_payrolls FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER document_tracks_set_updated_at BEFORE UPDATE ON document_tracks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_engineer_id ON tasks(assigned_engineer_id);
CREATE INDEX idx_materials_project_id ON materials(project_id);
CREATE INDEX idx_materials_task_id ON materials(task_id);
CREATE INDEX idx_inventory_transactions_material_id ON inventory_transactions(material_id);
CREATE INDEX idx_inventory_transactions_project_id ON inventory_transactions(project_id);
CREATE INDEX idx_progress_updates_task_id ON progress_updates(task_id);
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_issues_task_id ON issues(task_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX idx_attachments_owner ON attachments(owner_type, owner_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_project_material_plans_project_id ON project_material_plans(project_id);
CREATE INDEX idx_project_purchasing_project_id ON project_purchasing(project_id);
CREATE INDEX idx_project_expenses_project_id ON project_expenses(project_id);
CREATE INDEX idx_labor_payrolls_project_id ON labor_payrolls(project_id);
CREATE INDEX idx_document_tracks_project_id ON document_tracks(project_id);

COMMIT;
