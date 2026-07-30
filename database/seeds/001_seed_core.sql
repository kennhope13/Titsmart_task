BEGIN;

INSERT INTO users (id, code, full_name, email, phone, role, title, avatar_url)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'USR-ADMIN', 'Admin He thong', 'admin@buildcore.vn', '0900000000', 'admin', 'Quan tri he thong', NULL),
  ('00000000-0000-0000-0000-000000000101', 'ENG-001', 'Ky su Nam', 'nam.nguyen@buildcore.vn', '0903123456', 'engineer', 'Giam sat 110kV Dak R''Lap', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'),
  ('00000000-0000-0000-0000-000000000102', 'ENG-002', 'Ky su Hung', 'hung.tran@buildcore.vn', '0912987654', 'engineer', 'Chi huy 110kV Phuoc Tan', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'),
  ('00000000-0000-0000-0000-000000000103', 'ENG-003', 'Ky su Lan', 'lan.pham@buildcore.vn', '0988555777', 'engineer', 'Quan ly 220kV Nam Can', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80')
ON CONFLICT (email) DO NOTHING;

INSERT INTO projects (
  id, code, name, location, status, manager_id, manager_name,
  start_date, end_date, active_teams, progress_percent, total_tasks,
  completed_tasks, issue_tasks_count
)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'DAKRLAP', 'Tram bien ap 110kV Dak R''Lap', 'Dak Nong', 'active', '00000000-0000-0000-0000-000000000101', 'Ky su Nam', '2023-01-01', '2024-12-31', 3, 35, 2, 0, 1),
  ('10000000-0000-0000-0000-000000000002', 'PHUOCTAN', 'Tram bien ap 110kV Phuoc Tan', 'Dong Nai', 'active', '00000000-0000-0000-0000-000000000102', 'Ky su Hung', '2023-01-01', '2024-12-31', 3, 50, 1, 0, 0),
  ('10000000-0000-0000-0000-000000000003', 'NAMCAN', 'Duong day 220kV Nam Can', 'Ca Mau', 'active', '00000000-0000-0000-0000-000000000103', 'Ky su Lan', '2023-01-01', '2024-12-31', 3, 20, 1, 0, 1)
ON CONFLICT (code) DO NOTHING;

INSERT INTO tasks (
  id, project_id, stt, code, name, volume, unit, progress, status,
  priority, purchase_status, construction_status, issue_summary,
  issue_status_text, is_done, is_section_header, section_name,
  assigned_engineer_id, due_date, created_at
)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'I', 'TSK-DAKRLAP-001', 'Tu trung the va phu kien', 0, '', 0, 'not_started', 'medium', '', '', NULL, NULL, false, true, 'I. Tu trung the va phu kien', NULL, '2024-11-30', '2023-10-01'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '1', 'TSK-DAKRLAP-002', 'Lap dat tu RMU', 2, 'bo', 0.5, 'review', 'high', 'Da dat hang', 'Dang thi cong', 'Cho mat bang lap dat', 'Dang xu ly', false, false, 'I. Tu trung the va phu kien', '00000000-0000-0000-0000-000000000101', '2024-11-30', '2023-10-01'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '2', 'TSK-DAKRLAP-003', 'Keo cap dieu khien', 500, 'm', 0.2, 'in_progress', 'medium', 'Dang giao', 'Chua thi cong', NULL, NULL, false, false, 'I. Tu trung the va phu kien', '00000000-0000-0000-0000-000000000102', '2024-11-30', '2023-10-01'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '1', 'TSK-PHUOCTAN-001', 'Lap dat he thong tiep dia', 1, 'lot', 0.5, 'in_progress', 'low', 'Da co hang', 'Dang thi cong', NULL, NULL, false, false, 'Muc chung', '00000000-0000-0000-0000-000000000102', '2024-11-30', '2023-10-01'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '1', 'TSK-NAMCAN-001', 'Thi cong mong cot', 12, 'mong', 0.2, 'review', 'high', 'Da dat hang', 'Vuong mac', 'Vuong duong van chuyen vat tu', 'Cho chi dao', false, false, 'Muc chung', '00000000-0000-0000-0000-000000000103', '2024-11-30', '2023-10-01')
ON CONFLICT (code) DO NOTHING;

INSERT INTO task_assignments (task_id, user_id, assigned_by, notes)
VALUES
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Phan cong tu seed PostgreSQL'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Phan cong tu seed PostgreSQL'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Phan cong tu seed PostgreSQL'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Phan cong tu seed PostgreSQL')
ON CONFLICT (task_id, user_id) DO NOTHING;

INSERT INTO materials (
  id, project_id, task_id, code, name, english_name, volume, unit,
  unit_price, status, construction_status, supplier, initial_stock,
  current_stock, total_import, total_export, category, specs
)
VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'MAT-100', 'Tu RMU', 'RMU cabinet', 2, 'bo', 25000000, 'Da dat hang', 'Dang thi cong', 'Nha cung cap VTTB Dien', 0, 1, 1, 0, 'Tu dien', '24kV'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'MAT-101', 'Cap dieu khien', 'Control cable', 500, 'm', 45000, 'Dang giao', 'Chua thi cong', 'Nha cung cap VTTB Dien', 0, 200, 200, 0, 'Cap dien', 'PVC/Cu'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', 'MAT-102', 'Thep mong cot', 'Foundation steel', 12, 'tan', 18000000, 'Da dat hang', 'Vuong mac', 'Nha cung cap ket cau', 0, 4, 4, 0, 'Ket cau', 'CB400')
ON CONFLICT (code) DO NOTHING;

INSERT INTO inventory_transactions (
  id, material_id, project_id, type, transaction_date, quantity,
  source_or_project, receiver_name, notes, created_by
)
VALUES
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'import', '2024-01-15', 1, 'Nha cung cap VTTB Dien', NULL, 'Nhap kho lan dau', '00000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'import', '2024-01-20', 200, 'Nha cung cap VTTB Dien', NULL, 'Nhap kho lan dau', '00000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'import', '2024-02-01', 4, 'Nha cung cap ket cau', NULL, 'Nhap kho lan dau', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO issues (
  id, project_id, task_id, incident_code, title, location, reported_by_id,
  reported_by_name, reported_at, description, photo_url, status, priority,
  assigned_to_id, assigned_to_name, manager_directives
)
VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'VM-DAKRLAP-001', 'Cho mat bang lap dat', 'Tram bien ap 110kV Dak R''Lap - I. Tu trung the va phu kien', '00000000-0000-0000-0000-000000000101', 'Ky su Nam', now(), 'Hang muc lap dat tu RMU dang cho mat bang lap dat.', NULL, 'processing', 'critical', '00000000-0000-0000-0000-000000000101', 'Ky su Nam', 'Yeu cau phoi hop ban quan ly mat bang.'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', 'VM-NAMCAN-001', 'Vuong duong van chuyen vat tu', 'Duong day 220kV Nam Can - Muc chung', '00000000-0000-0000-0000-000000000103', 'Ky su Lan', now(), 'Can xu ly duong van chuyen vat tu vao vi tri mong cot.', NULL, 'open', 'critical', '00000000-0000-0000-0000-000000000103', 'Ky su Lan', 'Khao sat lai phuong an van chuyen.')
ON CONFLICT (incident_code) DO NOTHING;

INSERT INTO issue_comments (id, issue_id, author_id, author_name, message)
VALUES
  ('41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Ky su Nam', 'Phat hien vuong mac tu tien do thi cong.'),
  ('41000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000103', 'Ky su Lan', 'Can chi dao xu ly duong van chuyen.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, user_id, title, message, type, icon, is_read)
VALUES
  ('50000000-0000-0000-0000-000000000001', NULL, 'Da khoi tao co so du lieu', 'PostgreSQL da co du lieu mau cho du an, cong viec, vat tu va vuong mac.', 'system', 'database', false),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000101', 'Phan cong cong viec', 'Ban duoc phan cong hang muc Lap dat tu RMU.', 'task_assigned', 'person_add', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_logs (id, user_id, user_name, action, project_id, project_name, icon, badge_bg, icon_color)
VALUES
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Admin He thong', 'Khoi tao database PostgreSQL va du lieu mau', NULL, 'He thong quan ly cong viec cong trinh', 'database', 'bg-blue-50', 'text-blue-500')
ON CONFLICT (id) DO NOTHING;

COMMIT;
