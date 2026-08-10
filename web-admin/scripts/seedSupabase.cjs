const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const supabaseUrl = 'https://nvdonaaxbtqjfmxtlgzb.supabase.co';
const supabaseKey = 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg';
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
  // If it's already a UUID, return it
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return id;
  // Otherwise generate a deterministic UUID based on the string
  return crypto.createHash('md5').update(id).digest('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

async function seedData() {
  console.log('Bắt đầu đồng bộ dữ liệu mẫu lên Supabase...');

  try {
    // 1. Projects
    const pData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/services/projectManagementSeedData.json'), 'utf8'));
    if (pData.projects) {
      console.log(`Đang đồng bộ ${pData.projects.length} dự án...`);
      for (const p of pData.projects) {
        p.id = cleanUUID(p.id);
        await supabase.from('projects').upsert(toSnakeCase(p), { onConflict: 'code' });
      }
    }
    if (pData.tasks) {
      console.log(`Đang đồng bộ ${pData.tasks.length} công việc...`);
      const chunks = [];
      const chunkSize = 100;
      for (let i = 0; i < pData.tasks.length; i += chunkSize) {
        const chunk = pData.tasks.slice(i, i + chunkSize).map(t => {
            t.id = cleanUUID(t.id);
            t.parentId = cleanUUID(t.parentId);
            return toSnakeCase(t);
        });
        await supabase.from('tasks').upsert(chunk);
      }
    }

    // 2. Materials
    const mData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/services/inventorySeedData.json'), 'utf8'));
    if (mData.materials) {
      console.log(`Đang đồng bộ ${mData.materials.length} vật tư...`);
      const chunks = [];
      for (let i = 0; i < mData.materials.length; i += 100) {
        const chunk = mData.materials.slice(i, i + 100).map(m => {
            m.id = cleanUUID(m.id);
            return toSnakeCase(m);
        });
        await supabase.from('materials').upsert(chunk);
      }
    }

    console.log('ĐỒNG BỘ THÀNH CÔNG! Dữ liệu đã lên Cloud.');
  } catch (err) {
    console.error('Lỗi khi đồng bộ:', err);
  }
}

seedData();
