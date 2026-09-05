const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectDiagramTab.tsx', 'utf8');

const startIdx = code.indexOf('const handleDelete = async');
let endIdx = code.indexOf('setIsSaving(false);\n  };', startIdx);
let actualEndStr = 'setIsSaving(false);\n  };';
if (endIdx === -1) {
  endIdx = code.indexOf('setIsSaving(false);\r\n  };', startIdx);
  actualEndStr = 'setIsSaving(false);\r\n  };';
}

if (startIdx !== -1 && endIdx !== -1) {
  const toReplace = code.substring(startIdx - 2, endIdx + actualEndStr.length);
  
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
  
  code = code.replace(toReplace, newHandleDelete);
  
  const confirmModalComponent = `        {viewerItem && (`;

  const confirmModalComponentNew = `        <ConfirmModal
          isOpen={deleteIndex !== null}
          onClose={() => setDeleteIndex(null)}
          onConfirm={confirmDelete}
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa sơ đồ này? Thao tác này không thể hoàn tác."
          confirmText="Xóa sơ đồ"
          icon="delete"
        />
        {viewerItem && (`;

  code = code.replace(confirmModalComponent, confirmModalComponentNew);

  if (!code.includes('ConfirmModal')) {
    code = code.replace(
      "import { Modal } from '../components/common/Modal';",
      "import { Modal } from '../components/common/Modal';\nimport { ConfirmModal } from '../components/common/ConfirmModal';"
    );
  }

  if (!code.includes('const [deleteIndex, setDeleteIndex]')) {
    code = code.replace(
      "const [editingIndex, setEditingIndex] = useState<number | null>(null);",
      "const [editingIndex, setEditingIndex] = useState<number | null>(null);\n  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);"
    );
  }
  
  fs.writeFileSync('src/pages/ProjectDiagramTab.tsx', code);
  console.log('Replaced successfully');
} else {
  console.log('Not found: ' + startIdx + ' ' + endIdx);
}
