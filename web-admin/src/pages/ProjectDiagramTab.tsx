import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore, hasPermission } from '../services/authStore';
import { FileUpload } from '../components/common/FileUpload';
import { createPortal } from 'react-dom';
import { Toast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';

export const ProjectDiagramTab: React.FC = () => {
  const { projectId } = useParams();
  const { user } = useAuthStore();
  const { projects, updateProject } = useRealtimeStore();

  const project = projects.find(p => p.id === projectId || p.code === projectId);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Parse saved diagrams from comma-separated string
  let savedDiagrams: {url: string, name: string}[] = [];
  if (project?.diagramUrl) {
    if (project.diagramUrl.trim().startsWith('[')) {
      try {
        savedDiagrams = JSON.parse(project.diagramUrl);
      } catch (e) {}
    }
    if (savedDiagrams.length === 0 && project.diagramUrl.length > 0) {
      savedDiagrams = project.diagramUrl.split(',').filter(Boolean).map((url, i) => ({ url, name: `Sơ đồ ${i + 1}` }));
    }
  }
  
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [diagramName, setDiagramName] = useState<string>('');
  const [resetKey, setResetKey] = useState<number>(Date.now());
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.getElementById('project-header-actions'));
  }, []);
  
  const [viewerItem, setViewerItem] = useState<{url: string, name: string} | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'warning' }>({ show: false, message: '', type: 'success' });

  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleUpload = (urls: string | string[]) => {
    const newUrlArray = Array.isArray(urls) ? urls : [urls];
    setPendingUrls(newUrlArray.filter(Boolean));
  };

  const handleSave = async () => {
    if (!project || pendingUrls.length === 0) return;
    setIsSaving(true);
    try {
      const newEntries = pendingUrls.map((url, idx) => ({
        url,
        name: diagramName.trim() ? (pendingUrls.length > 1 ? `${diagramName.trim()} ${idx + 1}` : diagramName.trim()) : `Sơ đồ mới ${idx + 1}`
      }));
      const combinedUrls = JSON.stringify([...savedDiagrams, ...newEntries]);
      
      const updated = await updateProject(project.id, { diagramUrl: combinedUrls });
      if (!updated) {
        alert('Không thể lưu sơ đồ! Lỗi Database: Bảng "projects" chưa có cột "diagram_url".');
      } else {
        setPendingUrls([]);
        setDiagramName('');
        setResetKey(Date.now());
        setIsModalOpen(false);
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
      const combinedUrls = newSaved.length > 0 ? JSON.stringify(newSaved) : '';
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

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white overflow-y-auto custom-scrollbar relative">
      <div className="w-full h-full flex flex-col">
        <div className="flex flex-col gap-6 flex-1 p-4 md:p-6">
          
          {savedDiagrams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedDiagrams.map((item, idx) => {
                const url = item.url;
                const name = item.name;
                const isPdf = url.toLowerCase().includes('.pdf');
                
                return (
                  <div key={idx} className="border border-slate-200 bg-slate-50 rounded-xl overflow-hidden shadow-sm flex flex-col relative group">
                    <div className="h-64 flex justify-center items-center p-2 relative overflow-hidden bg-white/50 backdrop-blur-sm cursor-pointer group-hover:bg-slate-100 transition-colors" onClick={() => setViewerItem({url, name})} title="Nhấn để xem ảnh lớn">
                      {isPdf ? (
                        <iframe src={url} className="w-full h-full bg-white rounded" title={`Sơ đồ dự án ${idx + 1}`} />
                      ) : (
                        <img src={url} alt={`Sơ đồ dự án ${idx + 1}`} className="w-full h-full object-contain rounded" />
                      )}
                    </div>
                    
                    <div className="p-3 border-t border-slate-200/60 bg-white flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700 truncate mr-2" title={url}>{name}</span>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-slate-200 transition-colors" title="Mở thẻ mới">
                          <span className="material-symbols-outlined text-[18px] block">open_in_new</span>
                        </a>
                        {hasPermission(user, 'MANAGE_DOCUMENTS') && (
                          <button onClick={() => handleDelete(idx)} className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-colors" title="Xóa sơ đồ">
                            <span className="material-symbols-outlined text-[18px] block">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">account_tree</span>
              <p className="font-medium text-slate-500 text-lg">Chưa có sơ đồ dự án nào</p>
              <p className="text-sm text-slate-400 mt-2">Hãy bấm vào nút Upload ảnh trên thanh tiêu đề</p>
            </div>
          )}

          {/* Portal Button to trigger Modal */}
          {hasPermission(user, 'MANAGE_DOCUMENTS') && portalNode && createPortal(
            <button 
              onClick={() => setIsModalOpen(true)}
              className="h-[36px] px-4 bg-primary text-white font-bold text-sm rounded-lg hover:bg-blue-800 transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
              Upload ảnh
            </button>,
            portalNode
          )}

          {/* The Upload Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setPendingUrls([]); setDiagramName(''); setResetKey(Date.now()); }} />
              <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
                
                {/* Modal Header */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                    <span className="material-symbols-outlined text-base text-primary">add_a_photo</span>
                    Upload sơ đồ dự án
                  </h3>
                  <button onClick={() => { setIsModalOpen(false); setPendingUrls([]); setDiagramName(''); setResetKey(Date.now()); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    
                    {/* Project Name Field */}
                    <div>
                      <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-primary">
                        DỰ ÁN
                      </label>
                      <div className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700">
                        {project.name}
                      </div>
                    </div>

                    {/* Tên sơ đồ Field */}
                    <div>
                      <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-primary">
                        TÊN SƠ ĐỒ
                      </label>
                      <input 
                        type="text" 
                        placeholder="Nhập tên sơ đồ (vd: Sơ đồ nguyên lý...)"
                        value={diagramName}
                        onChange={(e) => setDiagramName(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400 shadow-sm"
                      />
                    </div>

                    {/* Image Upload Field */}
                    <div>
                      <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-primary">
                        SƠ ĐỒ DỰ ÁN <span className="text-rose-500 normal-case font-normal">*</span>
                      </label>
                      
                      <div className="w-full">
                        <FileUpload 
                          key={resetKey}
                          label=""
                          buttonText="Tải sơ đồ"
                          buttonIcon="add_photo_alternate"
                          variant="light"
                          multiple={true}
                          value={pendingUrls} 
                          onChange={handleUpload} 
                        />
                      </div>
                    </div>

                  </div>

                  {/* Modal Footer */}
                  <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button 
                      onClick={() => { setIsModalOpen(false); setPendingUrls([]); setDiagramName(''); setResetKey(Date.now()); }} 
                      className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm"
                    >
                      Hủy
                    </button>
                    <button 
                      onClick={handleSave} 
                      disabled={isSaving || pendingUrls.length === 0} 
                      className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      {isSaving ? 'Đang tải...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
        
        {viewerItem && (
          <Modal isOpen={true} onClose={() => setViewerItem(null)} title="Chi tiết sơ đồ" size="xl">
            <div className="flex flex-col border rounded-lg p-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700 truncate w-3/4">{viewerItem.name}</span>
                <a href={`${viewerItem.url}?download=`} download target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-primary text-white h-[34px] px-3 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">download</span> Tải về
                </a>
              </div>
              {viewerItem.url.toLowerCase().includes('.pdf') ? (
                <iframe src={viewerItem.url} className="w-full h-[70vh] bg-slate-100 rounded" title={viewerItem.name} />
              ) : (
                <img src={viewerItem.url} alt={viewerItem.name} className="w-full object-contain max-h-[70vh] bg-slate-100 rounded" />
              )}
            </div>
          </Modal>
        )}
        <Toast show={toast.show} message={toast.message} type={toast.type} />
      </div>
    </div>
  );
};
