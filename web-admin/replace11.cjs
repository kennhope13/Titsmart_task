const fs = require('fs');
let code = fs.readFileSync('src/pages/FieldLogsPage.tsx', 'utf8');

// Replace Confirm Delete
const startDelete = code.indexOf('{/* Confirm delete */}');
let endDelete = code.indexOf('</div>\r\n        </div>\r\n      )}', startDelete);
if (endDelete === -1) endDelete = code.indexOf('</div>\n        </div>\n      )}', startDelete);
if (startDelete !== -1 && endDelete !== -1) {
  const replaceLen = code.substring(startDelete, endDelete).length + 30;
  const toReplaceDelete = code.substring(startDelete, startDelete + replaceLen);
  
  const newConfirmDelete = `{/* Confirm delete */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message="Xóa báo cáo này? Các ảnh trong báo cáo sẽ bị xóa vĩnh viễn."
        confirmText={isDeleting ? 'Đang xóa...' : 'Xóa báo cáo'}
        icon="delete"
      />`;
  code = code.replace(toReplaceDelete, newConfirmDelete);
  console.log("Replaced Delete Modal");
}

// Replace Upload Modal
const startUpload = code.indexOf('  return (\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">');
let endUpload = -1;
if (startUpload === -1) {
  const startUpload2 = code.indexOf('  return (\r\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">');
  if (startUpload2 !== -1) {
    endUpload = code.indexOf('    </div>\r\n  );\r\n};\r\n', startUpload2);
    if (endUpload !== -1) {
      const toReplaceUpload = code.substring(startUpload2, endUpload + 22);
      replaceUploadStr(toReplaceUpload);
    }
  }
} else {
  endUpload = code.indexOf('    </div>\n  );\n};\n', startUpload);
  if (endUpload !== -1) {
    const toReplaceUpload = code.substring(startUpload, endUpload + 20);
    replaceUploadStr(toReplaceUpload);
  }
}

function replaceUploadStr(oldStr) {
  const newUpload = `  return (
    <Modal isOpen={true} onClose={onClose} title={editLog ? 'Sửa ảnh hiện trường' : 'Upload ảnh hiện trường'} icon="add_a_photo" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {/* Dự án */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Dự án</label>
          <div className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-500 cursor-not-allowed">
            {projects.find(p => p.code === projectCode)?.name || projectCode}
          </div>
        </div>

        {/* Ảnh */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Ảnh hiện trường *</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {previews.map((url, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <img src={url} alt="preview" className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow hover:bg-red-600">
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50 hover:text-primary transition">
              <span className="material-symbols-outlined mb-0.5 text-lg">add_photo_alternate</span>
              <span className="text-[10px] font-bold">Thêm ảnh</span>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
          {files.length > 0 && (
            <p className="mt-2 text-[11px] font-semibold text-slate-500">{files.length} ảnh đã chọn</p>
          )}
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Đầu mục công việc</label>
          <CustomSelect
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
          >
            <option value="">-- Không liên kết --</option>
            {tasks.filter(t => t.projectCode === projectCode).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </CustomSelect>
        </div>

        {/* Ghi chú */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
            placeholder="Mô tả nội dung hiện trường (tùy chọn)..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none resize-none" />
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] font-bold text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={isUploading}
            className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center gap-2">
            {isUploading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Đang lưu...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">upload</span>
                {editLog ? 'Cập nhật' : 'Upload'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};`;
  code = code.replace(oldStr, newUpload);
  console.log("Replaced Upload Modal");
}

if (!code.includes("import { Modal }")) {
  code = code.replace(
    "import { CustomSelect } from '@/components/common/CustomSelect';",
    "import { CustomSelect } from '@/components/common/CustomSelect';\nimport { Modal } from '../components/common/Modal';\nimport { ConfirmModal } from '../components/common/ConfirmModal';"
  );
}

fs.writeFileSync('src/pages/FieldLogsPage.tsx', code);
console.log("Done");
