import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore, hasPermission } from '../services/authStore';
import { FileUpload } from '../components/common/FileUpload';
import { Toast } from '../components/common/Toast';

export const ProjectDiagramTab: React.FC = () => {
  const { projectId } = useParams();
  const { user } = useAuthStore();
  const { projects, updateProject } = useRealtimeStore();

  const project = projects.find(p => p.id === projectId || p.code === projectId);
  const [isSaving, setIsSaving] = useState(false);

  // Parse saved diagrams from comma-separated string
  const savedDiagrams = project?.diagramUrl ? project.diagramUrl.split(',').filter(Boolean) : [];
  
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [resetKey, setResetKey] = useState<number>(Date.now());
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'warning' }>({ show: false, message: '', type: 'success' });

  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleUpload = (urls: string | string[]) => {
    const newUrlArray = Array.isArray(urls) ? urls : [urls];
    // FileUpload multiple returns all current selections. We just set them as pending.
    setPendingUrls(newUrlArray.filter(Boolean));
  };

  const handleSave = async () => {
    if (!project || pendingUrls.length === 0) return;
    setIsSaving(true);
    try {
      // Append pending URLs to existing ones
      const combinedUrls = [...savedDiagrams, ...pendingUrls].join(',');
      
      const updated = await updateProject(project.id, { diagramUrl: combinedUrls });
      if (!updated) {
        alert('Không thể lưu sơ đồ! Lỗi Database: Bảng "projects" chưa có cột "diagram_url".\nVui lòng vào Supabase Dashboard thêm cột "diagram_url" (kiểu text) vào bảng "projects".');
      } else {
        setPendingUrls([]);
        setResetKey(Date.now());
        triggerToast('Lưu sơ đồ dự án thành công!', 'success');
      }
    } catch (err) {
      console.error('Failed to save diagram', err);
    }
    setIsSaving(false);
  };
  
  const handleDelete = async (idxToRemove: number) => {
    if (!project || !window.confirm('Bạn có chắc chắn muốn xóa sơ đồ này?')) return;
    
    setIsSaving(true);
    try {
      const newSaved = [...savedDiagrams];
      newSaved.splice(idxToRemove, 1);
      
      const combinedUrls = newSaved.join(',');
      const updated = await updateProject(project.id, { diagramUrl: combinedUrls });
      if (updated) {
        triggerToast('Đã xóa sơ đồ thành công!', 'success');
      }
    } catch (err) {
      console.error('Failed to delete diagram', err);
    }
    setIsSaving(false);
  };

  if (!project) {
    return <div className="p-4">Dự án không tồn tại</div>;
  }

  // All diagrams to display: saved ones + currently pending ones (preview before save)
  const displayDiagrams = [...savedDiagrams, ...pendingUrls];

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white overflow-y-auto custom-scrollbar relative">
      <div className="w-full h-full flex flex-col">
        <div className="flex flex-col gap-6 flex-1 p-4 md:p-6">
          
          {displayDiagrams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayDiagrams.map((url, idx) => {
                const isPending = idx >= savedDiagrams.length;
                const isPdf = url.toLowerCase().includes('.pdf');
                
                return (
                  <div key={idx} className={`border ${isPending ? 'border-dashed border-indigo-400 bg-indigo-50/30' : 'border-slate-200 bg-slate-50'} rounded-xl overflow-hidden shadow-sm flex flex-col relative group`}>
                    <div className="h-64 flex justify-center items-center p-2 relative overflow-hidden bg-white/50 backdrop-blur-sm">
                      {isPdf ? (
                        <iframe src={url} className="w-full h-full bg-white rounded" title={`Sơ đồ dự án ${idx + 1}`} />
                      ) : (
                        <img src={url} alt={`Sơ đồ dự án ${idx + 1}`} className="w-full h-full object-contain rounded" />
                      )}
                    </div>
                    
                    <div className="p-3 border-t border-slate-200/60 bg-white flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600 truncate mr-2" title={url}>
                        {isPending ? (
                          <span className="text-indigo-600 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">cloud_upload</span> Sắp được lưu</span>
                        ) : (
                          `Sơ đồ ${idx + 1}`
                        )}
                      </span>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-primary p-1.5 rounded-md hover:bg-slate-100 transition-colors" title="Mở thẻ mới">
                          <span className="material-symbols-outlined text-[18px] block">open_in_new</span>
                        </a>
                        {!isPending && hasPermission(user, 'MANAGE_DOCUMENTS') && (
                          <button onClick={() => handleDelete(idx)} className="text-rose-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors" title="Xóa sơ đồ">
                            <span className="material-symbols-outlined text-[18px] block">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {isPending && (
                      <div className="absolute inset-0 bg-indigo-900/5 pointer-events-none rounded-xl border border-indigo-500/20" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">account_tree</span>
              <p className="font-medium text-slate-500 text-lg">Chưa có sơ đồ dự án nào</p>
              <p className="text-sm text-slate-400 mt-2">Hãy tải lên các file ảnh hoặc PDF để thêm sơ đồ mới</p>
            </div>
          )}

          {hasPermission(user, 'MANAGE_DOCUMENTS') && (
            <div className="mt-auto border-t border-slate-100 pt-6">
              <div className="max-w-2xl bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">upload_file</span>
                  Thêm sơ đồ mới
                </h3>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <FileUpload 
                      key={resetKey}
                      label=""
                      buttonText="Upload ảnh"
                      buttonIcon="add_a_photo"
                      variant="solid"
                      multiple={true}
                      value={[]} 
                      onChange={handleUpload} 
                    />
                  </div>
                  {pendingUrls.length > 0 && (
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="h-10 px-6 bg-primary text-white font-bold text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shrink-0 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      {isSaving ? 'Đang lưu...' : `Lưu ${pendingUrls.length} sơ đồ`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <Toast show={toast.show} message={toast.message} type={toast.type} />
      </div>
    </div>
  );
};
