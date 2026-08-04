import React, { useState, useRef } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { FieldLog } from '../types';

export const FieldLogsPage: React.FC = () => {
  const { fieldLogs, projects, tasks, addFieldLog, updateTask } = useRealtimeStore();
  
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [note, setNote] = useState('');
  const [statusUpdate, setStatusUpdate] = useState<'Đang làm' | 'Hoàn thành' | 'Vướng mắc'>('Đang làm');
  
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [gpsLocation, setGpsLocation] = useState<{lat: number, lng: number, text?: string}>();
  const [isGettingGps, setIsGettingGps] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableTasks = tasks.filter(t => t.projectCode === selectedProject && !t.isSectionHeader);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const getLocation = () => {
    setIsGettingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          text: `Vĩ độ: ${pos.coords.latitude.toFixed(6)}, Kinh độ: ${pos.coords.longitude.toFixed(6)}`
        });
        setIsGettingGps(false);
      }, (err) => {
        console.error("GPS Error:", err);
        alert("Không thể lấy tọa độ GPS. Vui lòng cấp quyền vị trí.");
        setIsGettingGps(false);
      }, { timeout: 10000 });
    } else {
      alert("Trình duyệt không hỗ trợ định vị GPS.");
      setIsGettingGps(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedTask || !note) return;

    const newLog: Omit<FieldLog, 'id'> = {
      projectCode: selectedProject,
      taskId: selectedTask,
      engineerId: 'eng-1', // Mock current user
      timestamp: new Date().toISOString(),
      note,
      images: imageUrls,
      gpsLocation,
      statusUpdate
    };

    addFieldLog(newLog);

    // Auto update task status if completed
    if (statusUpdate === 'Hoàn thành') {
      const task = tasks.find(t => t.id === selectedTask);
      if (task) {
        updateTask(selectedTask, { 
          isDone: true, 
          progress: 1, 
          constrStatus: 'Đã hoàn thành',
          status: 'Hoàn thành'
        });
      }
    } else if (statusUpdate === 'Vướng mắc') {
      updateTask(selectedTask, {
        issue: note,
        issueStatus: 'OPEN'
      });
    }

    setIsReportOpen(false);
    setNote('');
    setImageUrls([]);
    setGpsLocation(undefined);
  };

  return (
    <div className="flex-1 bg-slate-100 min-h-full relative max-w-2xl mx-auto border-x border-slate-200 overflow-y-auto">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="page-title text-2xl font-extrabold text-slate-900">Nhật ký Công trình</h1>
      </header>

      <div className="p-4 pb-24 space-y-6">
        {fieldLogs.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white rounded-xl shadow-sm border border-slate-100">
            Chưa có báo cáo hiện trường nào.
          </div>
        ) : (
          fieldLogs.map((log, index) => {
            const project = projects.find(p => p.code === log.projectCode);
            const task = tasks.find(t => t.id === log.taskId);
            
            return (
              <div key={log.id || index} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    KS
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">Kỹ sư Hiện trường</p>
                    <p className="text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      log.statusUpdate === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-700' :
                      log.statusUpdate === 'Vướng mắc' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {log.statusUpdate}
                    </span>
                  </div>
                </div>
                
                <div className="p-3 bg-slate-50 text-xs border-b border-slate-100">
                  <p className="font-semibold text-slate-700"><span className="text-slate-500">Dự án:</span> {project?.name}</p>
                  <p className="font-semibold text-slate-700 mt-1"><span className="text-slate-500">Hạng mục:</span> {task?.name}</p>
                </div>

                <div className="p-4 text-sm text-slate-800 whitespace-pre-wrap">
                  {log.note}
                </div>

                {log.images && log.images.length > 0 && (
                  <div className="p-2 grid grid-cols-2 gap-2">
                    {log.images.map((img: string, i: number) => (
                      <div key={i} className="relative aspect-square bg-black/5 rounded-lg overflow-hidden group">
                        <img src={img} alt="field" className="w-full h-full object-cover" />
                        {log.gpsLocation && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5 text-[9px] text-white backdrop-blur-sm">
                            <p className="font-mono">📍 {log.gpsLocation.text}</p>
                            <p className="font-mono mt-0.5">⏱ {new Date(log.timestamp).toLocaleString('vi-VN')}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsReportOpen(true)}
        className="fixed bottom-6 right-6 lg:right-[calc(50%-20rem+1.5rem)] w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-transform hover:scale-105 z-20"
      >
        <span className="material-symbols-outlined text-2xl">add_a_photo</span>
      </button>

      {/* Report Modal / Bottom Sheet */}
      {isReportOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
          <div className="bg-white w-full sm:w-[500px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-800">Báo cáo Hiện trường</h2>
              <button onClick={() => setIsReportOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Dự án</label>
                <select 
                  required
                  value={selectedProject} 
                  onChange={e => { setSelectedProject(e.target.value); setSelectedTask(''); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                >
                  <option value="">-- Chọn dự án --</option>
                  {projects.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Đầu việc</label>
                <select 
                  required
                  disabled={!selectedProject}
                  value={selectedTask} 
                  onChange={e => setSelectedTask(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                >
                  <option value="">-- Chọn đầu việc thi công --</option>
                  {availableTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Ảnh Hiện trường</label>
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                      <img src={url} alt="upload" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setImageUrls(urls => urls.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 shrink-0"
                  >
                    <span className="material-symbols-outlined mb-1 text-xl">add_photo_alternate</span>
                  </button>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />

                <div className="flex items-center gap-2 mt-2">
                  <button 
                    type="button"
                    onClick={getLocation}
                    disabled={isGettingGps}
                    className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-1 border border-slate-200"
                  >
                    <span className="material-symbols-outlined text-[14px]">my_location</span>
                    {isGettingGps ? 'Đang lấy vị trí...' : gpsLocation ? 'Lấy lại tọa độ' : 'Lấy tọa độ GPS'}
                  </button>
                  {gpsLocation && <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-2 py-1 rounded">📍 Đã có GPS</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nội dung báo cáo</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Ghi chú về tiến độ, công việc đã hoàn thành hoặc vướng mắc..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Trạng thái cập nhật</label>
                <div className="flex gap-2">
                  {['Đang làm', 'Hoàn thành', 'Vướng mắc'].map((st) => (
                    <label key={st} className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors ${
                      statusUpdate === st 
                        ? (st === 'Hoàn thành' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 
                           st === 'Vướng mắc' ? 'border-red-500 bg-red-50 text-red-700' : 
                           'border-blue-500 bg-blue-50 text-blue-700')
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}>
                      <input 
                        type="radio" 
                        name="status" 
                        value={st} 
                        checked={statusUpdate === st}
                        onChange={(e) => setStatusUpdate(e.target.value as any)}
                        className="hidden"
                      />
                      <span className="text-sm font-bold">{st}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-3 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700"
                >
                  Gửi báo cáo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
