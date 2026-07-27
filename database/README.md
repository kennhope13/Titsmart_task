# PostgreSQL Database

Thu muc nay chua schema PostgreSQL cho he thong quan ly cong viec cong trinh.

## Cau truc

- `migrations/001_init_postgresql.sql`: tao extension, enum, bang, khoa ngoai, trigger `updated_at`, index.
- `seeds/001_seed_core.sql`: du lieu mau toi thieu cho users, projects, tasks, materials, issues, notifications.

## Tao database local bang psql

```powershell
createdb titsmart_work_management
psql -d titsmart_work_management -f database/migrations/001_init_postgresql.sql
psql -d titsmart_work_management -f database/seeds/001_seed_core.sql
```

Chuoi ket noi de backend dung ve sau:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/titsmart_work_management
```

## Tao database local bang Docker

```powershell
docker compose -f database/docker-compose.postgres.yml up -d
psql "postgresql://postgres:postgres@localhost:5432/titsmart_work_management" -f database/migrations/001_init_postgresql.sql
psql "postgresql://postgres:postgres@localhost:5432/titsmart_work_management" -f database/seeds/001_seed_core.sql
```

## Bang chinh

- `users`
- `projects`
- `tasks`
- `task_assignments`
- `materials`
- `inventory_transactions`
- `progress_updates`
- `issues`
- `issue_comments`
- `attachments`
- `notifications`
- `activity_logs`
- `project_material_plans`
- `project_purchasing`
- `project_expenses`
- `labor_payrolls`
- `document_tracks`

