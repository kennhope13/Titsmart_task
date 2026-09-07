const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

const toSnakeCase = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key.startsWith('_') || key === 'subTasks' || key === 'children' || key === 'computedStt' || key === 'isSec' || key === 'depth' || key === 'projectId') continue;
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
      }
    }
    return result;
};

async function run() {
  const data = {
    name: 'Phạm Ánh Tuyết',
    projectCodes: ['TRAM_BIEN_AP_500KV_BAC_NINH', 'GIAM_SAT_CONG_TRINH_CC1', 'TRAM_BIEN_AP_220KV_LUC_YEN']
  };
  const payload = toSnakeCase(data);
  console.log('Payload:', payload);
  const { data: result, error } = await supabase.from('engineers').update(payload).eq('username', 'tuyet').select().single();
  if (error) console.error('Error:', error);
  else console.log('Result:', result.project_codes);
}
run();
