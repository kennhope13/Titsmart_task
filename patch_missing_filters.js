const fs = require('fs');
const filePath = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let f = fs.readFileSync(filePath, 'utf8');

// 1. Add states
const statesTarget = `  const [filterDocs, setFilterDocs] = useState('all');`;
const statesReplacement = `  const [filterDocs, setFilterDocs] = useState('all');
  const [filterExpectedDate, setFilterExpectedDate] = useState('all');
  const [filterContractStatus, setFilterContractStatus] = useState('all');
  const [filterPaymentDate, setFilterPaymentDate] = useState('all');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState('all');`;
f = f.replace(statesTarget, statesReplacement);

// 2. Add options
const optionsTarget = `  const docsOptions = [`;
const optionsReplacement = `  const expectedDateOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.expectedDate).filter(Boolean)))], [data]);
  const contractStatusOptions = useMemo(() => ['all', ...Array.from(new Set(purchasingData.map(p => p.contractStatus).filter(Boolean)))], [purchasingData]);
  const paymentDateOptions = useMemo(() => ['all', ...Array.from(new Set(purchasingData.map(p => p.paymentDate).filter(Boolean)))], [purchasingData]);
  const invoiceStatusOptions = useMemo(() => ['all', ...Array.from(new Set(purchasingData.map(p => p.invoiceStatus).filter(Boolean)))], [purchasingData]);
  const docsOptions = [`;
f = f.replace(optionsTarget, optionsReplacement);

// 3. Add to filteredData logic
const filterLogicTarget = `    if (filterDocs && filterDocs !== 'all') {`;
const filterLogicReplacement = `    if (filterProgress && filterProgress !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         return p.progressStatus === filterProgress;
      });
    }
    if (filterExpectedDate && filterExpectedDate !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         return p.expectedDate === filterExpectedDate;
      });
    }
    if (filterContractStatus && filterContractStatus !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         const purch = findPurchasingMatch(p);
         return purch?.contractStatus === filterContractStatus;
      });
    }
    if (filterPaymentDate && filterPaymentDate !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         const purch = findPurchasingMatch(p);
         return purch?.paymentDate === filterPaymentDate;
      });
    }
    if (filterInvoiceStatus && filterInvoiceStatus !== 'all') {
      filtered = filtered.filter(p => {
         const notes = String(p.notes || '').toLowerCase();
         if (notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(p.stt || '').trim())) return true;
         const purch = findPurchasingMatch(p);
         return purch?.invoiceStatus === filterInvoiceStatus;
      });
    }
    if (filterDocs && filterDocs !== 'all') {`;
f = f.replace(filterLogicTarget, filterLogicReplacement);

// 4. Add UI dropdowns
const uiTarget = `            {subTab === 'DOCS' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Chứng từ:</span>
                <CustomSelect`;
const uiReplacement = `            {subTab === 'TECH' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Tình trạng:</span>
                <CustomSelect
                  value={filterProgress}
                  onChange={e => setFilterProgress(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {progressOptions.map(opt => {
                    let label = opt;
                    if (label && label.length > 20) label = label.slice(0, 20) + '...';
                    return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                  })}
                </CustomSelect>
              </div>
            )}
            
            {subTab === 'TECH' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Ngày có hàng:</span>
                <CustomSelect
                  value={filterExpectedDate}
                  onChange={e => setFilterExpectedDate(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {expectedDateOptions.map(opt => {
                    let label = opt;
                    if (label && label.length > 20) label = label.slice(0, 20) + '...';
                    return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                  })}
                </CustomSelect>
              </div>
            )}

            {subTab === 'FINANCE' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Tình trạng HĐ:</span>
                <CustomSelect
                  value={filterContractStatus}
                  onChange={e => setFilterContractStatus(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {contractStatusOptions.map(opt => {
                    let label = opt;
                    if (label && label.length > 20) label = label.slice(0, 20) + '...';
                    return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                  })}
                </CustomSelect>
              </div>
            )}

            {subTab === 'FINANCE' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Hạn TT:</span>
                <CustomSelect
                  value={filterPaymentDate}
                  onChange={e => setFilterPaymentDate(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {paymentDateOptions.map(opt => {
                    let label = opt;
                    if (label && label.length > 20) label = label.slice(0, 20) + '...';
                    return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                  })}
                </CustomSelect>
              </div>
            )}

            {subTab === 'FINANCE' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Hóa đơn VAT:</span>
                <CustomSelect
                  value={filterInvoiceStatus}
                  onChange={e => setFilterInvoiceStatus(e.target.value)}
                  className="min-w-[70px] max-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                >
                  {invoiceStatusOptions.map(opt => {
                    let label = opt;
                    if (label && label.length > 20) label = label.slice(0, 20) + '...';
                    return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                  })}
                </CustomSelect>
              </div>
            )}

            {subTab === 'DOCS' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Chứng từ:</span>
                <CustomSelect`;
f = f.replace(uiTarget, uiReplacement);

fs.writeFileSync(filePath, f);
console.log("Done");
