const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// 1. Add FastDocModal import
f = f.replace("import { CustomSelect } from '@/components/common/CustomSelect';", "import { CustomSelect } from '@/components/common/CustomSelect';\nimport { decodeModels, encodeModels, ModelEntry } from './DocumentCertificateTab';\nimport { FastDocModal } from './FastDocModal';");

// 2. Add state
const stateTarget = "  const [triggerAddDoc, setTriggerAddDoc] = useState(false);";
const stateReplace = "  const [triggerAddDoc, setTriggerAddDoc] = useState(false);\n  const [docModalPlanId, setDocModalPlanId] = useState<string | null>(null);\n  const [fastDocType, setFastDocType] = useState<'CO'|'CQ'|'PCCC'|null>(null);\n  const [fastDocModels, setFastDocModels] = useState<ModelEntry[]>([]);";
f = f.replace(stateTarget, stateReplace);

// 3. Add handlers
const handlerTarget = "  const startEditing = (id: string, field: string, value: any, isPurchasing = false) => {";
const handlerReplace = `  const handleDocBadgeClick = (plan: any, type: 'CO'|'CQ'|'PCCC') => {
    setFastDocModels(decodeModels(plan.issueContent));
    setDocModalPlanId(plan.id);
    setFastDocType(type);
  };

  const handleFastDocSubmit = (newModels: ModelEntry[]) => {
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

  const startEditing = (id: string, field: string, value: any, isPurchasing = false) => {`;
f = f.replace(handlerTarget, handlerReplace);

// 4. Update the badges onClick to use handleDocBadgeClick
f = f.replace(/onClick=\{\(\) \=\> onUpdateMaterial\(plan.id, \{ \.\.\.plan, docCo: !plan\.docCo \}\)\}/g, "onClick={() => handleDocBadgeClick(plan, 'CO')}");
f = f.replace(/onClick=\{\(\) \=\> onUpdateMaterial\(plan.id, \{ \.\.\.plan, docCq: !plan\.docCq \}\)\}/g, "onClick={() => handleDocBadgeClick(plan, 'CQ')}");
f = f.replace(/onClick=\{\(\) \=\> onUpdateMaterial\(plan.id, \{ \.\.\.plan, docFireInspection: !plan\.docFireInspection \}\)\}/g, "onClick={() => handleDocBadgeClick(plan, 'PCCC')}");

// 5. Add Modal to render
const modalTarget = `      <datalist id="issueStatus-options">`;
const modalReplace = `      {fastDocType && (
        <FastDocModal
          title={\`Cập nhật chứng từ \${fastDocType}\`}
          docType={fastDocType}
          initialModels={fastDocModels}
          onClose={() => setFastDocType(null)}
          onSubmit={handleFastDocSubmit}
        />
      )}

      <datalist id="issueStatus-options">`;
f = f.replace(modalTarget, modalReplace);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
