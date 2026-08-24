const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Change colSpan={3} to rowSpan={2} and width to 140 for CHỨNG TỪ HÀNG HÓA
content = content.replace(
  '<th colSpan={3} style={{ width: 160, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>',
  '<th rowSpan={2} style={{ width: 140, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">CHỨNG TỪ HÀNG HÓA</th>'
);

// 2. Remove CO, CQ, PCCC from 2nd row
content = content.replace(
  '                  <th style={{ width: 50, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight whitespace-nowrap">CO</th>\n',
  ''
);
content = content.replace(
  '                  <th style={{ width: 50, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight whitespace-nowrap">CQ</th>\n',
  ''
);
content = content.replace(
  '                  <th style={{ width: 60, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1 text-center leading-tight whitespace-nowrap">PCCC</th>\n',
  ''
);

// 3. Update tbody DOCS subTab to have a single column instead of 3
const tbodyRegex = /\{subTab === 'DOCS' && \(\s*<>\s*\{\/\* CO \*\/\}\s*<td className="p-0 align-middle text-center border-r border-slate-200">[\s\S]*?\{\/\* ĐÃ GỬI TỚI CT \*\/\}/g;

const newTbody = `{subTab === 'DOCS' && (
                            <>
                              {/* CHỨNG TỪ HÀNG HÓA (Combined CO, CQ, PCCC) */}
                              <td className="w-[140px] p-0 align-middle text-center border-r border-slate-200">
                                <div className="p-1">
                                  <CustomSelect
                                    value={[plan.docCo ? 'CO' : '', plan.docCq ? 'CQ' : '', plan.docFireInspection ? 'PCCC' : ''].filter(Boolean).join(', ')}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      onUpdateMaterial(plan.id, { 
                                        ...plan, 
                                        docCo: val.includes('CO'), 
                                        docCq: val.includes('CQ'), 
                                        docFireInspection: val.includes('PCCC') 
                                      });
                                    }}
                                    className="w-full font-bold focus:outline-primary text-[11px] px-1.5 py-1 box-border outline-none shadow-sm rounded-md transition-colors border-slate-200 bg-slate-50 text-slate-700"
                                    disabled={userRole === 'engineer'}
                                  >
                                    <option value="">Chưa có</option>
                                    <option value="CO">CO</option>
                                    <option value="CQ">CQ</option>
                                    <option value="PCCC">PCCC</option>
                                    <option value="CO, CQ">CO, CQ</option>
                                    <option value="CO, PCCC">CO, PCCC</option>
                                    <option value="CQ, PCCC">CQ, PCCC</option>
                                    <option value="CO, CQ, PCCC">CO, CQ, PCCC</option>
                                  </CustomSelect>
                                </div>
                              </td>
                              {/* ĐÃ GỬI TỚI CT */}`;

content = content.replace(tbodyRegex, newTbody);

// 4. Update colSpanCount for DOCS
content = content.replace(
  '      case \'DOCS\':\n        return 5; // CO, CQ, PCCC, GỬI CT, NGÀY',
  '      case \'DOCS\':\n        return 3; // CHỨNG TỪ, GỬI CT, NGÀY'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated columns');
