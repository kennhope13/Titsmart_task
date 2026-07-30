import React from 'react';

interface MetricsProps {
  projectMetrics: {
    totalPurchasing: number;
    totalSpent: number;
    totalExp: number;
    totalLab: number;
    totalProjectCost: number;
    fund: number;
    balance: number;
    orderedCount: number;
    missingCo: number;
    missingCq: number;
    missingInspection: number;
    progressPercent: number;
  };
}

const money = (value: number) => value.toLocaleString('vi-VN');

export const CostPlanMetrics: React.FC<MetricsProps> = ({ projectMetrics }) => {
  const spentPercent = projectMetrics.fund > 0
    ? Math.min(100, Math.round((projectMetrics.totalSpent / projectMetrics.fund) * 100))
    : 0;

  const items = [
    {
      label: 'Quỹ công trình',
      value: `${money(projectMetrics.fund)} đ`,
      meta: 'Ngân sách đã cấp',
      icon: 'account_balance_wallet',
      tone: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      label: 'Tổng chi thực tế',
      value: `${money(projectMetrics.totalSpent)} đ`,
      meta: `Đã dùng ${spentPercent}% quỹ`,
      icon: 'payments',
      tone: 'text-rose-600 bg-rose-50 border-rose-100',
      progress: spentPercent,
      progressClass: 'bg-rose-500',
    },
    {
      label: 'Tồn quỹ',
      value: `${money(projectMetrics.balance)} đ`,
      meta: projectMetrics.balance < 0 ? 'Vượt quỹ cần kiểm tra' : 'Còn lại sau chi',
      icon: projectMetrics.balance < 0 ? 'warning' : 'savings',
      tone: projectMetrics.balance < 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Tiến độ KH-VT',
      value: `${projectMetrics.progressPercent}%`,
      meta: `${projectMetrics.orderedCount} đơn đã đặt`,
      icon: 'inventory_2',
      tone: 'text-amber-600 bg-amber-50 border-amber-100',
      progress: projectMetrics.progressPercent,
      progressClass: 'bg-amber-500',
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className={`mt-2 truncate text-xl font-black ${projectMetrics.balance < 0 && item.label === 'Tồn quỹ' ? 'text-red-600' : 'text-slate-900'}`}>
                {item.value}
              </p>
            </div>
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${item.tone}`}>
              <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
            </div>
          </div>
          {item.progress !== undefined && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${item.progressClass}`} style={{ width: `${item.progress}%` }} />
            </div>
          )}
          <p className="mt-2 text-[11px] font-medium text-slate-500">{item.meta}</p>
        </div>
      ))}
    </section>
  );
};
