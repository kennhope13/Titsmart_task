const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// 1. Remove "LUÂN CHUYỂN VẬT TƯ"
f = f.replace(/<th colSpan=\{2\}[^>]*>LUÂN CHUYỂN VẬT TƯ<\/th>/g, "");

// 2. Remove "GỬI CT" and "NGÀY" headers
f = f.replace(/<th[^>]*>GỬI CT<\/th>\s*<th[^>]*>NGÀY<\/th>/g, "");

// 3. Remove body cells. We'll find `{/* ĐÃ GỬI TỚI CT */}` and remove up to `{/* NGÀY */}`'s closing `</td>`.
f = f.replace(/\{\/\* ĐÃ GỬI TỚI CT \*\/\}.*?\{\/\* NGÀY \*\/\}.*?<\/td>/s, "");

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
