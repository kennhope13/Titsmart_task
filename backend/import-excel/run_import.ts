import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as xlsx from 'xlsx';
import path from 'path';

// Load env explicitly if needed, but it should be available
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const filePath = 'C:\\Users\\MSI\\Downloads\\Phụ Lục.xlsx';
  console.log(`Đang đọc file Excel: ${filePath}`);
  
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);
  const dataRows = rows.slice(2).filter(row => row.__EMPTY_2);

  console.log(`Tìm thấy ${dataRows.length} hạng mục hợp lệ. Đang tạo dự án mới (bằng Raw SQL do khác biệt Schema)...`);

  // Create Project
  const projectCode = `PRJ-PHULUC-${Date.now().toString().slice(-4)}`;
  const projectName = 'Dự án Mẫu (Từ Phụ Lục Excel)';
  
  const projectResult = await pool.query(
    `INSERT INTO projects (code, name, location, active_teams, total_tasks, created_at) 
     VALUES ($1, $2, 'N/A', 1, $3, NOW()) RETURNING id`,
    [projectCode, projectName, dataRows.length]
  );
  
  const projectId = projectResult.rows[0].id;
  console.log(`Đã tạo dự án thành công: ${projectName} (ID: ${projectId})`);

  let createdCount = 0;
  const sttToIdMap = new Map<string, string>();

  for (const row of dataRows) {
    const stt = row.__EMPTY ? String(row.__EMPTY).trim() : '';
    const name = row.__EMPTY_2 ? String(row.__EMPTY_2).trim() : '';
    const unit = row.__EMPTY_3 ? String(row.__EMPTY_3).trim() : '';
    const volume = row.__EMPTY_4 ? Number(row.__EMPTY_4) : 0;
    const price = row.__EMPTY_6 ? Number(row.__EMPTY_6) : 0;
    const total = row.__EMPTY_7 ? Number(row.__EMPTY_7) : 0;
    const isSectionHeader = !unit && !volume && total > 0;

    let parentId = null;
    if (stt.includes('.')) {
      const parts = stt.split('.');
      parts.pop();
      const parentStt = parts.join('.');
      parentId = sttToIdMap.get(parentStt) || null;
    }

    const taskCode = `TASK-${projectCode}-${stt || createdCount}`;
    const taskVolume = isNaN(volume) ? 0 : volume;
    const sourceRowStr = JSON.stringify({
      original_stt: stt,
      unit_price: isNaN(price) ? 0 : price,
      total_price: isNaN(total) ? 0 : total,
    });

    const taskResult = await pool.query(
      `INSERT INTO tasks (project_code, project_name, code, stt, name, unit, volume, is_section_header, parent_id, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING id`,
      [projectCode, projectName, taskCode, stt, name, unit, taskVolume, isSectionHeader, parentId, sourceRowStr]
    );

    const taskId = taskResult.rows[0].id;

    if (stt) {
      sttToIdMap.set(stt, taskId);
    }
    
    createdCount++;
    if (createdCount % 10 === 0) {
      console.log(`Đã import ${createdCount} hạng mục...`);
    }
  }

  console.log(`\n🎉 HOÀN TẤT! Đã import thành công ${createdCount} hạng mục vào Dự án: ${projectName}`);
}

main()
  .catch(e => {
    console.error('Lỗi khi import:', e);
  })
  .finally(async () => {
    await pool.end();
  });
