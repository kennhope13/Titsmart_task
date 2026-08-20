const fs = require('fs');
const path = 'web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix filter labels with proper Vietnamese diacritics and separate label from dropdown
const replacements = [
  // 1. Đầu mục cha
  [
    `            <CustomSelect
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="h-8 w-44 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Dau muc cha: Tat ca</option>
              {columnSections.map((value) => (
                <option key={value} value={value}>{truncateText(value, 42)}</option>
              ))}
            </CustomSelect>`,
    `            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Đầu mục cha:</span>
              <CustomSelect
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="h-8 min-w-[100px] max-w-[160px] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Tất cả</option>
                {columnSections.map((value) => (
                  <option key={value} value={value}>{truncateText(value, 30)}</option>
                ))}
              </CustomSelect>
            </div>`
  ],
  // 2. ĐVT
  [
    `            <CustomSelect
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="h-8 w-32 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">ĐVT: Tất cả</option>
              {columnUnits.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </CustomSelect>`,
    `            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">ĐVT:</span>
              <CustomSelect
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="h-8 min-w-[60px] max-w-[100px] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Tất cả</option>
                {columnUnits.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </CustomSelect>
            </div>`
  ],
  // 3. Tiến độ
  [
    `            <CustomSelect
              value={filterProgress}
              onChange={(e) => setFilterProgress(e.target.value)}
              className="h-8 w-32 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tien do: Tat ca</option>`,
    `            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Tiến độ:</span>
              <CustomSelect
                value={filterProgress}
                onChange={(e) => setFilterProgress(e.target.value)}
                className="h-8 min-w-[80px] max-w-[130px] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Tất cả</option>`
  ],
  // Close Tiến độ CustomSelect with </div>
  [
    `              <option value="100">100%</option>
            </CustomSelect>

            <CustomSelect
              value={filterPurchase}`,
    `              <option value="100">100%</option>
              </CustomSelect>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Mua hàng:</span>
              <CustomSelect
                value={filterPurchase}`
  ],
  // 4. Mua hàng
  [
    `              <option value="all">Mua hang: Tat ca</option>`,
    `              <option value="all">Tất cả</option>`
  ],
  // Close Mua hàng + open Thi công
  [
    `            </CustomSelect>

            <CustomSelect
              value={filterConstr}
              onChange={(e) => setFilterConstr(e.target.value)}
              className="h-8 w-32 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Thi cong: Tat ca</option>
              {columnConstrStatuses.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </CustomSelect>
          </div>`,
    `              </CustomSelect>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Thi công:</span>
              <CustomSelect
                value={filterConstr}
                onChange={(e) => setFilterConstr(e.target.value)}
                className="h-8 min-w-[80px] max-w-[130px] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition-colors hover:border-blue-200 hover:bg-slate-50 focus:border-primary focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Tất cả</option>
                {columnConstrStatuses.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </CustomSelect>
            </div>
          </div>`
  ]
];

for (const [from, to] of replacements) {
  if (content.includes(from)) {
    content = content.replace(from, to);
    console.log('Replaced:', from.substring(0, 50) + '...');
  } else {
    console.log('NOT FOUND:', from.substring(0, 50) + '...');
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done patching TaskManagementPage.tsx');
