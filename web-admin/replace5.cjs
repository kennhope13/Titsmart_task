const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectDiagramTab.tsx', 'utf8');

// 1. Add import
if (!code.includes('ConfirmModal')) {
  code = code.replace(
    "import { Modal } from '../components/common/Modal';",
    "import { Modal } from '../components/common/Modal';\nimport { ConfirmModal } from '../components/common/ConfirmModal';"
  );
}

// 2. Add state
if (!code.includes('const [deleteIndex, setDeleteIndex]')) {
  code = code.replace(
    "const [editingIndex, setEditingIndex] = useState<number | null>(null);",
    "const [editingIndex, setEditingIndex] = useState<number | null>(null);\n  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);"
  );
}

// 3. Update handleDelete and add confirmDelete
const oldHandleDelete = `  const handleDelete = async (idxToRemove: number) => {
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
  };`;

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

code = code.replace(/  const handleDelete = async \([\s\S]*?setIsSaving\(false\);\n  \};\n/, newHandleDelete + '\n');

// 4. Add ConfirmModal component near the end
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
console.log("Success");
