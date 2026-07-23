import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRealtimeStore } from '../services/realtimeStore';

export const ReportExportPage: React.FC = () => {
  const { projects, tasks, materials, issues } = useRealtimeStore();
  const [activeTemplate, setActiveTemplate] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const activeProject = projects[0] || { name: 'BuildCore Project', code: 'BC-001' };
  const currentDateStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const templates = [
    { id: 'daily' as const, title: 'Báo cáo Tiến độ Hằng ngày', sub: 'Nhật ký thi công, nhân công hiện trường' },
    { id: 'weekly' as const, title: 'Báo cáo Vật tư Tuần', sub: 'Khối lượng nhập kho và tồn kho thực tế' },
    { id: 'monthly' as const, title: 'Báo cáo Đánh giá Dự án Tháng', sub: 'Tổng quan ngân sách và mốc tiến độ' },
  ];

  const activeTitle = templates.find((item) => item.id === activeTemplate)?.title || templates[0].title;

  const handleExportPDF = async () => {
    const el = document.getElementById('report-preview-container');
    if (!el) return;

    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`BuildCore_Bao_Cao_${activeTemplate.toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Lỗi xuất PDF:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasks.map((task) => ({
      'Mã CV': task.code,
      'Tên công việc': task.name,
      'Dự án': task.projectName,
      'Khối lượng': task.volume,
      'Đơn vị': task.unit,
      'Kỹ sư': task.assignedEngineerName,
      'Trạng thái': task.status,
    }))), 'Tiến độ Công việc');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(materials.map((material) => ({
      'Mã VT': material.code,
      'Vật tư': material.name,
      'Dự án': material.projectName,
      'Số lượng': material.volume,
      'Đơn vị': material.unit,
      'Trạng thái': material.status,
    }))), 'Theo dõi Vật tư');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(issues.map((issue) => ({
      'Mã sự cố': issue.incidentCode,
      'Tiêu đề': issue.title,
      'Vị trí': issue.location,
      'Người báo cáo': issue.reportedBy,
      'Mức độ': issue.priority,
      'Trạng thái': issue.status,
    }))), 'Nhật ký Sự cố');

    XLSX.writeFile(wb, `Bao_Cao_Tong_Hop_${activeTemplate.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="px-0 pt-0 pb-4 space-y-4">
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-xl">analytics</span>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-slate-900">Xuất Báo cáo & Hồ sơ</h2>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100">3 mẫu</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Tạo nhanh báo cáo PDF hoặc Excel từ dữ liệu tiến độ, vật tư và sự cố.</p>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-4">
      <section className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <span className="text-sm font-extrabold text-slate-800 tracking-tight">Mẫu báo cáo</span>
        </div>

        <div className="p-4 space-y-3">
          {templates.map((item) => (
            <div key={item.id} onClick={() => setActiveTemplate(item.id)} className={`bg-white border p-4 rounded-xl transition-all cursor-pointer ${activeTemplate === item.id ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 hover:border-slate-300'}`}>
              <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={(event) => { event.stopPropagation(); setActiveTemplate(item.id); handleExportPDF(); }} className="flex-1 bg-primary text-white py-2 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 hover:opacity-90 shadow-xs">
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span> Tải PDF
                </button>
                <button onClick={(event) => { event.stopPropagation(); setActiveTemplate(item.id); handleExportExcel(); }} className="flex-1 border border-slate-200 text-slate-700 py-2 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-50">
                  <span className="material-symbols-outlined text-sm">table_chart</span> Tải Excel
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Xem trước báo cáo A4</span>
            <h3 className="text-base font-extrabold text-slate-900 mt-1">{activeTitle}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportPDF} disabled={isExportingPdf} className="bg-primary text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1 hover:opacity-90 shadow-xs disabled:opacity-60">
              <span className="material-symbols-outlined text-sm">download</span>
              {isExportingPdf ? 'Đang tạo PDF...' : 'Tải file PDF'}
            </button>
            <button onClick={handleExportExcel} className="border border-slate-200 bg-white text-slate-700 px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-slate-50 shadow-xs">
              <span className="material-symbols-outlined text-sm">table_chart</span>
              Tải file Excel
            </button>
          </div>
        </div>

        <div className="bg-slate-100 p-6 flex justify-center overflow-auto max-h-[calc(100vh-150px)] custom-scrollbar">
          <div id="report-preview-container" className="bg-white w-[720px] min-h-[920px] p-8 flex flex-col justify-between shadow-lg rounded border border-slate-200 text-slate-800 text-xs shrink-0">
            <div>
              <div className="border-b-2 border-primary pb-3 flex justify-between items-end mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary flex items-center justify-center text-white rounded-lg">
                    <span className="material-symbols-outlined text-2xl">architecture</span>
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-primary uppercase">{activeTitle}</h2>
                    <p className="text-[11px] text-slate-500 font-sans">Mã công trình: #{activeProject.code} | {activeProject.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ngày lập báo cáo</p>
                  <p className="text-xs font-bold text-slate-800">{currentDateStr}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border border-slate-200 p-3 bg-slate-50 rounded-lg mb-4 text-[11px]">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Thời tiết</p><p className="font-bold text-slate-800">Nắng tốt, 28°C</p></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Nhân công</p><p className="font-bold text-slate-800">142 người</p></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">An toàn</p><p className="font-bold text-emerald-700">Đạt tiêu chuẩn 100%</p></div>
              </div>

              <div className="mb-4 space-y-1">
                <h6 className="border-b border-slate-200 pb-1 font-bold text-primary text-xs uppercase">Hạng mục thi công</h6>
                <table className="w-full text-xs text-left">
                  <thead><tr className="bg-slate-50 text-slate-500 font-bold"><th className="p-2">Tên công việc</th><th className="p-2">Trạng thái</th><th className="p-2 text-right">Khối lượng</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {tasks.slice(0, 5).map((task) => (
                      <tr key={task.id}>
                        <td className="p-2 font-medium">{task.name}</td>
                        <td className="p-2 font-semibold text-emerald-700">{task.status === 'Done' ? 'Hoàn thành' : 'Đang thi công'}</td>
                        <td className="p-2 text-right font-mono font-bold">{task.volume} {task.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h6 className="border-b border-slate-200 pb-1 mb-2 font-bold text-primary text-xs uppercase">Ảnh nghiệm thu hiện trường</h6>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200"><img src="https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=400&q=80" alt="Ảnh hiện trường 1" className="w-full h-full object-cover" /></div>
                  <div className="h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200"><img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80" alt="Ảnh hiện trường 2" className="w-full h-full object-cover" /></div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase">
              <div>BuildCore Pro Enterprise Site Operations System</div>
              <div>Bảo mật | Trang 1 / 1</div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};
