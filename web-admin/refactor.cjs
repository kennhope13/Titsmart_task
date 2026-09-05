const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectDiagramTab.tsx', 'utf8');

const regex = /\{\/\* The Upload Modal \*\/\}\s*\{isModalOpen && \([\s\S]*?\{\/\* Modal Footer \*\/\}[\s\S]*?<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/;

const newModal = `          {/* The Upload Modal */}
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
          </Modal>`;

if (regex.test(code)) {
  code = code.replace(regex, newModal);
  fs.writeFileSync('src/pages/ProjectDiagramTab.tsx', code);
  console.log('Modal refactored!');
} else {
  console.log('Regex did not match.');
}
