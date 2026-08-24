const fs = require('fs');

let matFile = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// Add import for FastDocModal
matFile = matFile.replace("import { DocFormModal, FormState, decodeModels, encodeModels, DOC_TRACK_TAG, firstModel } from './DocumentCertificateTab';", "import { DocFormModal, FormState, decodeModels, encodeModels, DOC_TRACK_TAG, firstModel, ModelEntry } from './DocumentCertificateTab';\nimport { FastDocModal } from './FastDocModal';");


// Replace docModalInitial with fastDocState
const oldStateTarget = "  const [docModalInitial, setDocModalInitial] = useState<FormState | null>(null);";
const newStateReplace = "  const [docModalInitial, setDocModalInitial] = useState<FormState | null>(null);\n  const [fastDocType, setFastDocType] = useState<'CO'|'CQ'|'PCCC'|null>(null);\n  const [fastDocModels, setFastDocModels] = useState<ModelEntry[]>([]);";
matFile = matFile.replace(oldStateTarget, newStateReplace);


// Update badge click handler to take a type parameter
const handlerTarget = `  const handleDocBadgeClick = (plan: any) => {
    setDocModalInitial({
      jobContent: plan.jobContent,
      unit: plan.unit,
      contractVolume: plan.contractVolume,
      notes: cleanNotes(plan.notes),
      models: decodeModels(plan.issueContent)
    });
    setDocModalPlanId(plan.id);
    setDocModalOpen(true);
  };`;

const handlerReplace = `  const handleDocBadgeClick = (plan: any, type: 'CO'|'CQ'|'PCCC') => {
    setFastDocModels(decodeModels(plan.issueContent));
    setDocModalPlanId(plan.id);
    setFastDocType(type);
  };`;

matFile = matFile.replace(handlerTarget, handlerReplace);


// Add handleFastDocSubmit
const submitTarget = `  const handleDocModalSubmit = (form: FormState) => {`;
const submitReplace = `  const handleFastDocSubmit = (newModels: ModelEntry[]) => {
    if (!docModalPlanId) return;
    const plan = data.find(p => p.id === docModalPlanId);
    if (!plan) return;

    const allTexts = newModels.flatMap(m => m.docs.map(d => d.text.toLowerCase())).join(' ');
    const docCo = allTexts.includes('c/o') || allTexts.includes('co');
    const docCq = allTexts.includes('c/q') || allTexts.includes('cq');
    const docFireInspection = allTexts.includes('pccc') || allTexts.includes('phòng cháy');

    const payload = {
      ...plan,
      issueContent: encodeModels(newModels),
      docCo,
      docCq,
      docFireInspection,
    };
    
    onUpdateMaterial(plan.id, payload);
    setFastDocType(null);
  };

  const handleDocModalSubmit = (form: FormState) => {`;
matFile = matFile.replace(submitTarget, submitReplace);


// Update the buttons in the render loop to pass the type parameter
matFile = matFile.replace(/onClick=\{\(\) \=\> handleDocBadgeClick\(plan\)\}/g, (match, offset, str) => {
  // Let's deduce which button it is based on the button text inside it
  const chunk = str.substring(offset, offset + 150);
  if (chunk.includes(">CO<")) return "onClick={() => handleDocBadgeClick(plan, 'CO')}";
  if (chunk.includes(">CQ<")) return "onClick={() => handleDocBadgeClick(plan, 'CQ')}";
  if (chunk.includes(">PCCC<")) return "onClick={() => handleDocBadgeClick(plan, 'PCCC')}";
  return match;
});

// Replace the render modal
const modalTarget = `      <Modal isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title="Hồ sơ Chứng từ" size="xl" icon="description">
        {docModalInitial && (
          <DocFormModal
            title="Cập nhật chứng từ"
            initial={docModalInitial}
            onClose={() => setDocModalOpen(false)}
            onSubmit={handleDocModalSubmit}
          />
        )}
      </Modal>`;

const modalReplace = `      {fastDocType && (
        <FastDocModal
          title={\`Cập nhật chứng từ \${fastDocType}\`}
          docType={fastDocType}
          initialModels={fastDocModels}
          onClose={() => setFastDocType(null)}
          onSubmit={handleFastDocSubmit}
        />
      )}`;

matFile = matFile.replace(modalTarget, modalReplace);


fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', matFile, 'utf8');
