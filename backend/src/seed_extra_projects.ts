import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('Seeding extra projects (TRAON, PHUOCLY, THIFACO, PHUOCTAN_SCADA, BINHMINH, VUNGLIEM)...');

    const projects = [
      {
        code: 'TRAON',
        name: 'Trạm biến áp 110kV Trà Ôn',
        location: 'Vĩnh Long',
        status: 'active' as const,
        manager_name: 'Kỹ sư Nam',
        start_date: new Date('2026-04-10'),
        end_date: new Date('2027-04-10'),
      },
      {
        code: 'PHUOCLY',
        name: 'Trạm biến áp 110kV Phước Lý',
        location: 'Long An',
        status: 'active' as const,
        manager_name: 'Kỹ sư Hùng',
        start_date: new Date('2026-04-10'),
        end_date: new Date('2027-04-10'),
      },
      {
        code: 'THIFACO',
        name: 'Dự án THIFACO-TSM',
        location: 'TP. HCM',
        status: 'active' as const,
        manager_name: 'Kỹ sư Lan',
        start_date: new Date('2026-04-10'),
        end_date: new Date('2027-04-10'),
      },
      {
        code: 'PHUOCTAN_SCADA',
        name: 'Hệ thống SCADA & TTLL - TBA 110kV Phước Tân',
        location: 'Đồng Nai',
        status: 'active' as const,
        manager_name: 'Kỹ sư Hùng',
        start_date: new Date('2026-04-10'),
        end_date: new Date('2027-04-10'),
      },
      {
        code: 'BINHMINH',
        name: 'Trạm biến áp 110kV Bình Minh',
        location: 'Vĩnh Long',
        status: 'active' as const,
        manager_name: 'Kỹ sư Nam',
        start_date: new Date('2026-04-10'),
        end_date: new Date('2027-04-10'),
      },
      {
        code: 'VUNGLIEM',
        name: 'Trạm biến áp 110kV Vũng Liêm',
        location: 'Vĩnh Long',
        status: 'active' as const,
        manager_name: 'Kỹ sư Lan',
        start_date: new Date('2026-04-10'),
        end_date: new Date('2027-04-10'),
      },
    ];

    for (const proj of projects) {
      await prisma.project.upsert({
        where: { code: proj.code },
        update: {},
        create: proj,
      });
      console.log(`  ✔ Upserted project: ${proj.code} - ${proj.name}`);
    }

    console.log('\n✅ Seeding extra projects completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding extra projects:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
