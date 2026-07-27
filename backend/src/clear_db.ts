import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearDatabase() {
  console.log('Đang xóa toàn bộ dữ liệu mẫu trong cơ sở dữ liệu...');
  try {
    // Delete in correct order to avoid foreign key constraints
    await prisma.activityLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.issueComment.deleteMany();
    await prisma.issue.deleteMany();
    await prisma.inventoryTransaction.deleteMany();
    await prisma.material.deleteMany();
    await prisma.taskAssignment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMaterialPlan.deleteMany();
    await prisma.projectPurchasing.deleteMany();
    await prisma.projectExpense.deleteMany();
    await prisma.laborPayroll.deleteMany();
    await prisma.documentTrack.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    console.log('Xóa dữ liệu thành công! Cơ sở dữ liệu hiện tại đang trống hoàn toàn.');
  } catch (error) {
    console.error('Lỗi khi xóa dữ liệu:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

clearDatabase();
