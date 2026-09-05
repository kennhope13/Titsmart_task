const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectDiagramTab.tsx', 'utf8');

const regex = /  const handleDelete = async \(idxToRemove: number\) => \{[\s\S]*?setIsSaving\(false\);\n  \};/;
const newHandleDelete = `  const handleDelete = (idxToRemove: number) => {
    setDeleteIndex(idxToRemove);
  };

  const confirmDelete = async () => {
    if (deleteIndex === null || !project) return;
    setIsSaving(true);
    try {
      const newSaved = [...savedDiagrams];
      newSaved.splice(deleteIndex, 1);
      const combinedUrls = newSaved.length > 0 ? JSON.stringify(newSaved) : '';
      const updated = await updateProject(project.id, { diagramUrl: combinedUrls });
      if (updated) {
        triggerToast('Đã xóa sơ đồ thành công!', 'success');
      }
    } catch (err) {
      console.error('Failed to delete diagram', err);
    }
    setIsSaving(false);
    setDeleteIndex(null);
  };`;

if (regex.test(code)) {
  code = code.replace(regex, newHandleDelete);
  
  const confirmModalComponent = `
        {viewerItem && (
          <Modal isOpen={true} onClose={() => setViewerItem(null)} title="Chi tiết sơ đồ" size="xl">`;

  const confirmModalComponentNew = `
        <ConfirmModal
          isOpen={deleteIndex !== null}
          onClose={() => setDeleteIndex(null)}
          onConfirm={confirmDelete}
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa sơ đồ này? Thao tác này không thể hoàn tác."
          confirmText="Xóa sơ đồ"
          icon="delete"
        />
        {viewerItem && (
          <Modal isOpen={true} onClose={() => setViewerItem(null)} title="Chi tiết sơ đồ" size="xl">`;

  code = code.replace(confirmModalComponent, confirmModalComponentNew);
  
  fs.writeFileSync('src/pages/ProjectDiagramTab.tsx', code);
  console.log('Replaced');
} else {
  console.log('Not found');
}
