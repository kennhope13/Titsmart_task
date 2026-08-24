const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// The headers
const headersToWrap = [
  '<th rowSpan={2} style={{ width: 65, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">ĐVT</th>',
  '<th rowSpan={2} style={{ width: 50, borderRight: \'1px solid #94a3b8\', borderBottom: \'1px solid #94a3b8\' }} className="bg-slate-50 bg-clip-padding px-1.5 py-1.5 text-center leading-tight">KL HĐ</th>',
  '<th rowSpan={2} style={{ width: 100, borderRight: "1px solid #94a3b8", borderBottom: "1px solid #94a3b8" }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">MÃ HIỆU</th>',
  '<th rowSpan={2} style={{ width: 100, borderRight: "1px solid #94a3b8", borderBottom: "1px solid #94a3b8" }} className="bg-slate-50 bg-clip-padding px-1 py-1.5 text-center leading-tight">XUẤT XỨ</th>'
];

let newHeaders = `{subTab !== 'DOCS' && (
                <>
                  ${headersToWrap.join('\n                  ')}
                </>
              )}`;

content = content.replace(headersToWrap.join('\n              '), newHeaders);


// The tbody cells for these 4 columns start at " {/* ĐVT */}" and end before " {/* DYNAMIC RIGHT COLUMNS BASED ON SUBTAB */}"
const tbodyRegex = /([ \t]*\{\/\* ĐVT \*\/}[\s\S]*?)(?:[ \t]*\{\/\* DYNAMIC RIGHT COLUMNS BASED ON SUBTAB \*\/})/;

const match = content.match(tbodyRegex);
if (match) {
  const originalTbodyCells = match[1];
  // Replace the exact chunk, wrapping it in {subTab !== 'DOCS' && ( <> ... </> )}
  const replacement = `                          {subTab !== 'DOCS' && (\n                            <>\n${originalTbodyCells.replace(/^/gm, '  ').replace(/  $/, '')}                            </>\n                          )}\n\n                          {/* DYNAMIC RIGHT COLUMNS BASED ON SUBTAB */}`;
  content = content.replace(tbodyRegex, replacement);
  console.log("Replaced tbody cells successfully.");
} else {
  console.log("Could not find tbody cells to replace.");
}

// What about the colSpan in parent row rendering?
// <td colSpan={colSpanCount + 5} className="bg-blue-50/90...
// We need to decrease colSpan if subTab === 'DOCS'.
// But wait, there is `colSpanCount` which is probably calculated based on `subTab`.
// Let's look for colSpanCount definition.
// Wait, I will just write a script to check `colSpanCount` first.

fs.writeFileSync(path, content, 'utf8');
console.log('Patched MaterialAndPurchasingTab headers and cells');
