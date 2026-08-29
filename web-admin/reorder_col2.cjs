const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

// 1. Reorder headers using regex
pageCode = pageCode.replace(
  /<th className="px-2 py-2\.5 min-w-\[80px\]">Ghi chú<\/th>\s*<th className="px-2 py-2\.5 w-\[70px\]">Tình trạng<\/th>\s*<th className="px-2 py-2\.5 text-center w-\[50px\]">H\.Đơn<\/th>\s*<th className="px-2 py-2\.5 text-center w-\[50px\]">CCCD<\/th>\s*<th className="px-2 py-2\.5 text-center w-14">Xóa<\/th>/g,
  `<th className="px-2 py-2.5 w-[70px]">Tình trạng</th>
                    <th className="px-2 py-2.5 text-center w-[50px]">H.Đơn</th>
                    <th className="px-2 py-2.5 text-center w-[50px]">CCCD</th>
                    <th className="px-2 py-2.5 min-w-[80px]">Ghi chú</th>
                    <th className="px-2 py-2.5 text-center w-14">Xóa</th>`
);

// 2. Reorder body cells using regex
pageCode = pageCode.replace(
  /<td className="px-2 py-2\.5 text-\[10px\] max-w-\[100px\] truncate" title=\{exp\.notes\}>\{exp\.notes \|\| '-'}<\/td>\s*<td className="px-2 py-2\.5 text-slate-400">-<\/td>\s*<td className="px-2 py-2\.5 text-center">-<\/td>\s*<td className="px-2 py-2\.5 text-center">-<\/td>\s*<td className="px-2 py-2\.5 text-center text-slate-300">/g,
  `<td className="px-2 py-2.5 text-slate-400">-</td>
                              <td className="px-2 py-2.5 text-center">-</td>
                              <td className="px-2 py-2.5 text-center">-</td>
                              <td className="px-2 py-2.5 text-[10px] max-w-[100px] truncate" title={exp.notes}>{exp.notes || '-'}</td>
                              <td className="px-2 py-2.5 text-center text-slate-300">`
);

fs.writeFileSync(pageFile, pageCode);
console.log('Reordered Ghi chu again');
