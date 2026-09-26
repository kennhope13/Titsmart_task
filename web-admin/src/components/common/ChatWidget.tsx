import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../services/authStore';
import { useRealtimeStore } from '../../services/realtimeStore';
import { useUIStore } from '../../services/uiStore';
import { DirectMessage, Engineer, Project } from '../../types';
import { supabase } from '../../lib/supabase';
import { uploadAttachment } from '../../utils/fileUploadHelper';

export const ChatWidget: React.FC = () => {
  const currentUser = useAuthStore(state => state.user);
  const showChatWidget = useUIStore(state => state.showChatWidget);
  const { engineers, projects, directMessages, fetchDirectMessages, sendDirectMessage, markDirectMessageRead, fetchEngineers, fetchProjects } = useRealtimeStore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{ type: 'user' | 'project'; id: string; name: string; avatar?: string } | null>(null);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; type: 'image' | 'file'; name: string } | null>(null);
  // Mobile: show contact list panel or message panel
  const [mobileView, setMobileView] = useState<'contacts' | 'messages'>('contacts');
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);
  const [isColleaguesCollapsed, setIsColleaguesCollapsed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Dragging functionality state & refs (transient per session, resets to default on reload)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({ startX: 0, startY: 0, initX: 0, initY: 0 });
  const hasMovedRef = useRef(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const btnElem = buttonRef.current;
    if (!btnElem) return;

    const rect = btnElem.getBoundingClientRect();
    const currentX = position ? position.x : rect.left;
    const currentY = position ? position.y : rect.top;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
    };

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 60, dragStartRef.current.initX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 60, dragStartRef.current.initY + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {}
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.stopPropagation();
      return;
    }
    setIsOpen(true);
  };

  useEffect(() => {
    const clampPos = () => {
      setPosition(prev => {
        if (!prev) return null;
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;
        const clampedX = Math.max(10, Math.min(maxX, prev.x));
        const clampedY = Math.max(10, Math.min(maxY, prev.y));
        if (clampedX !== prev.x || clampedY !== prev.y) {
          return { x: clampedX, y: clampedY };
        }
        return prev;
      });
    };

    clampPos();
    window.addEventListener('resize', clampPos);
    return () => window.removeEventListener('resize', clampPos);
  }, []);

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    fetchDirectMessages();
    fetchEngineers();
    fetchProjects();

    const interval = setInterval(() => {
      fetchDirectMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Supabase Presence tracking for real-time online status
  useEffect(() => {
    if (!currentUser) return;

    const presenceChannel = supabase.channel('titsmart-online-users', {
      config: { presence: { key: currentUser.username || currentUser.id } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeIds: string[] = [];
        Object.values(state).forEach((presences: any) => {
          if (Array.isArray(presences)) {
            presences.forEach((p: any) => {
              if (p.userId) activeIds.push(p.userId);
              if (p.username) activeIds.push(p.username);
              if (p.name) activeIds.push(p.name);
            });
          }
        });
        setOnlineUserIds(Array.from(new Set(activeIds)));
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: currentUser.id,
            username: currentUser.username,
            name: currentUser.name,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [directMessages, isOpen, selectedTarget]);

  // Auto-focus input on mobile when switching to messages view
  useEffect(() => {
    if (isOpen && mobileView === 'messages' && selectedTarget) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [mobileView, selectedTarget]);

  // Filter messages for current conversation
  const currentMessages = directMessages.filter(msg => {
    if (!selectedTarget || !currentUser) return false;
    if (selectedTarget.type === 'project') {
      return String(msg.projectCode || '').trim().toUpperCase() === String(selectedTarget.id || '').trim().toUpperCase();
    } else {
      const myIds = [currentUser.id, currentUser.username, currentUser.name].filter(Boolean).map(s => String(s).trim().toLowerCase());
      const targetObj = selectedTarget as any;
      const targetIds = [selectedTarget.id, targetObj.username, targetObj.name].filter(Boolean).map(s => String(s).trim().toLowerCase());

      const sId = String(msg.senderId || '').trim().toLowerCase();
      const rId = String(msg.receiverId || '').trim().toLowerCase();

      const isSenderMe = myIds.includes(sId);
      const isReceiverMe = myIds.includes(rId);
      const isSenderTarget = targetIds.includes(sId);
      const isReceiverTarget = targetIds.includes(rId);

      return (isSenderMe && isReceiverTarget) || (isSenderTarget && isReceiverMe);
    }
  });

  // Other users excluding self
  const otherUsers = React.useMemo(() => {
    if (!currentUser) return [];
    const myIds = [currentUser.id, currentUser.username, currentUser.name].filter(Boolean).map(s => String(s).trim().toLowerCase());
    return engineers.filter(e => {
      const eIds = [e.id, e.username, e.name].filter(Boolean).map(s => String(s).trim().toLowerCase());
      return !myIds.some(myId => eIds.includes(myId));
    });
  }, [engineers, currentUser]);

  // Unread count per conversation (for badge in contact list)
  const getUnreadForTarget = React.useCallback((type: 'user' | 'project', id: string, username?: string, targetName?: string) => {
    if (!currentUser) return 0;
    const myIds = [currentUser.id, currentUser.username, currentUser.name].filter(Boolean).map(s => String(s).trim().toLowerCase());

    return directMessages.filter(msg => {
      const sId = String(msg.senderId || '').trim().toLowerCase();
      const rId = String(msg.receiverId || '').trim().toLowerCase();
      const isNotMine = !myIds.includes(sId);

      const readArray = (Array.isArray(msg.readBy) ? msg.readBy : []).map(s => String(s).trim().toLowerCase());
      const isUnread = !myIds.some(myId => readArray.includes(myId));

      if (!isNotMine || !isUnread) return false;

      if (type === 'project') {
        return String(msg.projectCode || '').trim().toUpperCase() === String(id || '').trim().toUpperCase();
      }

      const targetIds = [id, username, targetName].filter(Boolean).map(s => String(s).trim().toLowerCase());
      const isFromTarget = targetIds.includes(sId);
      const isToMe = myIds.includes(rId);
      return isFromTarget && isToMe;
    }).length;
  }, [directMessages, currentUser]);

  // Section unread counts
  const projectsUnreadCount = React.useMemo(() => {
    if (!currentUser) return 0;
    return projects.reduce((sum, p) => sum + getUnreadForTarget('project', p.code), 0);
  }, [projects, getUnreadForTarget, currentUser]);

  const colleaguesUnreadCount = React.useMemo(() => {
    if (!currentUser) return 0;
    return otherUsers.reduce((sum, u) => sum + getUnreadForTarget('user', u.id, u.username, u.name), 0);
  }, [otherUsers, getUnreadForTarget, currentUser]);

  // Total unread count strictly matches the sum of unread across openable project groups and colleagues
  const unreadCount = React.useMemo(() => {
    return projectsUnreadCount + colleaguesUnreadCount;
  }, [projectsUnreadCount, colleaguesUnreadCount]);

  // Mark as read when viewing
  useEffect(() => {
    if (!currentUser || !isOpen || !selectedTarget || currentMessages.length === 0) return;
    const myIds = [currentUser.id, currentUser.username, currentUser.name].filter(Boolean);
    const myIdToMark = currentUser.username || currentUser.id;

    currentMessages.forEach(msg => {
      const isNotMine = !myIds.includes(msg.senderId);
      const readArray = Array.isArray(msg.readBy) ? msg.readBy : [];
      const isUnread = !myIds.some(myId => readArray.includes(myId));
      if (isNotMine && isUnread) {
        markDirectMessageRead(msg.id, myIdToMark);
      }
    });
  }, [isOpen, selectedTarget, currentMessages.length, currentUser, markDirectMessageRead]);

  if (!currentUser) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !selectedTarget) return;

    const content = inputText.trim() || (selectedFile?.type === 'file' ? `Đã gửi tệp: ${selectedFile?.name || 'đính kèm'}` : '');
    const msgData = {
      senderId: currentUser.username || currentUser.id,
      senderName: currentUser.name || currentUser.username,
      senderAvatar: currentUser.avatar,
      receiverId: selectedTarget.type === 'user' ? ((selectedTarget as any).username || selectedTarget.id) : undefined,
      projectCode: selectedTarget.type === 'project' ? selectedTarget.id : undefined,
      content,
      fileUrl: selectedFile?.url,
      fileType: selectedFile?.type,
      fileName: selectedFile?.name,
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
      const result = await uploadAttachment(file, 'chat');
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
            const result = await uploadAttachment(file, 'chat');
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

  const handleSelectTarget = (target: { type: 'user' | 'project'; id: string; username?: string; name: string; avatar?: string }) => {
    setSelectedTarget(target);
    setMobileView('messages');
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedTarget(null);
    setMobileView('contacts');
  };

  const renderContactList = () => (
    <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
      {/* NHÓM DỰ ÁN */}
      <button
        type="button"
        onClick={() => setIsProjectsCollapsed(!isProjectsCollapsed)}
        className="w-full px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border-b border-slate-200 flex items-center justify-between hover:bg-slate-200/80 transition-colors cursor-pointer select-none sticky top-0 z-10"
      >
        <span className="flex items-center gap-1.5">
          <span>Nhóm Dự Án</span>
          <span className="text-[10px] text-slate-500 font-normal">({projects.length})</span>
        </span>
        <div className="flex items-center gap-1.5">
          {isProjectsCollapsed && projectsUnreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none shadow-xs">
              {projectsUnreadCount > 9 ? '9+' : projectsUnreadCount}
            </span>
          )}
          <span className={`material-symbols-outlined text-blue-900 text-[18px] transition-transform duration-200 ${isProjectsCollapsed ? '-rotate-90' : 'rotate-0'}`}>
            expand_more
          </span>
        </div>
      </button>

      {!isProjectsCollapsed && projects.map(p => {
        const isSelected = selectedTarget?.type === 'project' && selectedTarget.id === p.code;
        const unread = getUnreadForTarget('project', p.code);
        return (
          <button
            key={p.id}
            onClick={() => handleSelectTarget({ type: 'project', id: p.code, name: p.name })}
            className={`w-full text-left px-4 py-3 text-[13px] flex items-center gap-3 border-b border-slate-50 transition-colors ${isSelected ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'}`}
          >
            <span className="text-base shrink-0">🏢</span>
            <span className="flex-1 truncate font-medium">{p.name || p.code}</span>
            {unread > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
            <span className="material-symbols-outlined text-slate-300 text-[16px] shrink-0">chevron_right</span>
          </button>
        );
      })}

      {/* ĐỒNG NGHIỆP */}
      <button
        type="button"
        onClick={() => setIsColleaguesCollapsed(!isColleaguesCollapsed)}
        className="w-full px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border-b border-slate-200 border-t border-t-slate-200 flex items-center justify-between hover:bg-slate-200/80 transition-colors cursor-pointer select-none sticky top-0 z-10"
      >
        <span className="flex items-center gap-1.5">
          <span>Đồng Nghiệp</span>
          <span className="text-[10px] text-slate-500 font-normal">({otherUsers.length})</span>
        </span>
        <div className="flex items-center gap-1.5">
          {isColleaguesCollapsed && colleaguesUnreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none shadow-xs">
              {colleaguesUnreadCount > 9 ? '9+' : colleaguesUnreadCount}
            </span>
          )}
          <span className={`material-symbols-outlined text-blue-900 text-[18px] transition-transform duration-200 ${isColleaguesCollapsed ? '-rotate-90' : 'rotate-0'}`}>
            expand_more
          </span>
        </div>
      </button>

      {!isColleaguesCollapsed && (
        <>
          {otherUsers.length === 0 && (
            <div className="px-4 py-4 text-[12px] text-slate-400 text-center">Chưa có đồng nghiệp nào.</div>
          )}
          {otherUsers.map(u => {
            const isSelected = selectedTarget?.type === 'user' && (selectedTarget.id === u.id || (selectedTarget as any).username === u.username);
            const unread = getUnreadForTarget('user', u.id, u.username, u.name);
            const isOnline = Boolean(
              (u.id && onlineUserIds.includes(u.id)) ||
              (u.username && onlineUserIds.includes(u.username)) ||
              (u.name && onlineUserIds.includes(u.name))
            );
            return (
              <button
                key={u.id}
                onClick={() => handleSelectTarget({ type: 'user', id: u.id, username: u.username, name: u.name, avatar: u.avatar })}
                className={`w-full text-left px-4 py-3 text-[13px] flex items-center gap-3 border-b border-slate-50 transition-colors ${isSelected ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'}`}
              >
                <div className="relative shrink-0">
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-[13px] font-bold">
                      {u.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
                <span className="flex-1 truncate font-medium">{u.name}</span>
                {unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
                <span className="material-symbols-outlined text-slate-300 text-[16px] shrink-0">chevron_right</span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );

  if (!showChatWidget || !currentUser) return null;

  return (
    <div className="fixed z-[9999] pointer-events-none" style={{ inset: 0 }}>
      {/* ===== MOBILE: Full-screen modal ===== */}
      {isOpen && (
        <div className="sm:hidden fixed inset-0 z-[9999] flex flex-col bg-white pointer-events-auto"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {/* Header */}
          <div className="bg-blue-900 text-white px-4 flex items-center justify-between shadow-md shrink-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 10px)', paddingBottom: '12px' }}>
            <div className="flex items-center gap-2">
              {mobileView === 'messages' && (
                <button
                  onClick={() => setMobileView('contacts')}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors mr-1"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
              )}
              <span className="material-symbols-outlined text-[20px]">forum</span>
              <span className="font-bold text-[15px]">
                {mobileView === 'messages' && selectedTarget
                  ? selectedTarget.name
                  : 'Nội bộ Titsmart'}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {mobileView === 'contacts' ? (
              renderContactList()
            ) : selectedTarget ? (
              <>
                <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50">
                  {currentMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-[12px]">
                      <span className="material-symbols-outlined text-[40px] mb-2 text-slate-300">chat_bubble_outline</span>
                      <span className="font-semibold">Chưa có tin nhắn nào.</span>
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
                          <div className={`max-w-[85%] rounded-xl text-[13px] leading-relaxed shadow-xs transition-all ${
                            msg.fileUrl && msg.fileType === 'image' && !msg.content
                              ? 'p-1 bg-transparent border-0'
                              : isMe
                                ? 'px-3 py-2 bg-blue-900 text-white'
                                : 'px-3 py-2 bg-white text-slate-800 border border-slate-200'
                          }`}>
                            {msg.content && <p>{msg.content}</p>}
                            {msg.fileUrl && (
                              <div className={msg.content ? "mt-1.5" : ""}>
                                {msg.fileType === 'image' ? (
                                  <img
                                    src={msg.fileUrl}
                                    alt={msg.fileName || 'Ảnh đính kèm'}
                                    onClick={() => setPreviewImage(msg.fileUrl || null)}
                                    className="max-w-full max-h-[220px] rounded-lg object-contain border border-slate-200/80 bg-slate-50 cursor-pointer hover:opacity-95 transition-opacity shadow-xs"
                                  />
                                ) : (
                                  <a
                                    href={msg.fileUrl}
                                    download={msg.fileName || 'file_dinh_kem'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${isMe ? 'bg-blue-800/80 hover:bg-blue-800 border-blue-700 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'}`}
                                  >
                                    <span className="material-symbols-outlined text-[24px] text-amber-400 shrink-0">
                                      {msg.fileName?.endsWith('.pdf') ? 'picture_as_pdf' :
                                       msg.fileName?.match(/\.(xlsx|xls|csv)$/i) ? 'table_view' :
                                       msg.fileName?.match(/\.(docx|doc)$/i) ? 'description' :
                                       msg.fileName?.match(/\.(zip|rar|7z)$/i) ? 'folder_zip' :
                                       msg.fileName?.match(/\.(dwg|dxf)$/i) ? 'architecture' : 'insert_drive_file'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-[12px] truncate leading-tight">
                                        {msg.fileName || 'Tệp đính kèm'}
                                      </p>
                                      <span className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>Nhấn để tải về / xem</span>
                                    </div>
                                    <span className="material-symbols-outlined text-[18px] opacity-75 shrink-0">download</span>
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

                <form onSubmit={handleSend} className="p-2 border-t border-slate-100 bg-white flex flex-col gap-1 shrink-0 relative">
                  {selectedFile && (
                    <div className="flex items-center justify-between bg-blue-50 px-2.5 py-1.5 rounded-lg text-[11px] text-blue-900 border border-blue-100">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-blue-700 shrink-0">
                          {selectedFile.type === 'image' ? 'image' : 'attach_file'}
                        </span>
                        <span className="truncate font-medium max-w-[220px]">{selectedFile.name}</span>
                      </div>
                      <button type="button" onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">✕</button>
                    </div>
                  )}

                  {/* Attachment Choice Menu (Camera / Gallery / Files) */}
                  {showAttachMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                      <div className="absolute bottom-14 left-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 flex flex-col gap-1 min-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            cameraInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left"
                        >
                          <span className="material-symbols-outlined text-emerald-600 text-[20px]">photo_camera</span>
                          <span>Chụp ảnh mới</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            imageInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left"
                        >
                          <span className="material-symbols-outlined text-blue-600 text-[20px]">image</span>
                          <span>Thư viện ảnh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            fileInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left"
                        >
                          <span className="material-symbols-outlined text-amber-500 text-[20px]">folder_open</span>
                          <span>Tệp tài liệu</span>
                        </button>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-1.5">
                    {/* Native Inputs */}
                    <input type="file" ref={cameraInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" capture="environment" />
                    <input type="file" ref={imageInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="*/*" />

                    <button
                      type="button"
                      onClick={() => setShowAttachMenu(!showAttachMenu)}
                      disabled={isUploading}
                      className={`p-1.5 rounded transition-colors ${showAttachMenu ? 'text-blue-900 bg-blue-100' : 'text-slate-400 hover:text-blue-900 hover:bg-slate-100'}`}
                      title="Đính kèm ảnh / máy ảnh / tài liệu"
                    >
                      <span className="material-symbols-outlined text-[20px]">attach_file</span>
                    </button>
                    <input
                      type="text"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onPaste={handlePaste}
                      placeholder="Nhập tin nhắn..."
                      className="flex-1 px-3 py-1.5 text-[13px] bg-slate-100 border border-slate-200 rounded focus:bg-white focus:border-blue-900 outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() && !selectedFile}
                      className="px-2.5 py-1.5 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-40 transition-colors shrink-0 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 text-[13px]">
                <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3">forum</span>
                <span className="font-semibold text-slate-600 mb-1">Chào {currentUser.name}!</span>
                <span>Chọn một cuộc hội thoại để bắt đầu.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== DESKTOP: Floating panel ===== */}
      <div className="hidden sm:flex fixed bottom-5 right-5 z-50 flex-col items-end pointer-events-auto">
        {isOpen && (
          <div className="w-[660px] max-w-[calc(100vw-40px)] h-[580px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">forum</span>
                <span className="font-bold text-[15px]">Nội bộ Titsmart</span>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Contact sidebar */}
              <div className="w-[250px] border-r border-slate-100 bg-slate-50 flex flex-col overflow-y-auto shrink-0 custom-scrollbar">
                {/* NHÓM DỰ ÁN */}
                <button
                  type="button"
                  onClick={() => setIsProjectsCollapsed(!isProjectsCollapsed)}
                  className="w-full px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border-b border-slate-200 flex items-center justify-between hover:bg-slate-200/80 transition-colors cursor-pointer select-none sticky top-0 z-10"
                >
                  <span className="flex items-center gap-1">
                    <span>Nhóm Dự Án</span>
                    <span className="text-[9px] text-slate-500 font-normal">({projects.length})</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {isProjectsCollapsed && projectsUnreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                        {projectsUnreadCount > 9 ? '9+' : projectsUnreadCount}
                      </span>
                    )}
                    <span className={`material-symbols-outlined text-blue-900 text-[16px] transition-transform duration-200 ${isProjectsCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                      expand_more
                    </span>
                  </div>
                </button>

                {!isProjectsCollapsed && projects.map(p => {
                  const isSelected = selectedTarget?.type === 'project' && selectedTarget.id === p.code;
                  const unread = getUnreadForTarget('project', p.code);
                  const displayName = p.name || p.code;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectTarget({ type: 'project', id: p.code, name: p.name })}
                      className={`w-full text-left px-2.5 py-2 text-[12px] font-medium transition-colors flex items-start gap-1.5 ${isSelected ? 'bg-blue-100 text-blue-900 font-bold border-r-2 border-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                      title={displayName}
                    >
                      <span className="shrink-0 mt-0.5">🏢</span>
                      <span className="flex-1 leading-snug break-words">{displayName}</span>
                      {unread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{unread}</span>
                      )}
                    </button>
                  );
                })}

                {/* ĐỒNG NGHIỆP */}
                <button
                  type="button"
                  onClick={() => setIsColleaguesCollapsed(!isColleaguesCollapsed)}
                  className="w-full px-2.5 py-2 mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border-b border-slate-200 border-t border-t-slate-200 flex items-center justify-between hover:bg-slate-200/80 transition-colors cursor-pointer select-none sticky top-0 z-10"
                >
                  <span className="flex items-center gap-1">
                    <span>Đồng Nghiệp</span>
                    <span className="text-[9px] text-slate-500 font-normal">({otherUsers.length})</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {isColleaguesCollapsed && colleaguesUnreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                        {colleaguesUnreadCount > 9 ? '9+' : colleaguesUnreadCount}
                      </span>
                    )}
                    <span className={`material-symbols-outlined text-blue-900 text-[16px] transition-transform duration-200 ${isColleaguesCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                      expand_more
                    </span>
                  </div>
                </button>

                {!isColleaguesCollapsed && (
                  <>
                    {otherUsers.length === 0 && (
                      <div className="px-3 py-3 text-[11px] text-slate-400 text-center">Chưa có đồng nghiệp.</div>
                    )}
                    {otherUsers.map(u => {
                      const isSelected = selectedTarget?.type === 'user' && (selectedTarget.id === u.id || (selectedTarget as any).username === u.username);
                      const unread = getUnreadForTarget('user', u.id, u.username, u.name);
                      const isOnline = Boolean(
                        (u.id && onlineUserIds.includes(u.id)) ||
                        (u.username && onlineUserIds.includes(u.username)) ||
                        (u.name && onlineUserIds.includes(u.name))
                      );
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleSelectTarget({ type: 'user', id: u.id, username: u.username, name: u.name, avatar: u.avatar })}
                          className={`w-full text-left px-3 py-2.5 text-[13px] truncate font-medium flex items-center gap-2 transition-colors ${isSelected ? 'bg-blue-100 text-blue-900 font-bold border-r-2 border-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="flex-1 truncate">{u.name}</span>
                          {unread > 0 && (
                            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">{unread}</span>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Message panel */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedTarget ? (
                  <>
                    <div className="hidden sm:flex px-3 py-2 bg-slate-50 border-b border-slate-100 items-center shrink-0">
                      <span className="font-bold text-[13px] text-slate-800 truncate flex-1">
                        {selectedTarget.type === 'project' ? `🏢 ${selectedTarget.name}` : `👤 ${selectedTarget.name}`}
                      </span>
                    </div>

                    <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50">
                      {currentMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-[12px]">
                          <span className="material-symbols-outlined text-[32px] mb-1">chat_bubble_outline</span>
                          <span>Chưa có tin nhắn nào.</span>
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
                              <div className={`max-w-[85%] rounded-xl text-[13px] leading-relaxed shadow-xs transition-all ${
                                msg.fileUrl && msg.fileType === 'image' && !msg.content
                                  ? 'p-1 bg-transparent border-0'
                                  : isMe
                                    ? 'px-3 py-2 bg-blue-900 text-white'
                                    : 'px-3 py-2 bg-white text-slate-800 border border-slate-200'
                              }`}>
                                {msg.content && <p>{msg.content}</p>}
                                {msg.fileUrl && (
                                  <div className={msg.content ? "mt-1.5" : ""}>
                                    {msg.fileType === 'image' ? (
                                      <img
                                        src={msg.fileUrl}
                                        alt={msg.fileName || 'Ảnh đính kèm'}
                                        onClick={() => setPreviewImage(msg.fileUrl || null)}
                                        className="max-w-full max-h-[220px] rounded-lg object-contain border border-slate-200/80 bg-slate-50 cursor-pointer hover:opacity-95 transition-opacity shadow-xs"
                                      />
                                    ) : (
                                      <a
                                        href={msg.fileUrl}
                                        download={msg.fileName || 'file_dinh_kem'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${isMe ? 'bg-blue-800/80 hover:bg-blue-800 border-blue-700 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'}`}
                                      >
                                        <span className="material-symbols-outlined text-[24px] text-amber-400 shrink-0">
                                          {msg.fileName?.endsWith('.pdf') ? 'picture_as_pdf' :
                                           msg.fileName?.match(/\.(xlsx|xls|csv)$/i) ? 'table_view' :
                                           msg.fileName?.match(/\.(docx|doc)$/i) ? 'description' :
                                           msg.fileName?.match(/\.(zip|rar|7z)$/i) ? 'folder_zip' :
                                           msg.fileName?.match(/\.(dwg|dxf)$/i) ? 'architecture' : 'insert_drive_file'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-[12px] truncate leading-tight">
                                            {msg.fileName || 'Tệp đính kèm'}
                                          </p>
                                          <span className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>Nhấn để tải về / xem</span>
                                        </div>
                                        <span className="material-symbols-outlined text-[18px] opacity-75 shrink-0">download</span>
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

                    <form onSubmit={handleSend} className="p-2 border-t border-slate-100 bg-white flex flex-col gap-1 shrink-0 relative">
                      {selectedFile && (
                        <div className="flex items-center justify-between bg-blue-50 px-2.5 py-1.5 rounded-lg text-[11px] text-blue-900 border border-blue-100">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-[16px] text-blue-700 shrink-0">
                              {selectedFile.type === 'image' ? 'image' : 'attach_file'}
                            </span>
                            <span className="truncate font-medium max-w-[220px]">{selectedFile.name}</span>
                          </div>
                          <button type="button" onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">✕</button>
                        </div>
                      )}

                      {/* Attachment Choice Menu (Camera / Gallery / Files) */}
                      {showAttachMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                          <div className="absolute bottom-14 left-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 flex flex-col gap-1 min-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachMenu(false);
                                cameraInputRef.current?.click();
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left"
                            >
                              <span className="material-symbols-outlined text-emerald-600 text-[20px]">photo_camera</span>
                              <span>Chụp ảnh mới</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachMenu(false);
                                imageInputRef.current?.click();
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left"
                            >
                              <span className="material-symbols-outlined text-blue-600 text-[20px]">image</span>
                              <span>Thư viện ảnh</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachMenu(false);
                                fileInputRef.current?.click();
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg transition-colors text-left"
                            >
                              <span className="material-symbols-outlined text-amber-500 text-[20px]">folder_open</span>
                              <span>Tệp tài liệu</span>
                            </button>
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-1.5">
                        {/* Native Inputs */}
                        <input type="file" ref={cameraInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" capture="environment" />
                        <input type="file" ref={imageInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="*/*" />

                        <button
                          type="button"
                          onClick={() => setShowAttachMenu(!showAttachMenu)}
                          disabled={isUploading}
                          className={`p-1.5 rounded transition-colors ${showAttachMenu ? 'text-blue-900 bg-blue-100' : 'text-slate-400 hover:text-blue-900 hover:bg-slate-100'}`}
                          title="Đính kèm ảnh / máy ảnh / tài liệu"
                        >
                          <span className="material-symbols-outlined text-[20px]">attach_file</span>
                        </button>
                        <input
                          type="text"
                          value={inputText}
                          onChange={e => setInputText(e.target.value)}
                          onPaste={handlePaste}
                          placeholder="Nhập tin nhắn..."
                          className="flex-1 px-3 py-1.5 text-[13px] bg-slate-100 border border-slate-200 rounded focus:bg-white focus:border-blue-900 outline-none transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!inputText.trim() && !selectedFile}
                          className="px-2.5 py-1.5 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-40 transition-colors shrink-0 flex items-center justify-center"
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
                    <span>Chọn một hội thoại để bắt đầu.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
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

      {/* Draggable Floating Chat Button (Desktop & Mobile) */}
      {!isOpen && (
        <div
          ref={buttonRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={
            position
              ? { position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
              : undefined
          }
          className={`fixed z-[9990] touch-none select-none pointer-events-auto ${
            position
              ? ''
              : 'right-4 sm:right-5 bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] sm:bottom-5'
          }`}
        >
          <button
            type="button"
            onClick={handleButtonClick}
            title="Nội bộ Titsmart (Nhấn giữ & kéo để di chuyển)"
            className="w-12 h-12 rounded-xl bg-blue-900 text-white shadow-xl flex items-center justify-center hover:bg-blue-800 hover:scale-105 active:scale-95 transition-all duration-200 cursor-grab active:cursor-grabbing relative overflow-visible"
          >
            <span className="material-symbols-outlined text-[22px] pointer-events-none">chat</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center border-2 border-white pointer-events-none z-20 shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
