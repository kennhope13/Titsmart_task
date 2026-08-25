import React, { useMemo } from 'react';
import { useRealtimeStore } from '../../services/realtimeStore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface OverviewTabProps {
  selectedProject: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ selectedProject }) => {
  const { materialPlans, purchasingPlans, expenses, laborPayrolls } = useRealtimeStore();

  const metrics = useMemo(() => {
    // 1. Kế hoạch vật tư
    const projMaterials = materialPlans.filter(p => p.projectCode === selectedProject && p.contractVolume > 0);
    const totalMaterials = projMaterials.length;
    const completedMaterials = projMaterials.filter(p => p.progressStatus === 'Đã hoàn thành').length;
    
    // 2. Mua hàng (Purchasing)
    const projPurchasing = purchasingPlans.filter(p => p.projectCode === selectedProject);
    const totalContractValue = projPurchasing.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPaidPurchasing = projPurchasing.reduce((sum, p) => sum + (p.prepayAmount || 0), 0);
    const totalRemainingPurchasing = projPurchasing.reduce((sum, p) => sum + (p.remainingAmount || 0), 0);

    // 3. Chi phí công trình
    const projExpenses = expenses.filter(p => p.projectCode === selectedProject);
    const totalExpense = projExpenses.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    // 4. Lương công nhật
    const projLabor = laborPayrolls.filter(p => p.projectCode === selectedProject);
    const totalLabor = projLabor.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    // 5. Chứng từ (Missing docs in materials)
    const missingCo = projMaterials.filter(p => !p.docCo).length;
    const missingCq = projMaterials.filter(p => !p.docCq).length;
    const missingFire = projMaterials.filter(p => !p.docFireInspection).length;

    // 6. Tổng chi phí thực tế (Chi phí + Mua hàng đã thanh toán + Lương)
    const totalActualCost = totalPaidPurchasing + totalExpense + totalLabor;

    return {
      materials: { total: totalMaterials, completed: completedMaterials },
      purchasing: { totalValue: totalContractValue, paid: totalPaidPurchasing, remaining: totalRemainingPurchasing },
      expense: { total: totalExpense },
      labor: { total: totalLabor },
      docs: { missingCo, missingCq, missingFire },
      totalActualCost
    };
  }, [materialPlans, purchasingPlans, expenses, laborPayrolls, selectedProject]);

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(value));
  };

  const costBreakdownData = [
    { name: 'Mua sắm (đã thanh toán)', value: metrics.purchasing.paid, color: '#3b82f6' },
    { name: 'Chi phí công trình', value: metrics.expense.total, color: '#10b981' },
    { name: 'Lương công nhật', value: metrics.labor.total, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  if (!selectedProject) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Vui lòng chọn dự án để xem tổng quan
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50 p-6 custom-scrollbar">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800">TỔNG QUAN TÀI CHÍNH & VẬN HÀNH</h2>
        <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 border border-indigo-100">
          Dự án: {selectedProject}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Card Tổng chi phí thực tế */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500">Tổng chi phí thực tế</h3>
          </div>
          <div className="text-lg font-black text-slate-900">{formatMoney(metrics.totalActualCost)} đ</div>
        </div>

        {/* Card Giá trị HĐ Mua sắm */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <span className="material-symbols-outlined">shopping_cart</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500">Tổng giá trị HĐ mua sắm</h3>
          </div>
          <div className="text-lg font-black text-slate-900">{formatMoney(metrics.purchasing.totalValue)} đ</div>
          <div className="mt-2 text-xs font-semibold text-slate-500">
            Còn lại: <span className="text-rose-600">{formatMoney(metrics.purchasing.remaining)} đ</span>
          </div>
        </div>

        {/* Card Lương & Chi phí khác */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500">Chi phí & Lương</h3>
          </div>
          <div className="text-lg font-black text-slate-900">{formatMoney(metrics.expense.total + metrics.labor.total)} đ</div>
          <div className="mt-2 text-xs font-semibold text-slate-500">
            CP: {formatMoney(metrics.expense.total)} đ | Lương: {formatMoney(metrics.labor.total)} đ
          </div>
        </div>

        {/* Card Tiến độ vật tư */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500">Vật tư thi công</h3>
          </div>
          <div className="text-lg font-black text-slate-900">{metrics.materials.completed} / {metrics.materials.total}</div>
          <div className="mt-2 w-full rounded-full bg-slate-100 h-1.5">
            <div 
              className="h-1.5 rounded-full bg-amber-500" 
              style={{ width: `${metrics.materials.total > 0 ? (metrics.materials.completed / metrics.materials.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Biểu đồ cơ cấu chi phí */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-800 mb-6">Cơ cấu chi phí thực tế</h3>
          {costBreakdownData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => [`${formatMoney(value)} đ`, 'Số tiền']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm font-bold text-slate-400">
              Chưa có dữ liệu chi phí
            </div>
          )}
        </div>

        {/* Cảnh báo chứng từ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-800 mb-4">Cảnh báo thiếu chứng từ</h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                <div>
                  <h4 className="font-bold text-rose-900">Thiếu chứng từ CO</h4>
                  <p className="text-xs text-rose-600">Số lượng hạng mục vật tư chưa có CO</p>
                </div>
              </div>
              <span className="text-lg font-black text-rose-700">{metrics.docs.missingCo}</span>
            </div>
            
            <div className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <span className="material-symbols-outlined">error</span>
                </div>
                <div>
                  <h4 className="font-bold text-orange-900">Thiếu chứng từ CQ</h4>
                  <p className="text-xs text-orange-600">Số lượng hạng mục vật tư chưa có CQ</p>
                </div>
              </div>
              <span className="text-lg font-black text-orange-700">{metrics.docs.missingCq}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <span className="material-symbols-outlined">local_fire_department</span>
                </div>
                <div>
                  <h4 className="font-bold text-blue-900">Thiếu Kiểm định PCCC</h4>
                  <p className="text-xs text-blue-600">Số lượng hạng mục vật tư chưa có KĐ PCCC</p>
                </div>
              </div>
              <span className="text-lg font-black text-blue-700">{metrics.docs.missingFire}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
