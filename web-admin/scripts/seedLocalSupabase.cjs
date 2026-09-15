const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const supabase = createClient(supabaseUrl, supabaseKey);

function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

function cleanUUID(id) {
  if (!id || typeof id !== 'string') return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return id;
  return crypto.createHash('md5').update(id).digest('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

async function seedData() {
  console.log('Bắt đầu nạp đầy đủ dữ liệu mẫu vào Local Supabase...');
  try {
    // 1. Projects & Engineers
    const projects = [
      { id: cleanUUID('proj-1'), code: 'NĂM CĂN', name: 'Dự án Năm Căn', location: 'Cà Mau', progressPercent: 65, status: 'active', managerName: 'Lê Minh Khang' },
      { id: cleanUUID('proj-2'), code: 'Bắc Ninh', name: 'Dự án Trạm 500kV Bắc Ninh', location: 'Bắc Ninh', progressPercent: 80, status: 'active', managerName: 'Trần Văn An' },
      { id: cleanUUID('proj-3'), code: 'PHƯỚC ĐÔNG 6', name: 'Dự án Trạm 110kV Phước Đông 6', location: 'Tây Ninh', progressPercent: 45, status: 'active', managerName: 'Lê Minh Khang' }
    ];
    console.log(`Nạp ${projects.length} dự án...`);
    await supabase.from('projects').upsert(projects.map(toSnakeCase), { onConflict: 'code' });

    const engineers = [
      { id: cleanUUID('eng-1'), username: 'admin', name: 'Quản trị viên', title: 'Admin', role: 'admin', projectCodes: ['NĂM CĂN', 'Bắc Ninh', 'PHƯỚC ĐÔNG 6'] },
      { id: cleanUUID('eng-2'), username: 'kst', name: 'Lê Minh Khang', title: 'Kỹ sư giám sát', role: 'engineer', projectCodes: ['NĂM CĂN', 'PHƯỚC ĐÔNG 6'] },
      { id: cleanUUID('eng-3'), username: 'nhanvien', name: 'Trần Văn An', title: 'Nhân viên', role: 'staff', projectCodes: ['Bắc Ninh'] }
    ];
    console.log(`Nạp ${engineers.length} kỹ sư/nhân viên...`);
    await supabase.from('engineers').upsert(engineers.map(toSnakeCase), { onConflict: 'username' });

    // 2. Inventory materials & transactions
    const mData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/services/inventorySeedData.json'), 'utf8'));
    if (mData.materials) {
      console.log(`Nạp ${mData.materials.length} vật tư kho...`);
      for (let i = 0; i < mData.materials.length; i += 100) {
        const chunk = mData.materials.slice(i, i + 100).map(m => {
          m.id = cleanUUID(m.id);
          return toSnakeCase(m);
        });
        await supabase.from('materials').upsert(chunk);
      }
    }

    if (mData.inventoryTransactions) {
      console.log(`Nạp ${mData.inventoryTransactions.length} giao dịch kho...`);
      for (let i = 0; i < mData.inventoryTransactions.length; i += 100) {
        const chunk = mData.inventoryTransactions.slice(i, i + 100).map(t => {
          t.id = cleanUUID(t.id);
          t.materialId = cleanUUID(t.materialId);
          return toSnakeCase(t);
        });
        await supabase.from('inventory_transactions').upsert(chunk);
      }
    }

    // 3. Project management items
    const pmData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/services/projectManagementSeedData.json'), 'utf8'));
    
    if (pmData.materialPlans) {
      console.log(`Nạp ${pmData.materialPlans.length} kế hoạch vật tư...`);
      for (let i = 0; i < pmData.materialPlans.length; i += 100) {
        const chunk = pmData.materialPlans.slice(i, i + 100).map(item => {
          item.id = cleanUUID(item.id);
          item.parentId = cleanUUID(item.parentId);
          return toSnakeCase(item);
        });
        await supabase.from('material_plans').upsert(chunk);
      }
    }

    if (pmData.purchasingPlans) {
      console.log(`Nạp ${pmData.purchasingPlans.length} kế hoạch mua sắm...`);
      for (let i = 0; i < pmData.purchasingPlans.length; i += 100) {
        const chunk = pmData.purchasingPlans.slice(i, i + 100).map(item => {
          item.id = cleanUUID(item.id);
          item.parentId = cleanUUID(item.parentId);
          item.materialPlanId = cleanUUID(item.materialPlanId);
          return toSnakeCase(item);
        });
        await supabase.from('purchasing_plans').upsert(chunk);
      }
    }

    if (pmData.expenses) {
      console.log(`Nạp ${pmData.expenses.length} chi phí...`);
      for (let i = 0; i < pmData.expenses.length; i += 100) {
        const chunk = pmData.expenses.slice(i, i + 100).map(item => {
          item.id = cleanUUID(item.id);
          return toSnakeCase(item);
        });
        await supabase.from('expenses').upsert(chunk);
      }
    }

    if (pmData.laborPayrolls) {
      console.log(`Nạp ${pmData.laborPayrolls.length} nhân công...`);
      for (let i = 0; i < pmData.laborPayrolls.length; i += 100) {
        const chunk = pmData.laborPayrolls.slice(i, i + 100).map(item => {
          item.id = cleanUUID(item.id);
          return toSnakeCase(item);
        });
        await supabase.from('labor_payrolls').upsert(chunk);
      }
    }

    if (pmData.documentTracks) {
      console.log(`Nạp ${pmData.documentTracks.length} hồ sơ chứng từ...`);
      for (let i = 0; i < pmData.documentTracks.length; i += 100) {
        const chunk = pmData.documentTracks.slice(i, i + 100).map(item => {
          item.id = cleanUUID(item.id);
          return toSnakeCase(item);
        });
        await supabase.from('document_tracks').upsert(chunk);
      }
    }

    console.log('🎉 ĐÃ NẠP TOÀN BỘ DỮ LIỆU VÀO LOCAL SUPABASE THÀNH CÔNG!');
  } catch (err) {
    console.error('Lỗi khi nạp dữ liệu:', err);
  }
}

seedData();
