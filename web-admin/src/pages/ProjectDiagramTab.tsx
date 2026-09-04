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

  // We can just use the project's diagramUrl directly from the store
  const diagramUrl = project?.diagramUrl;
  const [pendingUrl, setPendingUrl] = useState<string>('');

  const handleUpload = (urls: string | string[]) => {
    const newUrlArray = Array.isArray(urls) ? urls : [urls];
    const newUrl = newUrlArray[0] || '';
    setPendingUrl(newUrl);
  };

  const handleSave = async () => {
    if (!project || !pendingUrl || pendingUrl === project.diagramUrl) return;
    setIsSaving(true);
    try {
      const updated = await updateProject(project.id, { diagramUrl: pendingUrl });
      if (!updated) {
        alert('Không thể lưu sơ đồ! Lỗi Database: Bảng "projects" chưa có cột "diagram_url".\nVui lòng vào Supabase Dashboard thêm cột "diagram_url" (kiểu text) vào bảng "projects".');
      } else {
        setPendingUrl('');
      }
    } catch (err) {
      console.error('Failed to save diagram', err);
    }
    setIsSaving(false);
  };

  if (!project) {
    return <div className="p-4">Dự án không tồn tại</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50 p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
        
        

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col gap-4">
          {(pendingUrl || diagramUrl) ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex justify-center items-center p-2 relative group min-h-[400px]">
              <a href={pendingUrl || diagramUrl} target="_blank" rel="noreferrer" className="absolute top-4 right-4 bg-white/90 text-slate-700 hover:text-primary hover:bg-white p-2 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
              </a>
              {(pendingUrl || diagramUrl || '').toLowerCase().includes('.pdf') ? (
                <iframe src={pendingUrl || diagramUrl} className="w-full h-[70vh] bg-white rounded" title="Sơ đồ dự án" />
              ) : (
                <img src={pendingUrl || diagramUrl} alt="Sơ đồ dự án" className="max-w-full max-h-[70vh] object-contain rounded" />
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
              <span className="material-symbols-outlined text-5xl mb-3 text-slate-300">account_tree</span>
              <p className="font-medium text-slate-500">Chưa có sơ đồ dự án</p>
            </div>
          )}

          {hasPermission(user, 'MANAGE_DOCUMENTS') && (
            <div className="mt-4 border-t border-slate-100 pt-6">
              <div className="max-w-xl">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <FileUpload 
                      label={(pendingUrl || diagramUrl) ? "Cập nhật Sơ đồ mới (Ảnh hoặc PDF)" : "Tải lên Sơ đồ dự án (Ảnh hoặc PDF)"} 
                      value={pendingUrl ? [pendingUrl] : diagramUrl ? [diagramUrl] : []} 
                      onChange={handleUpload} 
                    />
                  </div>
                  {pendingUrl && pendingUrl !== diagramUrl && (
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="h-10 px-6 bg-primary text-white font-bold text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shrink-0 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      {isSaving ? 'Đang lưu...' : 'Lưu sơ đồ'}
                    </button>
                  )}
                </div>
                {isSaving && <p className="text-xs text-primary font-medium mt-2 animate-pulse">Đang lưu...</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
