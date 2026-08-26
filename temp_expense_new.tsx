
        {/* EXPENSE TAB */}
        {activeTab === 'EXPENSE' && (
          <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-100 p-4 flex flex-col gap-6" id="expense-unified-view">
            
            {/* 1. TỔNG HỢP QUỸ */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
              <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20">
                <h2 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                  <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
                  Tổng hợp quỹ
                </h2>
              </div>
              <div className="p-5">
                <CostPlanSummaryTable 
                  expenses={currentProjExpenses} 
                  labors={currentProjLabor} 
                  onAllocateFund={(name, amount) => {
                    if (name === 'KHÁC') return;
                    
                    let targetName = name;
                    let currentTotalFund = 0;
                    let personExpenses: any[] = [];
                    let title = '';
                    
                    if (name === '__PROJECT__') {
                      personExpenses = currentProjExpenses.filter(e => e.spenderName === 'DỰ ÁN' && e.content === 'Quỹ Công Trình');
                      currentTotalFund = currentProjExpenses.reduce((acc, curr) => acc + (curr.incomeAmount || 0), 0);
                      title = 'Quỹ Tổng Công Trình';
                      targetName = 'DỰ ÁN';
                    } else {
                      if (!targetName) {
                        const inputName = window.prompt('Nhập tên người muốn cấp quỹ:');
                        if (!inputName || !inputName.trim()) return;
                        targetName = inputName.trim();
                      }
                      personExpenses = currentProjExpenses.filter(e => e.spenderName === targetName);
                      currentTotalFund = personExpenses.reduce((acc, curr) => acc + (curr.incomeAmount || 0), 0);
                      title = `Tổng Quỹ cho [${targetName.toUpperCase()}]`;
                    }
                    
                    let newTotal = 0;
                    
                    if (amount !== undefined) {
                      newTotal = amount;
                    } else {
                      const input = window.prompt(`Cập nhật ${title}:\n(Nhập số tiền, hiện tại là: ${currentTotalFund.toLocaleString('vi-VN')})`, currentTotalFund.toString());
                      if (input === null) return;
                      
                      newTotal = parseInt(input.replace(/[,.]/g, ''), 10);
                      if (isNaN(newTotal)) {
                        triggerToast('Số tiền không hợp lệ', 'warning');
                        return;
                      }
                    }
                    
                    const diff = newTotal - currentTotalFund;
                    if (diff === 0) return;
                    
                    const adjustmentContent = name === '__PROJECT__' ? 'Quỹ Công Trình' : 'Cấp quỹ';
                    const adjustmentRecord = personExpenses.find(e => e.content === adjustmentContent && (e.totalAmount || 0) === 0);
                    
                    if (adjustmentRecord) {
                      updateExpense(adjustmentRecord.id, {
                        ...adjustmentRecord,
                        incomeAmount: (adjustmentRecord.incomeAmount || 0) + diff,
                        balanceFund: (adjustmentRecord.balanceFund || 0) + diff
                      });
                    } else {
                      addExpense({
                        projectCode: selectedProject,
                        spenderName: targetName,
                        content: adjustmentContent,
                        description: name === '__PROJECT__' ? 'Khởi tạo Quỹ Công Trình' : `Cấp quỹ cho ${targetName}`,
                        date: new Date().toISOString().split('T')[0],
                        quantity: 0,
                        unitPrice: 0,
                        taxAmount: 0,
                        totalAmount: 0,
                        incomeAmount: diff,
                        balanceFund: diff
                      } as any);
                    }
                    triggerToast(`Đã cập nhật ${title.toLowerCase()}`, 'success');
                  }}
                />
              
              </div>
            </div>

            {/* 2. CHI TIẾT PHIẾU CHI */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 flex flex-col">
              <div className="flex border-b border-slate-100 bg-slate-50 px-5 py-3 gap-3 sticky top-0 z-20 items-center justify-between text-xs text-slate-600 flex-wrap"><h2 className="text-[14px] font-extrabold text-slate-800 flex items-center gap-2 uppercase tracking-wide whitespace-nowrap"><span className="material-symbols-outlined text-primary text-[18px]">receipt_long</span> CHI TIẾT PHIẾU CHI </h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 font-bold text-slate-500 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[16px]">filter_list</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium whitespace-nowrap">Ngày chi:</span>
                      <CustomSelect
                        value={expenseFilterDate}
                        onChange={e => setExpenseFilterDate(e.target.value)}
                        className="min-w-[70px] max-w-[120px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                      >
                        {expenseDateOptions.map(opt => (
                          <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                        ))}
                      </CustomSelect>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium whitespace-nowrap">Nội dung:</span>
                      <CustomSelect
                        value={expenseFilterContent}
                        onChange={e => setExpenseFilterContent(e.target.value)}
                        className="min-w-[120px] max-w-[250px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                      >
                        {expenseContentOptions.map(opt => {
                          let label = opt;
                          if (label && label.length > 30) label = label.slice(0, 30) + '...';
                          return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                        })}
                      </CustomSelect>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium whitespace-nowrap">ĐVT:</span>
                      <CustomSelect
                        value={expenseFilterUnit}
                        onChange={e => setExpenseFilterUnit(e.target.value)}
                        className="min-w-[60px] max-w-[90px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                      >
                        {expenseUnitOptions.map(opt => (
                          <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                        ))}
                      </CustomSelect>
                    </div>
                  </div>
                 
                    <button 
                      onClick={() => setIsNewExpenseOpen(true)}
                      className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors shadow-sm ml-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Thêm phiếu chi
                    </button>
 </div> <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 w-12 text-center">STT</th>
                      <th className="p-3">Ngày chi</th>
                      <th className="p-3">Người phụ trách</th>
                      <th className="p-3 min-w-56">Nội dung / Diễn giải</th>
                    <th className="p-3 w-16 text-left">ĐVT</th>
                    <th className="p-3 text-right">Số lượng</th>
                    <th className="p-3 text-right">Đơn giá (đ)</th>
                    <th className="p-3 text-right">VAT</th>
                    <th className="p-3 text-right">Thành tiền (đ)</th>
                    <th className="p-3 text-right">Thực thu (đ)</th>
                    <th className="p-3 text-right">Tồn quỹ (đ)</th>
                    <th className="p-3">Ghi chú</th>
                    <th className="p-3 text-center">Hóa đơn</th>
                    <th className="p-3 text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredProjExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingExpense(exp)}>
                    <td className="p-3 text-center font-bold text-slate-400">{exp.stt || '-'}</td>
                    <td className="p-3 font-semibold text-slate-900">{exp.date}</td>
                    <td className="p-3">{exp.spenderName || '-'}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{exp.content}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{exp.description}</div>
                    </td>
                    <td className="p-3 text-left">{exp.unit}</td>
                    <td className="p-3 text-right">{exp.quantity}</td>
                    <td className="p-3 text-right">{exp.unitPrice.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-slate-500">{(exp.taxAmount || 0).toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right font-bold text-rose-600">-{exp.totalAmount.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-emerald-600 font-bold">{(exp.incomeAmount || 0) > 0 ? `+${exp.incomeAmount?.toLocaleString('vi-VN')}` : '-'}</td>
                    <td className="p-3 text-right font-bold text-primary">{(exp.balanceFund || 0) > 0 ? exp.balanceFund?.toLocaleString('vi-VN') : '-'}</td>
                    <td className="p-3 text-slate-500 italic">{exp.notes || '-'}</td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {exp.invoiceUrl ? (
                        <button onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPreviewImage(exp.invoiceUrl!);
                        }} className="inline-flex items-center gap-2 text-xs text-primary font-bold hover:underline">
                          <span className="material-symbols-outlined text-sm">image</span>
                          Xem ảnh
                        </button>
                      ) : (
                        <span className="text-slate-300">Không có</span>
                      )}
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setDeleteConfirm({ isOpen: true, id: exp.id, type: 'expense', title: 'Xóa phiếu chi', itemName: `phiếu chi "${exp.content}"` });
                        }} 
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProjExpenses.length === 0 && (
                  <tr><td colSpan={14} className="p-8 text-center text-slate-400">Chưa có giao dịch chi phí công trình nào.</td></tr>
                )}
              </tbody>
            </table>
            </div>
          
            </div>

            {/* 3. LƯƠNG CÔNG NHẬT */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 flex flex-col mb-10">
              <div className="flex border-b border-slate-100 bg-slate-50 px-5 py-3 gap-3 sticky top-0 z-20 items-center justify-between text-xs text-slate-600 flex-wrap"><h2 className="text-[14px] font-extrabold text-slate-800 flex items-center gap-2 uppercase tracking-wide whitespace-nowrap"><span className="material-symbols-outlined text-primary text-[18px]">engineering</span> LƯƠNG CÔNG NHẬT </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 font-bold text-slate-500 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[16px]">filter_list</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium whitespace-nowrap">Ngày làm:</span>
                  <CustomSelect
                    value={laborFilterDate}
                    onChange={e => setLaborFilterDate(e.target.value)}
                    className="min-w-[70px] max-w-[120px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                  >
                    {laborDateOptions.map(opt => (
                      <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                    ))}
                  </CustomSelect>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium whitespace-nowrap">Nội dung:</span>
                  <CustomSelect
                    value={laborFilterContent}
                    onChange={e => setLaborFilterContent(e.target.value)}
                    className="min-w-[120px] max-w-[250px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                  >
                    {laborContentOptions.map(opt => {
                      let label = opt;
                      if (label && label.length > 30) label = label.slice(0, 30) + '...';
                      return <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : label}</option>;
                    })}
                  </CustomSelect>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium whitespace-nowrap">ĐVT:</span>
                  <CustomSelect
                    value={laborFilterUnit}
                    onChange={e => setLaborFilterUnit(e.target.value)}
                    className="min-w-[60px] max-w-[90px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
                  >
                    {laborUnitOptions.map(opt => (
                      <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả' : opt}</option>
                    ))}
                  </CustomSelect>
                </div>
              </div>
             
                    <button 
                      onClick={() => setIsNewLaborOpen(true)}
                      className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors shadow-sm ml-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Thêm chấm công
                    </button>
 </div> <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Ngày làm</th>
                  <th className="p-3">Họ tên</th>
                  <th className="p-3 min-w-56">Nội dung lương công nhật</th>
                  <th className="p-3 w-16 text-left">ĐVT</th>
                  <th className="p-3 text-right">Số lượng</th>
                  <th className="p-3 text-right">Đơn giá (đ)</th>
                  <th className="p-3 text-right">Thành tiền (đ)</th>
                  <th className="p-3">Tài khoản & Người nhận</th>
                  <th className="p-3 text-center">CCCD</th>
                  <th className="p-3 text-center">Tình trạng</th>
                  <th className="p-3 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredProjLabor.map((lab) => (
                  <tr key={lab.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingLabor({...lab, date: lab.date || new Date().toISOString().split('T')[0]})}>
                    <td className="p-3 text-center font-bold text-slate-400">{lab.stt || '-'}</td>
                    <td className="p-3 font-semibold text-slate-900">{lab.date}</td>
                    <td className="p-3 font-bold text-slate-900">{lab.workerName || '-'}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{lab.content}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{lab.description}</div>
                    </td>
                    <td className="p-3 text-left">{lab.unit}</td>
                    <td className="p-3 text-right">{lab.quantity}</td>
                    <td className="p-3 text-right">{lab.unitPrice.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right font-bold text-primary">{lab.totalAmount.toLocaleString('vi-VN')} đ</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{lab.bankInfo}</div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">{lab.bankAccount}</div>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        {lab.idCardFrontUrl ? (
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardFrontUrl!); }} className="text-[10px] text-primary hover:underline font-bold">Mặt trước</button>
                        ) : null}
                        {lab.idCardBackUrl ? (
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardBackUrl!); }} className="text-[10px] text-primary hover:underline font-bold">Mặt sau</button>
                        ) : null}
                        {!lab.idCardFrontUrl && !lab.idCardBackUrl && <span className="text-slate-300">Không có</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        lab.paymentStatus === 'Đã thanh toán' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {lab.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setDeleteConfirm({ isOpen: true, id: lab.id, type: 'labor', title: 'Xóa lương công nhật', itemName: `lương của "${lab.workerName || lab.description}"` });
                        }} 
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProjLabor.length === 0 && (
                  <tr><td colSpan={12} className="p-8 text-center text-slate-400">Không có thông tin lương công nhật nào.</td></tr>
                )}
              </tbody>
            </table>
            </div>
          
            </div>

          </div>
        )}
