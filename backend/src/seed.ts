import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('Đang đọc file SQL seed...');
    const seedPath = path.join(__dirname, '../../database/seeds/001_seed_core.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');

    console.log('Đang thực thi các câu lệnh SQL để nạp dữ liệu mẫu...');
    // We execute the raw SQL script
    await prisma.$executeRawUnsafe(sql);
    console.log('Nạp dữ liệu mẫu PostgreSQL thành công!');
  } catch (error) {
    console.error('Lỗi khi nạp dữ liệu mẫu:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
