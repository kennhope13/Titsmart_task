import React, { useState, useEffect, useRef } from 'react';
import { Task } from '../../types';
import { TaskDiscussionItem, parseTaskDiscussions } from '../../utils/taskDiscussion';
import { useAuthStore } from '../../services/authStore';
import { Modal } from '../common/Modal';
import { uploadAttachment } from '../../utils/fileUploadHelper';

export interface TaskDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
  isAssigner?: boolean;
  isAssignee?: boolean;
  onAcceptTask?: (task: Task) => void;
  onAccept?: (task: Task) => void;
  onSendQuestion?: (task: Task, question: string) => Promise<void> | void;
  onSendReply?: (task: Task, reply: string) => Promise<void> | void;
  onApproveTask?: (task: Task) => Promise<void> | void;
  onApprove?: (task: Task) => Promise<void> | void;
}

export const TaskDiscussionModal: React.FC<TaskDiscussionModalProps> = ({
  isOpen,
  onClose,
  task,
  currentUserId,
  currentUserName,
  isAssigner: propIsAssigner,
  isAssignee: propIsAssignee,
  onAcceptTask: propOnAcceptTask,
  onAccept: propOnAccept,
  onSendQuestion,
  onSendReply,
  onApproveTask: propOnApproveTask,
  onApprove: propOnApprove,
}) => {
  const authUser = useAuthStore(s => s.user);
  const activeUserId = currentUserId || authUser?.id || '';
  const activeUserName = currentUserName || authUser?.name || authUser?.username || 'Người dùng';
  
  const isAssigner = propIsAssigner !== undefined 
    ? propIsAssigner 
    : (task?.assignerId === activeUserId || authUser?.role === 'admin' || authUser?.username === 'admin');

  const isAssignee = propIsAssignee !== undefined
    ? propIsAssignee
    : (task?.assignedEngineerId === activeUserId || (task?.assignedEngineerName?.includes('|' + activeUserId) ?? false));

  const onAcceptTask = propOnAcceptTask || propOnAccept;
  const onApproveTask = propOnApproveTask || propOnApprove;

  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; type: 'image' | 'file'; name: string } | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const discussions: TaskDiscussionItem[] = task ? parseTaskDiscussions(task.notes, task.issue) : [];

  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setSelectedFile(null);
      setShowAttachMenu(false);
      setIsSubmitting(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, task?.id, discussions.length]);

  if (!isOpen || !task) return null;

  const isWaitingAccept = task.status === 'Chờ nhận việc';
  const hasQuestion = task.status === 'Có thắc mắc';
  const isDoing = task.status === 'Đang làm';
  const isWaitingApproval = task.status === 'Chờ nghiệm thu';
  const isCompleted = task.status === 'Hoàn thành';

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadAttachment(file, 'task_discussions');
      setSelectedFile(result);
    } catch (err) {
      console.error('Lỗi tải file:', err);
      alert('Không thể tải file lên. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setIsUploading(true);
          try {
            const result = await uploadAttachment(file, 'task_discussions');
            setSelectedFile(result);
          } catch (err) {
            console.error('Lỗi tải ảnh từ clipboard:', err);
          } finally {
            setIsUploading(false);
          }
          break;
        }
      }
    }
  };

  const handleQuestionSubmit = async () => {
    if ((!inputText.trim() && !selectedFile) || !onSendQuestion) return;
    setIsSubmitting(true);
    try {
      await (onSendQuestion as any)(task, inputText.trim(), selectedFile || undefined);
      setInputText('');
      setSelectedFile(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async () => {
    if ((!inputText.trim() && !selectedFile) || !onSendReply) return;
    setIsSubmitting(true);
    try {
      await (onSendReply as any)(task, inputText.trim(), selectedFile || undefined);
      setInputText('');
      setSelectedFile(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trao đổi & Hướng dẫn công việc"
      icon="forum"
      size="lg"
      requireConfirmOnClose={false}
    >
      <div className="space-y-4 flex flex-col flex-1">
        {/* THẺ TÓM TẮT THÔNG TIN CÔNG VIỆC */}
        <div className="bg-surface-container-low/80 border border-outline-variant/60 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xs text-primary px-2.5 py-1 bg-white rounded-md border border-blue-200 shadow-2xs">
                {task.projectCode || 'DỰ ÁN'}
              </span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                task.status === 'Chờ nhận việc' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                task.status === 'Có thắc mắc' ? 'bg-orange-500 text-white font-bold shadow-2xs animate-pulse' :
                task.status === 'Đang làm' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                task.status === 'Chờ nghiệm thu' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                task.status === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                'bg-slate-100 text-slate-700'
              }`}>
                {task.status || 'Chưa làm'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600">
              {task.volume !== undefined && task.volume > 0 && (
                <span>Khối lượng: <strong className="text-slate-800">{task.volume} {task.unit || ''}</strong></span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-snug">
              {task.name}
            </h3>
            {task.sectionName && task.sectionName !== task.name && (
              <p className="text-xs text-slate-500 font-medium mt-1">{task.sectionName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-slate-200/80 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-amber-600">person_add</span>
              <span className="text-slate-500">Người giao:</span>
              <strong className="text-slate-800">{task.assignerName || 'Quản lý'}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-primary">engineering</span>
              <span className="text-slate-500">Người nhận:</span>
              <strong className="text-primary">{task.assignedEngineerName?.split('|')[0] || 'Chưa có'}</strong>
            </div>
          </div>
        </div>


        {/* DANH SÁCH LỊCH SỬ TRAO ĐỔI & GHI CHÚ (CHỈ HIỂN THỊ KHI ĐÃ CÓ TRAO ĐỔI / GHI CHÚ) */}
        {discussions.length > 0 && (
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-primary">history</span>
                Luồng trao đổi & Hướng dẫn ({discussions.length})
              </label>
              {task.status === 'Có thắc mắc' && (
                <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Đang chờ phản hồi giải đáp
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {discussions.map((msg, idx) => {
                const isMsgFromMe = (msg.senderId && activeUserId && msg.senderId.toLowerCase() === activeUserId.toLowerCase()) ||
                  (msg.senderName && activeUserName && msg.senderName.toLowerCase().includes(activeUserName.toLowerCase()));

                const isQuestion = msg.type === 'question';
                const isReply = msg.type === 'reply';
                const isAssignNote = msg.type === 'assign_note' || msg.type === 'note';

                const formattedTime = msg.createdAt ? new Date(msg.createdAt).toLocaleString('vi-VN', {
                  hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
                }) : '';

                return (
                  <div 
                    key={msg.id || idx} 
                    className={`flex flex-col ${isMsgFromMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-bold text-slate-800">
                        {msg.senderName}
                      </span>
                      {isAssignNote && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          Ghi chú giao việc
                        </span>
                      )}
                      {isQuestion && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-800 rounded">
                          Thắc mắc
                        </span>
                      )}
                      {isReply && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                          Phản hồi hướng dẫn
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">{formattedTime}</span>
                    </div>

                    <div className={`p-3 rounded-xl max-w-[92%] text-xs leading-relaxed shadow-2xs ${
                      isQuestion
                        ? 'bg-orange-50 border border-orange-200 text-orange-950 font-medium'
                        : isReply
                          ? 'bg-blue-50 border border-blue-200 text-blue-950 font-medium'
                          : isAssignNote
                            ? 'bg-amber-50/90 border border-amber-200 text-slate-900 font-medium'
                            : isMsgFromMe
                              ? 'bg-primary text-white font-medium'
                              : 'bg-white border border-slate-200 text-slate-800 font-medium'
                    }`}>
                      {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                      {msg.fileUrl && (
                        <div className={msg.content ? "mt-2" : ""}>
                          {msg.fileType === 'image' ? (
                            <img
                              src={msg.fileUrl}
                              alt={msg.fileName || 'Ảnh đính kèm'}
                              onClick={() => setPreviewImage(msg.fileUrl || null)}
                              className="max-w-full max-h-[180px] rounded-lg object-contain border border-slate-200/80 bg-white cursor-pointer hover:opacity-95 transition-opacity shadow-xs"
                            />
                          ) : (
                            <a
                              href={msg.fileUrl}
                              download={msg.fileName || 'file_dinh_kem'}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${isMsgFromMe ? 'bg-blue-800/80 hover:bg-blue-800 border-blue-700 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'}`}
                            >
                              <span className="material-symbols-outlined text-[22px] text-amber-500 shrink-0">
                                {msg.fileName?.endsWith('.pdf') ? 'picture_as_pdf' :
                                 msg.fileName?.match(/\.(xlsx|xls|csv)$/i) ? 'table_view' :
                                 msg.fileName?.match(/\.(docx|doc)$/i) ? 'description' :
                                 msg.fileName?.match(/\.(zip|rar|7z)$/i) ? 'folder_zip' :
                                 msg.fileName?.match(/\.(dwg|dxf)$/i) ? 'architecture' : 'insert_drive_file'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[11px] truncate leading-tight">
                                  {msg.fileName || 'Tệp đính kèm'}
                                </p>
                                <span className={`text-[10px] ${isMsgFromMe ? 'text-blue-200' : 'text-slate-400'}`}>Nhấn để tải về / xem</span>
                              </div>
                              <span className="material-symbols-outlined text-[16px] opacity-75 shrink-0">download</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* THAO TÁC ĐÍNH KÈM & NHẬP LIỆU (Ẩn khi task hoàn thành) */}
        {!isCompleted && (
          <div className="space-y-2 pt-2 border-t border-slate-100 relative">
            {/* Thẻ xem trước File đang đính kèm */}
            {selectedFile && (
              <div className="flex items-center justify-between bg-blue-50 px-2.5 py-1.5 rounded-lg text-[11px] text-blue-900 border border-blue-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="material-symbols-outlined text-[16px] text-blue-700 shrink-0">
                    {selectedFile.type === 'image' ? 'image' : 'attach_file'}
                  </span>
                  <span className="truncate font-medium max-w-[280px]">{selectedFile.name}</span>
                </div>
                <button type="button" onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">✕</button>
              </div>
            )}

            {/* Menu đính kèm Camera / Gallery / Files */}
            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                <div className="absolute bottom-16 left-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 flex flex-col gap-1 min-w-[170px] animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      cameraInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">photo_camera</span>
                    <span>Chụp ảnh mới</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      imageInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-blue-600 text-[18px]">image</span>
                    <span>Thư viện ảnh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-amber-500 text-[18px]">folder_open</span>
                    <span>Tệp tài liệu</span>
                  </button>
                </div>
              </>
            )}

            {/* Hidden Native File Inputs */}
            <input type="file" ref={cameraInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" capture="environment" />
            <input type="file" ref={imageInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="*/*" />

            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-primary">
                  {isAssignee && (isWaitingAccept || hasQuestion) ? 'help' : 'chat'}
                </span>
                {isAssignee && (isWaitingAccept || hasQuestion)
                  ? 'Nội dung thắc mắc / Cần làm rõ:'
                  : isAssigner && (hasQuestion || isWaitingAccept)
                    ? 'Phản hồi giải đáp thắc mắc & Giao lại việc:'
                    : 'Ghi chú / Trao đổi thêm:'}
              </label>
              <span className="text-[10px] text-slate-400 font-medium italic">
                Enter để gửi, Shift + Enter xuống dòng
              </span>
            </div>

            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className={`p-2 rounded-xl border transition-colors shrink-0 mt-0.5 cursor-pointer ${showAttachMenu ? 'bg-blue-100 border-blue-300 text-blue-900' : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-600 hover:text-blue-900'}`}
                title="Đính kèm ảnh / máy ảnh / tệp tin"
              >
                <span className="material-symbols-outlined text-[20px]">attach_file</span>
              </button>

              <textarea 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (isAssignee && (isWaitingAccept || hasQuestion)) handleQuestionSubmit();
                    else if (isAssigner && (hasQuestion || isWaitingAccept)) handleReplySubmit();
                    else if (isAssigner && onSendReply) handleReplySubmit();
                    else if (onSendQuestion) handleQuestionSubmit();
                  }
                }}
                placeholder="Nhập nội dung trao đổi, đính kèm ảnh hoặc tệp tin..."
                rows={2}
                className="flex-1 text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-slate-800 resize-none font-medium"
              />
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4 pointer-events-auto animate-fade-in"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 text-white bg-black/50 hover:bg-black/80 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/20"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* FOOTER NÚT BẤM THAO TÁC */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          {isAssignee && (isWaitingAccept || hasQuestion) ? (
            <>
              <button 
                type="button"
                onClick={onClose} 
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Đóng
              </button>
              <button 
                type="button"
                onClick={handleQuestionSubmit}
                disabled={isSubmitting || !inputText.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">send</span>
                {isSubmitting ? 'Đang gửi...' : 'Gửi thắc mắc'}
              </button>
              {onAcceptTask && isWaitingAccept && (
                <button 
                  type="button"
                  onClick={() => {
                    onAcceptTask(task);
                    onClose();
                  }} 
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Xác nhận nhận việc
                </button>
              )}
            </>
          ) : isAssigner && (hasQuestion || isWaitingAccept) ? (

            <>
              <button 
                type="button"
                onClick={onClose} 
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Đóng
              </button>
              <button 
                type="button"
                onClick={handleReplySubmit}
                disabled={isSubmitting || !inputText.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">send</span>
                {hasQuestion ? 'Phản hồi & Giao lại việc' : 'Lưu ghi chú'}
              </button>
            </>
          ) : isAssigner && isWaitingApproval && onApproveTask ? (
            <>
              <button 
                type="button"
                onClick={onClose} 
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Đóng
              </button>
              <button 
                type="button"
                onClick={async () => {
                  await onApproveTask(task);
                  onClose();
                }} 
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">verified</span>
                Nghiệm thu hoàn thành
              </button>
            </>
          ) : (
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
