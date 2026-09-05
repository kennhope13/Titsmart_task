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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  const handleOpenEditModal = (idx: number) => {
    setEditingIndex(idx);
    setDiagramName(savedDiagrams[idx].name);
    setPendingUrls([savedDiagrams[idx].url]);
    setResetKey(Date.now());
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPendingUrls([]);
    setDiagramName('');
    setEditingIndex(null);
    setResetKey(Date.now());
  };

  const handleSave = async () => {
    if (!project || pendingUrls.length === 0) return;
    setIsSaving(true);
    try {
      let combinedUrls: string;
      if (editingIndex !== null) {
        const newSaved = [...savedDiagrams];
        // Replace the item with potentially new URL and new name
        // If they uploaded multiple files, we just use the first one, or we can expand it. Let's expand if multiple.
        if (pendingUrls.length === 1) {
          newSaved[editingIndex] = {
            url: pendingUrls[0],
            name: diagramName.trim() || `Sơ đồ ${editingIndex + 1}`
          };
        } else {
          // If they somehow uploaded multiple files during edit, replace the current one with multiple
          const newEntries = pendingUrls.map((url, idx) => ({
            url,
            name: diagramName.trim() ? (pendingUrls.length > 1 ? `${diagramName.trim()} ${idx + 1}` : diagramName.trim()) : `Sơ đồ mới ${idx + 1}`
          }));
          newSaved.splice(editingIndex, 1, ...newEntries);
        }
        combinedUrls = JSON.stringify(newSaved);
      } else {
        const newEntries = pendingUrls.map((url, idx) => ({
          url,
          name: diagramName.trim() ? (pendingUrls.length > 1 ? `${diagramName.trim()} ${idx + 1}` : diagramName.trim()) : `Sơ đồ mới ${idx + 1}`
        }));
        combinedUrls = JSON.stringify([...savedDiagrams, ...newEntries]);
      }
      
      const updated = await updateProject(project.id, { diagramUrl: combinedUrls });
      if (!updated) {
        alert('Không thể lưu sơ đồ! Lỗi Database: Bảng "projects" chưa có cột "diagram_url".');
      } else {
        handleCloseModal();
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
                    <div className="px-3 py-1.5 border-b border-slate-200/60 bg-white flex items-center justify-between z-20 relative">
                      <span className="text-sm font-bold text-slate-700 truncate mr-2" title={url}>{name}</span>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {hasPermission(user, 'MANAGE_DOCUMENTS') && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(idx); }} className="text-slate-400 hover:text-primary p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Đổi tên">
                              <span className="material-symbols-outlined text-[18px] block">edit</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(idx); }} className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors" title="Xóa sơ đồ">
                              <span className="material-symbols-outlined text-[18px] block">delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="h-64 flex justify-center items-center p-2 relative overflow-hidden bg-white/50 backdrop-blur-sm cursor-pointer group-hover:bg-slate-100 transition-colors" onClick={() => setViewerItem({url, name})} title="Nhấn để xem ảnh lớn">
                      {isPdf ? (
                        <div className="relative w-full h-full overflow-hidden rounded">
                          <iframe src={`${url}#toolbar=0&navpanes=0&scrollbar=0`} className="w-[calc(100%+24px)] h-[calc(100%+24px)] -m-[12px] bg-white pointer-events-none" title={name} tabIndex={-1} />
                          <div className="absolute inset-0 z-10 bg-transparent" />
                        </div>
                      ) : (
                        <img src={url} alt={name} className="w-full h-full object-contain rounded" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">account_tree</span>
              <p className="font-medium text-slate-500 text-lg">Chưa có sơ đồ dự án nào</p>
              <p className="text-sm text-slate-400 mt-2">Hãy bấm vào nút Tải sơ đồ trên thanh tiêu đề</p>
            </div>
          )}

          {/* Portal Button to trigger Modal */}
          {hasPermission(user, 'MANAGE_DOCUMENTS') && portalNode && createPortal(
            <button 
              onClick={() => { setEditingIndex(null); setDiagramName(''); setPendingUrls([]); setResetKey(Date.now()); setIsModalOpen(true); }}
              className="h-[36px] px-4 bg-primary text-white font-bold text-sm rounded-lg hover:bg-blue-800 transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
              Tải sơ đồ
            </button>,
            portalNode
          )}

                    {/* The Upload Modal */}
          <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingIndex !== null ? 'Cập nhật sơ đồ' : 'Upload sơ đồ dự án'} icon="add_a_photo">
            <div className="flex flex-col gap-4 py-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dự án</label>
                <div className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-500 cursor-not-allowed">
                  {project.name}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên sơ đồ</label>
                <input 
                  type="text" 
                  placeholder="Nhập tên sơ đồ (vd: Sơ đồ nguyên lý...)"
                  value={diagramName}
                  onChange={(e) => setDiagramName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sơ đồ dự án *</label>
                <div className="w-full">
                  <FileUpload 
                    key={resetKey}
                    label=""
                    buttonText={editingIndex !== null ? "Tải lại sơ đồ (Thay thế)" : "Tải sơ đồ"}
                    buttonIcon="add_photo_alternate"
                    variant="light"
                    multiple={editingIndex === null}
                    value={pendingUrls} 
                    onChange={handleUpload} 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
                <button 
                  onClick={handleCloseModal} 
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving || pendingUrls.length === 0} 
                  className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  {isSaving ? 'Đang lưu...' : (editingIndex !== null ? 'Cập nhật' : 'Upload')}
                </button>
              </div>
            </div>
          </Modal>

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
