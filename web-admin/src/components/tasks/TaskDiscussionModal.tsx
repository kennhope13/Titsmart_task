import React, { useState, useEffect, useRef } from 'react';
import { Task } from '../../types';
import { TaskDiscussionItem, parseTaskDiscussions } from '../../utils/taskDiscussion';
import { useAuthStore } from '../../services/authStore';
import { Modal } from '../common/Modal';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const discussions: TaskDiscussionItem[] = task ? parseTaskDiscussions(task.notes, task.issue) : [];

  useEffect(() => {
    if (isOpen) {
      setInputText('');
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

  const handleQuestionSubmit = async () => {
    if (!inputText.trim() || !onSendQuestion) return;
    setIsSubmitting(true);
    try {
      await onSendQuestion(task, inputText.trim());
      setInputText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!inputText.trim() || !onSendReply) return;
    setIsSubmitting(true);
    try {
      await onSendReply(task, inputText.trim());
      setInputText('');
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
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* KHUNG NHẬP THẮC MẮC (CHO NGƯỜI NHẬN VIỆC) */}
        {isAssignee && (isWaitingAccept || hasQuestion) && (
          <div className="space-y-1.5 animate-in fade-in duration-150 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-orange-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-orange-600">help</span>
                Nội dung thắc mắc / Cần làm rõ: <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium italic">
                Enter để gửi, Shift + Enter xuống dòng
              </span>
            </div>
            <textarea 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleQuestionSubmit();
                }
              }}
              placeholder="Nhập chi tiết nội dung bạn chưa rõ, tài liệu cần bổ sung..."
              rows={3}
              className="w-full text-xs p-3 border border-orange-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white text-slate-800 resize-none font-medium"
            />
          </div>
        )}

        {/* KHUNG NHẬP PHẢN HỒI (CHO NGƯỜI GIAO VIỆC) */}
        {isAssigner && (hasQuestion || isWaitingAccept) && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-primary">reply</span>
                {hasQuestion ? 'Phản hồi giải đáp thắc mắc & Giao lại việc:' : 'Ghi chú / Hướng dẫn công việc:'}
              </label>
              <span className="text-[10px] text-slate-400 font-medium italic">
                Enter để gửi, Shift + Enter xuống dòng
              </span>
            </div>
            <textarea 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReplySubmit();
                }
              }}
              placeholder="Nhập nội dung giải đáp, tiêu chuẩn kỹ thuật hoặc yêu cầu chi tiết..."
              rows={3}
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-slate-800 resize-none font-medium"
            />
          </div>
        )}

        {/* KHUNG NHẬP TRAO ĐỔI CHUNG CHO CÁC TRẠNG THÁI KHÁC */}
        {(!isAssignee || isDoing) && (!isAssigner || (!hasQuestion && !isWaitingAccept && !isWaitingApproval)) && !isCompleted && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Ghi chú / Trao đổi thêm:</label>
              <span className="text-[10px] text-slate-400 font-medium italic">
                Enter để gửi, Shift + Enter xuống dòng
              </span>
            </div>
            <div className="flex gap-2">
              <textarea 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Nhập nội dung trao đổi..."
                rows={2}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (isAssigner && onSendReply) handleReplySubmit();
                    else if (onSendQuestion) handleQuestionSubmit();
                  }
                }}
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (isAssigner && onSendReply) handleReplySubmit();
                  else if (onSendQuestion) handleQuestionSubmit();
                }}
                disabled={isSubmitting || !inputText.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-end"
              >
                <span className="material-symbols-outlined text-base">send</span>
                Gửi
              </button>
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
