const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectDiagramTab.tsx', 'utf8');

code = code.replace(
  'onClick={(e) => { e.stopPropagation(); handleEdit(idx); }}',
  'onClick={(e) => { e.stopPropagation(); handleOpenEditModal(idx); }}'
);

code = code.replace(
  'onClick={() => setIsModalOpen(true)}',
  "onClick={() => { setEditingIndex(null); setDiagramName(''); setPendingUrls([]); setResetKey(Date.now()); setIsModalOpen(true); }}"
);

code = code.replace(
  /onClick=\{\(\) \=\> \{ setIsModalOpen\(false\); setPendingUrls\(\[\]\); setDiagramName\(''\); setResetKey\(Date\.now\(\)\); \}\}/g,
  'onClick={handleCloseModal}'
);

code = code.replace(
  '>Upload sơ đồ dự án<',
  '>{editingIndex !== null ? "Cập nhật sơ đồ" : "Upload sơ đồ dự án"}<'
);

code = code.replace(
  /buttonText=.Tải sơ đồ.[\s]+buttonIcon=.add_photo_alternate.[\s]+variant=.light.[\s]+multiple=\{true\}/g,
  `buttonText={editingIndex !== null ? "Tải lại sơ đồ (Thay thế)" : "Tải sơ đồ"}\n                          buttonIcon="add_photo_alternate"\n                          variant="light"\n                          multiple={editingIndex === null}`
);

code = code.replace(
  /{isSaving \? 'Đang tải\.\.\.' : 'Upload'}/g,
  `{isSaving ? 'Đang lưu...' : (editingIndex !== null ? 'Cập nhật' : 'Upload')}`
);
code = code.replace(
  /{isSaving \? 'Đang lưu\.\.\.' : 'Upload'}/g,
  `{isSaving ? 'Đang lưu...' : (editingIndex !== null ? 'Cập nhật' : 'Upload')}`
);

fs.writeFileSync('src/pages/ProjectDiagramTab.tsx', code);
console.log('Success!');
