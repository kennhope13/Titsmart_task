import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../services/authStore';
import { useRealtimeStore } from '../../services/realtimeStore';
import { DirectMessage, Engineer, Project } from '../../types';

export const ChatWidget: React.FC = () => {
  const currentUser = useAuthStore(state => state.user);
  const { engineers, projects, directMessages, fetchDirectMessages, sendDirectMessage, markDirectMessageRead, fetchEngineers, fetchProjects } = useRealtimeStore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{ type: 'user' | 'project'; id: string; name: string; avatar?: string } | null>(null);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; type: 'image' | 'file'; name: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDirectMessages();
    fetchEngineers();
    fetchProjects();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [directMessages, isOpen, selectedTarget]);

  if (!currentUser) return null;

  // Lọc tin nhắn của hội thoại hiện tại
  const currentMessages = directMessages.filter(msg => {
    if (!selectedTarget) return false;
    if (selectedTarget.type === 'project') {
      return msg.projectCode === selectedTarget.id;
    } else {
      return (
        (msg.senderId === currentUser.id && msg.receiverId === selectedTarget.id) ||
        (msg.senderId === selectedTarget.id && msg.receiverId === currentUser.id) ||
        (msg.senderId === currentUser.username && msg.receiverId === selectedTarget.id) ||
        (msg.senderId === selectedTarget.id && msg.receiverId === currentUser.username)
      );
    }
  });

  // Tính số tin nhắn chưa đọc
  const unreadCount = directMessages.filter(msg => {
    const isForMe = msg.receiverId === currentUser.id || msg.receiverId === currentUser.username || 
      (msg.projectCode && currentUser.projectCodes?.includes(msg.projectCode));
    const isNotMine = msg.senderId !== currentUser.id && msg.senderId !== currentUser.username;
    const isUnread = !Array.isArray(msg.readBy) || !msg.readBy.includes(currentUser.id);
    return isForMe && isNotMine && isUnread;
  }).length;

  // Đánh dấu đã đọc khi xem tin nhắn
  useEffect(() => {
    if (isOpen && selectedTarget && currentMessages.length > 0) {
      currentMessages.forEach(msg => {
        const isNotMine = msg.senderId !== currentUser.id && msg.senderId !== currentUser.username;
        const isUnread = !Array.isArray(msg.readBy) || !msg.readBy.includes(currentUser.id);
        if (isNotMine && isUnread) {
          markDirectMessageRead(msg.id, currentUser.id);
        }
      });
    }
  }, [isOpen, selectedTarget, currentMessages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !selectedTarget) return;

    const content = inputText.trim() || (selectedFile?.type === 'image' ? 'Đã gửi một hình ảnh' : 'Đã gửi tệp đính kèm');
    const msgData = {
      senderId: currentUser.id || currentUser.username,
      senderName: currentUser.name || currentUser.username,
      senderAvatar: currentUser.avatar,
      receiverId: selectedTarget.type === 'user' ? selectedTarget.id : undefined,
      projectCode: selectedTarget.type === 'project' ? selectedTarget.id : undefined,
      content,
      fileUrl: selectedFile?.url,
      fileType: selectedFile?.type,
    };

    setInputText('');
    setSelectedFile(null);

    try {
      await sendDirectMessage(msgData);
      scrollToBottom();
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const isImg = file.type.startsWith('image/');
      // Giả lập đọc file dạng Data URL hoặc upload
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFile({
          url: reader.result as string,
          type: isImg ? 'image' : 'file',
          name: file.name
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  // Danh sách người dùng khác (trừ bản thân)
  const otherUsers = engineers.filter(e => e.id !== currentUser.id && e.username !== currentUser.username);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto">
      {/* Cửa sổ Chat */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[520px] bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">forum</span>
              <span className="font-bold text-[15px]">Nội bộ Titsmart</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar danh sách hội thoại */}
            <div className="w-[140px] border-r border-slate-100 bg-slate-50 flex flex-col overflow-y-auto">
              <div className="p-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Nhóm Dự Án</div>
              {projects.map(p => {
                const isSelected = selectedTarget?.type === 'project' && selectedTarget.id === p.code;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedTarget({ type: 'project', id: p.code, name: p.name })}
                    className={`w-full text-left px-2.5 py-2 text-[12px] truncate font-medium transition-colors ${isSelected ? 'bg-blue-100 text-blue-900 font-bold border-r-2 border-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    🏢 {p.code}
                  </button>
                );
              })}

              <div className="p-2 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Đồng Nghiệp</div>
              {otherUsers.map(u => {
                const isSelected = selectedTarget?.type === 'user' && selectedTarget.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedTarget({ type: 'user', id: u.id, name: u.name, avatar: u.avatar })}
                    className={`w-full text-left px-2.5 py-2 text-[12px] truncate font-medium flex items-center gap-1.5 transition-colors ${isSelected ? 'bg-blue-100 text-blue-900 font-bold border-r-2 border-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate">{u.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Khung nội dung hội thoại */}
            <div className="flex-1 flex flex-col bg-white">
              {selectedTarget ? (
                <>
                  {/* Target Header */}
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-[13px] text-slate-800 truncate">
                      {selectedTarget.type === 'project' ? `🏢 ${selectedTarget.name}` : `👤 ${selectedTarget.name}`}
                    </span>
                  </div>

                  {/* Danh sách tin nhắn */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50">
                    {currentMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-[12px]">
                        <span className="material-symbols-outlined text-[32px] mb-1">chat_bubble_outline</span>
                        <span>Chưa có tin nhắn nào.</span>
                        <span>Hãy gửi tin nhắn đầu tiên!</span>
                      </div>
                    ) : (
                      currentMessages.map(msg => {
                        const isMe = msg.senderId === currentUser.id || msg.senderId === currentUser.username;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                              {!isMe && <span className="font-semibold text-slate-600">{msg.senderName}</span>}
                              <span>{new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`max-w-[85%] px-3 py-2 rounded-md text-[13px] leading-relaxed shadow-sm ${isMe ? 'bg-blue-900 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                              {msg.content}
                              {msg.fileUrl && (
                                <div className="mt-1.5">
                                  {msg.fileType === 'image' ? (
                                    <img src={msg.fileUrl} alt="attachment" className="max-w-full max-h-[160px] rounded object-cover border" />
                                  ) : (
                                    <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="underline text-blue-300 text-[11px] block truncate">
                                      📁 Tệp đính kèm
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input bar */}
                  <form onSubmit={handleSend} className="p-2 border-t border-slate-100 bg-white flex flex-col gap-1">
                    {selectedFile && (
                      <div className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded text-[11px] text-blue-900">
                        <span className="truncate max-w-[200px]">📎 {selectedFile.name}</span>
                        <button type="button" onClick={() => setSelectedFile(null)} className="text-red-500 font-bold ml-2">✕</button>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors"
                        title="Đính kèm ảnh/file"
                      >
                        <span className="material-symbols-outlined text-[20px]">attach_file</span>
                      </button>
                      <input
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 px-3 py-1.5 text-[13px] bg-slate-100 border border-slate-200 rounded focus:bg-white focus:border-blue-900 outline-none transition-all"
                      />
                      <button
                        type="submit"
                        disabled={!inputText.trim() && !selectedFile}
                        className="p-1.5 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-40 disabled:hover:bg-blue-900 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">send</span>
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-400 text-[12px]">
                  <span className="material-symbols-outlined text-[40px] text-slate-300 mb-2">forum</span>
                  <span className="font-semibold text-slate-600 mb-1">Chào {currentUser.name}!</span>
                  <span>Chọn một Nhóm Dự Án hoặc Đồng Nghiệp ở cột bên trái để bắt đầu trò chuyện.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Button kích hoạt Chat nổi (chỉ hiện khi form tin nhắn đóng) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-12 h-12 rounded-lg bg-blue-900 text-white shadow-xl flex items-center justify-center hover:bg-blue-800 hover:scale-105 active:scale-95 transition-all duration-200"
          title="Nội bộ Titsmart"
        >
          <span className="material-symbols-outlined text-[24px]">
            chat
          </span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
