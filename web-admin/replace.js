const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectDiagramTab.tsx', 'utf8');

// Add editingIndex state
code = code.replace(
  'const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);',
  'const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);\n  const [editingIndex, setEditingIndex] = useState<number | null>(null);'
);

// We find the block of handleEdit
const match = code.match(/const handleEdit = async \([\s\S]*?setIsSaving\(false\);\n    \}\n  \};\n\n  const handleSave = async \([\s\S]*?setIsSaving\(false\);\n  \};/);
if (!match) throw new Error('Could not find handlers');

const newHandlers = `const handleOpenEditModal = (idx: number) => {
    setEditingIndex(idx);
    setDiagramName(savedDiagrams[idx].name);
    setPendingUrls([savedDiagrams[idx].url]);
    setResetKey(Date.now());
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPendingUrls([]);
    setDiagramName('');
    setEditingIndex(null);
    setResetKey(Date.now());
  };

  const handleSave = async () => {
    if (!project || pendingUrls.length === 0) return;
    setIsSaving(true);
    try {
      let combinedUrls: string;
      if (editingIndex !== null) {
        const newSaved = [...savedDiagrams];
        if (pendingUrls.length === 1) {
          newSaved[editingIndex] = {
            url: pendingUrls[0],
            name: diagramName.trim() || \`Sơ đồ ${editingIndex + 1}\`
          };
        } else {
          const newEntries = pendingUrls.map((url, idx) => ({
            url,
            name: diagramName.trim() ? (pendingUrls.length > 1 ? \`${diagramName.trim()} ${idx + 1}\` : diagramName.trim()) : \`Sơ đồ mới ${idx + 1}\`
          }));
          newSaved.splice(editingIndex, 1, ...newEntries);
        }
        combinedUrls = JSON.stringify(newSaved);
      } else {
        const newEntries = pendingUrls.map((url, idx) => ({
          url,
          name: diagramName.trim() ? (pendingUrls.length > 1 ? \`${diagramName.trim()} ${idx + 1}\` : diagramName.trim()) : \`Sơ đồ mới ${idx + 1}\`
        }));
        combinedUrls = JSON.stringify([...savedDiagrams, ...newEntries]);
      }
      
      const updated = await updateProject(project.id, { diagramUrl: combinedUrls });
      if (!updated) {
        alert('Không thể lưu sơ đồ!');
      } else {
        handleCloseModal();
        triggerToast('Lưu sơ đồ dự án thành công!', 'success');
      }
    } catch (err) {
      console.error('Failed to save diagram', err);
    }
    setIsSaving(false);
  };`;

code = code.replace(match[0], newHandlers);

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
