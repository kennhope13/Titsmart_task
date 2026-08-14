-- =============================================================================
-- TITSMART Work Management - PostgreSQL Schema Export
-- Generated from: backend/prisma/schema.prisma
-- Database: titsmart_work_management
-- =============================================================================
--
-- ENUM types (10):
--   user_role, account_status, project_status, task_status, task_priority,
--   issue_status, issue_priority, notification_type,
--   inventory_transaction_type, attachment_owner_type
--
-- Tables (19):
--   users, projects, project_members, tasks, task_assignments,
--   materials, inventory_transactions, progress_updates, issues, issue_comments,
--   attachments, notifications, activity_logs, project_material_plans,
--   project_purchasing, project_expenses, labor_payrolls, document_tracks, field_logs
--
-- Includes: primary keys, unique constraints, indexes, foreign keys
-- Note: requires PostgreSQL extension pgcrypto for gen_random_uuid()
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'manager', 'procurement', 'engineer', 'viewer');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('active', 'locked', 'inactive');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('active', 'completed', 'on_hold');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('not_started', 'in_progress', 'review', 'done');

-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "issue_status" AS ENUM ('open', 'processing', 'resolved');

-- CreateEnum
CREATE TYPE "issue_priority" AS ENUM ('standard', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('task_assigned', 'issue_alert', 'material_update', 'system');

-- CreateEnum
CREATE TYPE "inventory_transaction_type" AS ENUM ('import', 'export');

-- CreateEnum
CREATE TYPE "attachment_owner_type" AS ENUM ('task', 'issue', 'progress_update', 'material', 'document_track', 'expense', 'labor_payroll');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50),
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "password_hash" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'engineer',
    "title" VARCHAR(255),
    "avatar_url" TEXT,
    "status" "account_status" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255) NOT NULL DEFAULT '',
    "status" "project_status" NOT NULL DEFAULT 'active',
    "manager_id" UUID,
    "manager_name" VARCHAR(255),
    "start_date" DATE,
    "end_date" DATE,
    "active_teams" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_tasks" INTEGER NOT NULL DEFAULT 0,
    "completed_tasks" INTEGER NOT NULL DEFAULT 0,
    "issue_tasks_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "role" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("user_id","project_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "stt" VARCHAR(50),
    "code" VARCHAR(100) NOT NULL,
    "name" TEXT NOT NULL,
    "volume" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit" VARCHAR(50) NOT NULL DEFAULT '',
    "progress" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "status" "task_status" NOT NULL DEFAULT 'not_started',
    "priority" "task_priority" NOT NULL DEFAULT 'medium',
    "purchase_status" VARCHAR(255) NOT NULL DEFAULT '',
    "construction_status" VARCHAR(255) NOT NULL DEFAULT '',
    "issue_summary" TEXT,
    "issue_status_text" VARCHAR(255),
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "is_section_header" BOOLEAN NOT NULL DEFAULT false,
    "section_name" TEXT,
    "parent_id" UUID,
    "notes" TEXT,
    "assigned_engineer_id" UUID,
    "due_date" DATE,
    "source_row" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "code" VARCHAR(100) NOT NULL,
    "name" TEXT NOT NULL,
    "english_name" TEXT,
    "volume" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit" VARCHAR(50) NOT NULL DEFAULT '',
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(255) NOT NULL DEFAULT '',
    "construction_status" VARCHAR(255),
    "supplier" VARCHAR(255),
    "initial_stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "current_stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_import" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_export" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "category" VARCHAR(255),
    "specs" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "material_id" UUID NOT NULL,
    "project_id" UUID,
    "type" "inventory_transaction_type" NOT NULL,
    "transaction_date" DATE NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "source_or_project" VARCHAR(255) NOT NULL DEFAULT '',
    "receiver_name" VARCHAR(255),
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "user_id" UUID,
    "progress" DECIMAL(7,4) NOT NULL,
    "status" "task_status" NOT NULL,
    "note" TEXT,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "incident_code" VARCHAR(100) NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "reported_by_id" UUID,
    "reported_by_name" VARCHAR(255),
    "reported_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL DEFAULT '',
    "photo_url" TEXT,
    "status" "issue_status" NOT NULL DEFAULT 'open',
    "priority" "issue_priority" NOT NULL DEFAULT 'standard',
    "assigned_to_id" UUID,
    "assigned_to_name" VARCHAR(255),
    "manager_directives" TEXT,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "issue_id" UUID NOT NULL,
    "author_id" UUID,
    "author_name" VARCHAR(255),
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_type" "attachment_owner_type" NOT NULL,
    "owner_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" VARCHAR(120),
    "file_size_bytes" BIGINT,
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "notification_type" NOT NULL DEFAULT 'system',
    "icon" VARCHAR(80),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "user_name" VARCHAR(255) NOT NULL,
    "action" TEXT NOT NULL,
    "project_id" UUID,
    "project_name" VARCHAR(255),
    "icon" VARCHAR(80),
    "badge_bg" VARCHAR(80),
    "icon_color" VARCHAR(80),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_material_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "stt" VARCHAR(50),
    "job_content" TEXT NOT NULL,
    "unit" VARCHAR(50) NOT NULL DEFAULT '',
    "contract_volume" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tech_spec_model" TEXT,
    "tech_spec_origin" TEXT,
    "tech_spec_status" VARCHAR(255),
    "progress_status" VARCHAR(255),
    "ordered_volume" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "ordered_status" VARCHAR(255),
    "expected_date" DATE,
    "issue_content" TEXT,
    "issue_status" TEXT,
    "doc_co" BOOLEAN NOT NULL DEFAULT false,
    "doc_cq" BOOLEAN NOT NULL DEFAULT false,
    "doc_fire_inspection" BOOLEAN NOT NULL DEFAULT false,
    "dispatch_to_site" BOOLEAN NOT NULL DEFAULT false,
    "dispatch_date" DATE,
    "notes" TEXT,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_material_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_purchasing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "stt" VARCHAR(50),
    "content" TEXT NOT NULL,
    "unit" VARCHAR(50) NOT NULL DEFAULT '',
    "volume_contract" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "volume_order" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "prepay_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "prepay_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "order_status" VARCHAR(255) NOT NULL DEFAULT '',
    "contract_status" VARCHAR(255) NOT NULL DEFAULT '',
    "payment_date" DATE,
    "invoice_status" VARCHAR(255),
    "notes" TEXT,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_purchasing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "stt" VARCHAR(50),
    "expense_date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "unit" VARCHAR(50) NOT NULL DEFAULT '',
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "income_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance_fund" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "invoice_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_payrolls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "stt" VARCHAR(50),
    "payroll_date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "worker_name" VARCHAR(255),
    "unit" VARCHAR(50) NOT NULL DEFAULT '',
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bank_account" VARCHAR(255) NOT NULL DEFAULT '',
    "bank_info" TEXT,
    "id_card_front_url" TEXT,
    "id_card_back_url" TEXT,
    "payment_status" VARCHAR(255) NOT NULL DEFAULT '',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labor_payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_tracks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID,
    "stt" VARCHAR(50),
    "contract_no" VARCHAR(120) NOT NULL,
    "contract_name" TEXT NOT NULL,
    "company" VARCHAR(255) NOT NULL DEFAULT '',
    "receiver_name" VARCHAR(255) NOT NULL DEFAULT '',
    "phone" VARCHAR(50) NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "send_date" DATE NOT NULL,
    "receive_date" DATE,
    "doc_status" VARCHAR(255) NOT NULL DEFAULT '',
    "side" VARCHAR(255),
    "contract_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "prepay_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "prepay_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "payment_status" VARCHAR(255) NOT NULL DEFAULT '',
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "note" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_code_key" ON "users"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "project_members_project_id_idx" ON "project_members"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_code_key" ON "tasks"("code");

-- CreateIndex
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_assigned_engineer_id_idx" ON "tasks"("assigned_engineer_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_task_id_user_id_key" ON "task_assignments"("task_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "materials_code_key" ON "materials"("code");

-- CreateIndex
CREATE INDEX "materials_project_id_idx" ON "materials"("project_id");

-- CreateIndex
CREATE INDEX "materials_task_id_idx" ON "materials"("task_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_material_id_idx" ON "inventory_transactions"("material_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_project_id_idx" ON "inventory_transactions"("project_id");

-- CreateIndex
CREATE INDEX "progress_updates_task_id_idx" ON "progress_updates"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "issues_incident_code_key" ON "issues"("incident_code");

-- CreateIndex
CREATE INDEX "issues_project_id_idx" ON "issues"("project_id");

-- CreateIndex
CREATE INDEX "issues_task_id_idx" ON "issues"("task_id");

-- CreateIndex
CREATE INDEX "issues_status_idx" ON "issues"("status");

-- CreateIndex
CREATE INDEX "issue_comments_issue_id_idx" ON "issue_comments"("issue_id");

-- CreateIndex
CREATE INDEX "attachments_owner_type_owner_id_idx" ON "attachments"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "activity_logs_project_id_idx" ON "activity_logs"("project_id");

-- CreateIndex
CREATE INDEX "project_material_plans_project_id_idx" ON "project_material_plans"("project_id");

-- CreateIndex
CREATE INDEX "project_purchasing_project_id_idx" ON "project_purchasing"("project_id");

-- CreateIndex
CREATE INDEX "project_expenses_project_id_idx" ON "project_expenses"("project_id");

-- CreateIndex
CREATE INDEX "labor_payrolls_project_id_idx" ON "labor_payrolls"("project_id");

-- CreateIndex
CREATE INDEX "document_tracks_project_id_idx" ON "document_tracks"("project_id");

-- CreateIndex
CREATE INDEX "field_logs_project_id_idx" ON "field_logs"("project_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_engineer_id_fkey" FOREIGN KEY ("assigned_engineer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_material_plans" ADD CONSTRAINT "project_material_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_material_plans" ADD CONSTRAINT "project_material_plans_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_material_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_purchasing" ADD CONSTRAINT "project_purchasing_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_purchasing" ADD CONSTRAINT "project_purchasing_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_purchasing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_payrolls" ADD CONSTRAINT "labor_payrolls_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_tracks" ADD CONSTRAINT "document_tracks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_logs" ADD CONSTRAINT "field_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

