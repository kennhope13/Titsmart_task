import React from 'react';

interface OverviewTabProps {
  selectedProject: string;
  projectMetrics: any;
  chartData: any[];
  money: (value: number) => string;
  totalExtraTasks: number;
  missingDocs: {
    co: any[];
    cq: any[];
    inspection: any[];
  };
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  selectedProject, projectMetrics, chartData, money, totalExtraTasks, missingDocs
}) => {
  const costRows = chartData.filter((item) => item.value > 0);
  const maxCost = Math.max(...chartData.map((item) => item.value), 1);

  return (
    <div className="h-full overflow-y-auto bg-white custom-scrollbar">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
            <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
            Tổng quan vận hành chi phí
          </div>
          <span className="inline-flex w-fit items-center rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-primary">
            Mã dự án: {selectedProject || 'N/A'}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-extrabold text-slate-800">Cơ cấu chi phí</h3>
              <span className="text-[11px] font-bold text-slate-500">Tổng: {money(projectMetrics.totalProjectCost)} đ</span>
            </div>
            <div className="divide-y divide-slate-100">
              {(costRows.length > 0 ? costRows : chartData).map((item) => {
                const percent = Math.round((item.value / maxCost) * 100);
                return (
                  <div key={item.name} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-bold text-slate-700">{item.name}</span>
                      <span className="whitespace-nowrap text-sm font-black text-slate-900">{money(item.value)} đ</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-extrabold text-slate-800">Chứng từ vật tư</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { label: 'CO', value: missingDocs.co.length },
                { label: 'CQ', value: missingDocs.cq.length },
                { label: 'Kiểm định PCCC', value: missingDocs.inspection.length },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.value > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-black ${item.value > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
