import React, { useState } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';

const cleanText = (value?: string) => {
  if (!value) return '';

  const replacements: Array<[string, string]> = [
    ['Sá»±', 'Sự'], ['cá»‘', 'cố'], ['bÃ¡o', 'báo'], ['vá»', 'về'],
    ['Má»›i', 'Mới'], ['ghi nháº­n', 'ghi nhận'], ['Äang', 'Đang'], ['xá»­ lÃ½', 'xử lý'],
    ['ÄÃ£', 'Đã'], ['giáº£i quyáº¿t', 'giải quyết'], ['HoÃ n thÃ nh', 'Hoàn thành'],
    ['MÃ´ táº£', 'Mô tả'], ['tá»«', 'từ'], ['hiá»‡n trÆ°á»ng', 'hiện trường'],
    ['NgÆ°á»i', 'Người'], ['cÃ¡o', 'cáo'], ['Chá»‰ Ä‘áº¡o', 'Chỉ đạo'],
    ['Ban Quáº£n LÃ½', 'Ban Quản lý'], ['Nháº­t kÃ½', 'Nhật ký'], ['Gá»­i', 'Gửi'],
    ['thÃ´ng bÃ¡o', 'thông báo'], ['Ká»¹ sÆ°', 'Kỹ sư'], ['ChÆ°a chá»n', 'Chưa chọn'],
    ['VÆ°á»›ng', 'Vướng'], ['máº¯c', 'mắc'], ['thi cÃ´ng', 'thi công'],
    ['cÃ´ng', 'công'], ['trÃ¬nh', 'trình'], ['Ä‘Ã¡nh dáº¥u', 'đánh dấu'],
    ['Ä‘Æ°á»£c', 'được'], ['Ä‘áº¡o', 'đạo'], ['ná»™i dung', 'nội dung'],
    ['trá»±c tiáº¿p', 'trực tiếp'], ['báº£o trÃ¬', 'bảo trì'],
  ];

  return replacements.reduce((text, [from, to]) => text.split(from).join(to), value);
};

const IssuePhoto: React.FC<{ src: string; title: string; className: string; iconClassName?: string }> = ({
  src,
  title,
  className,
  iconClassName = 'text-xl',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={`${className} bg-slate-100 text-slate-400 flex items-center justify-center`} title={cleanText(title)}>
        <span className={`material-symbols-outlined ${iconClassName}`}>image_not_supported</span>
      </div>
    );
  }

  return <img src={src} alt="" className={className} onError={() => setHasError(true)} />;
};

export const IssueResolutionPage: React.FC = () => {
  const { issues, addDirective, updateIssueStatus } = useRealtimeStore();

  const [selectedIssueId, setSelectedIssueId] = useState<string>(issues[0]?.id || '');
  const [directiveText, setDirectiveText] = useState<string>('');
  const [notifyClient, setNotifyClient] = useState<boolean>(true);

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId) || issues[0];

  const handleSendDirective = (event: React.FormEvent) => {
    event.preventDefault();
    if (!directiveText.trim() || !selectedIssue) return;

    addDirective(selectedIssue.id, directiveText);
    setDirectiveText('');
    alert('Đã phát chỉ đạo giải quyết sự cố tới hiện trường!');
  };

  const handleResolveTicket = () => {
    if (!selectedIssue) return;
    updateIssueStatus(selectedIssue.id, 'RESOLVED');
    alert(`Sự cố ${selectedIssue.incidentCode} đã được đánh dấu HOÀN THÀNH xử lý!`);
  };

  const statusLabel = (status: string) => {
    if (status === 'OPEN') return 'Mới ghi nhận';
    if (status === 'PROCESSING') return 'Đang xử lý';
    return 'Đã giải quyết';
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col">
      <section className="bg-white border-b border-slate-200 shadow-xs px-5 py-4 flex items-center gap-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-xl">report_problem</span>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-slate-900">Xử lý Sự cố Hiện trường</h2>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100">{issues.length} sự cố</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Theo dõi, chỉ đạo và cập nhật trạng thái xử lý các sự cố báo về từ công trường.</p>
        </div>
      </section>

      <div className="flex min-h-0 flex-1 overflow-hidden">
      <section className="w-80 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-sm font-extrabold text-slate-800 tracking-tight">Sự cố báo về <span className="text-primary">({issues.length})</span></span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
          {issues.map((issue) => {
            const isSelected = issue.id === selectedIssueId;
            return (
              <div
                key={issue.id}
                onClick={() => setSelectedIssueId(issue.id)}
                className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer border-l-4 ${
                  issue.priority === 'CRITICAL' ? 'border-red-500' : issue.priority === 'WARNING' ? 'border-amber-500' : 'border-blue-500'
                } ${isSelected ? 'bg-blue-50/60' : 'bg-white'}`}
              >
                <div className="flex gap-3">
                  <IssuePhoto src={issue.photoUrl} title={issue.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-slate-200" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate">{cleanText(issue.title)}</h4>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{cleanText(issue.reportedTime)}</span>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold">
                      <span className={`w-1.5 h-1.5 rounded-full ${issue.status === 'OPEN' ? 'bg-red-500' : issue.status === 'PROCESSING' ? 'bg-amber-500' : 'bg-emerald-600'}`}></span>
                      <span className={issue.status === 'OPEN' ? 'text-red-600' : issue.status === 'PROCESSING' ? 'text-amber-600' : 'text-emerald-700'}>{statusLabel(issue.status)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedIssue ? (
        <section className="flex-1 bg-slate-50 flex flex-col overflow-y-auto custom-scrollbar p-4">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center shadow-xs">
              <div>
                <span className="px-2 py-0.5 bg-slate-100 font-mono text-[11px] font-bold text-slate-600 rounded">{selectedIssue.incidentCode}</span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{cleanText(selectedIssue.title)}</h2>
                <span className="text-xs text-slate-500">{cleanText(selectedIssue.location)}</span>
              </div>
              {selectedIssue.status !== 'RESOLVED' && (
                <button onClick={handleResolveTicket} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-xs">
                  Hoàn thành xử lý
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 p-2 rounded-xl h-64 overflow-hidden shadow-xs">
                <IssuePhoto src={selectedIssue.photoUrl} title={selectedIssue.title} className="w-full h-full object-cover rounded-lg" iconClassName="text-4xl" />
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Mô tả sự cố từ hiện trường</span>
                  <p className="text-xs text-slate-700 leading-relaxed italic mt-2">"{cleanText(selectedIssue.description)}"</p>
                </div>
                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                  Người báo cáo: <strong className="text-slate-800 font-bold">{cleanText(selectedIssue.reportedBy)}</strong>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendDirective} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <span className="text-xs font-bold text-primary block">Chỉ đạo xử lý của Ban Quản lý</span>
              <textarea
                required
                rows={3}
                value={directiveText}
                onChange={(event) => setDirectiveText(event.target.value)}
                placeholder="Nhập nội dung chỉ đạo thi công/bảo trì trực tiếp..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none"
              />

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                  <input type="checkbox" checked={notifyClient} onChange={(event) => setNotifyClient(event.target.checked)} className="w-3.5 h-3.5 rounded text-primary border-slate-300 focus:ring-primary" />
                  <span>Gửi thông báo Push tới Mobile App Kỹ sư</span>
                </label>

                <button type="submit" className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 shadow-xs">Gửi chỉ đạo</button>
              </div>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Nhật ký xử lý</span>
              <div className="space-y-3 text-xs">
                {selectedIssue.timelineLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                    <div>
                      <span className="font-mono text-[10px] text-slate-400">{cleanText(log.time)}</span>
                      <p className="text-slate-800 font-medium">{cleanText(log.author)}: {cleanText(log.message)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">Chưa chọn sự cố</div>
      )}
      </div>
    </div>
  );
};

