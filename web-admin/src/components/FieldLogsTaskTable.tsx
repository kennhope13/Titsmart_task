import React, { useMemo, useState } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { FieldLog, Task } from '../types';
import { compareTaskStt } from '../utils/taskTreeUtils';

const CustomLightbox: React.FC<{ images: string[]; index: number; onClose: () => void; onPrev: () => void; onNext: () => void }> = ({
  images, index, onClose, onPrev, onNext,
}) => (
  <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onClose}>
    
                        </>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); onAddLogClick(t.id); }} className="w-10 h-10 rounded flex items-center justify-center border border-dashed border-slate-300 text-slate-400 hover:text-primary hover:border-primary transition-colors hover:bg-primary/5" title="Thêm ảnh">
                          <span className="material-symbols-outlined text-lg">add_a_photo</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <div className="bg-emerald-100 p-3 text-center text-xs font-bold text-emerald-800 border-t border-emerald-200 mt-4">
        --- HẾT DANH SÁCH (Tổng: {groupedTasks.length} mục) ---
      </div>

      {lightboxIndex >= 0 && (
        <CustomLightbox 
          images={lightboxImages.map(img => img.src)} 
          index={lightboxIndex} 
          onClose={() => setLightboxIndex(-1)} 
          onPrev={() => setLightboxIndex(prev => prev - 1)} 
          onNext={() => setLightboxIndex(prev => prev + 1)} 
        />
      )}

      {viewAllLogsTask && (
        <TaskLogsModal
          task={viewAllLogsTask}
          logs={logs.filter(l => l.taskId === viewAllLogsTask.id)}
          onClose={() => setViewAllLogsTask(null)}
          onEditLogClick={(log) => {
            setViewAllLogsTask(null);
            onEditLogClick(log);
          }}
        />
      )}
    </div>
  );
};
