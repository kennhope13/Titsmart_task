const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectDiagramTab.tsx', 'utf8');

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

const match = code.match(/  const handleDelete = async \(idxToRemove: number\) => \{[\s\S]*?setIsSaving\(false\);\n  \};\n/);
if (match) {
  code = code.replace(match[0], newHandleDelete + '\n');
  fs.writeFileSync('src/pages/ProjectDiagramTab.tsx', code);
  console.log('Replaced handleDelete');
} else {
  console.log('Not found');
}
