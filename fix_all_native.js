const fs = require('fs');

// 1. Update DocumentCertificateTab.tsx
let docFile = fs.readFileSync('web-admin/src/pages/cost-plan/DocumentCertificateTab.tsx', 'utf8');

docFile = docFile.replace('const DocFormModal', 'export const DocFormModal');
docFile = docFile.replace('interface FormState', 'export interface FormState');
docFile = docFile.replace('interface ModelEntry', 'export interface ModelEntry');
docFile = docFile.replace('interface DocEntry', 'export interface DocEntry');
docFile = docFile.replace('const decodeModels', 'export const decodeModels');
docFile = docFile.replace('const cleanNotes', 'export const cleanNotes');
docFile = docFile.replace('const DOC_TRACK_TAG', 'export const DOC_TRACK_TAG');
docFile = docFile.replace('const firstModel', 'export const firstModel');

fs.writeFileSync('web-admin/src/pages/cost-plan/DocumentCertificateTab.tsx', docFile, 'utf8');

// 2. Update MaterialAndPurchasingTab.tsx
let matFile = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

const importTarget = "import { CustomSelect } from '@/components/common/CustomSelect';";
const importReplace = "import { CustomSelect } from '@/components/common/CustomSelect';\nimport { Modal } from '../../components/common/Modal';\nimport { DocFormModal, FormState, decodeModels, encodeModels, DOC_TRACK_TAG, firstModel, cleanNotes } from './DocumentCertificateTab';";
matFile = matFile.replace(importTarget, importReplace);

const stateTarget = "  const [triggerAddDoc, setTriggerAddDoc] = useState(false);";
const stateReplace = "  const [triggerAddDoc, setTriggerAddDoc] = useState(false);\n  const [docModalOpen, setDocModalOpen] = useState(false);\n  const [docModalPlanId, setDocModalPlanId] = useState<string | null>(null);\n  const [docModalInitial, setDocModalInitial] = useState<FormState | null>(null);";
matFile = matFile.replace(stateTarget, stateReplace);

const handlerTarget = "  const startEditing = (id: string, field: string, value: any, isPurchasing = false) => {";
const handlerReplace = `  const handleDocBadgeClick = (plan: any) => {
    setDocModalInitial({
      jobContent: plan.jobContent,
      unit: plan.unit,
      contractVolume: plan.contractVolume,
      notes: cleanNotes(plan.notes),
      models: decodeModels(plan.issueContent)
    });
    setDocModalPlanId(plan.id);
    setDocModalOpen(true);
  };

  const handleDocModalSubmit = (form: FormState) => {
    if (!docModalPlanId) return;
    const plan = data.find(p => p.id === docModalPlanId);
    if (!plan) return;

    const fm = firstModel(form.models);
    const allTexts = form.models.flatMap(m => m.docs.map(d => d.text.toLowerCase())).join(' ');
    const docCo = allTexts.includes('c/o') || allTexts.includes('co');
    const docCq = allTexts.includes('c/q') || allTexts.includes('cq');
    const docFireInspection = allTexts.includes('pccc') || allTexts.includes('phòng cháy');

    const payload = {
      ...plan,
      jobContent: form.jobContent,
      unit: form.unit,
      contractVolume: form.contractVolume,
      techSpecModel: fm.model,
      techSpecOrigin: [fm.manufacturer, fm.origin].filter(Boolean).join(' - '),
      notes: form.notes ? DOC_TRACK_TAG + " " + form.notes : DOC_TRACK_TAG,
      issueContent: encodeModels(form.models),
      docCo,
      docCq,
      docFireInspection,
    };
    
    onUpdateMaterial(plan.id, payload);
    setDocModalOpen(false);
  };

  const startEditing = (id: string, field: string, value: any, isPurchasing = false) => {`;
matFile = matFile.replace(handlerTarget, handlerReplace);

matFile = matFile.replace(/onClick=\{\(\) \=\> onUpdateMaterial\(plan.id, \{ \.\.\.plan, docCo: !plan\.docCo \}\)\}/g, "onClick={() => handleDocBadgeClick(plan)}");
matFile = matFile.replace(/onClick=\{\(\) \=\> onUpdateMaterial\(plan.id, \{ \.\.\.plan, docCq: !plan\.docCq \}\)\}/g, "onClick={() => handleDocBadgeClick(plan)}");
matFile = matFile.replace(/onClick=\{\(\) \=\> onUpdateMaterial\(plan.id, \{ \.\.\.plan, docFireInspection: !plan\.docFireInspection \}\)\}/g, "onClick={() => handleDocBadgeClick(plan)}");

const modalTarget = `      <datalist id="issueStatus-options">`;
const modalReplace = `      <Modal isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title="Hồ sơ Chứng từ" size="xl" icon="description">
        {docModalInitial && (
          <DocFormModal
            title="Cập nhật chứng từ"
            initial={docModalInitial}
            onClose={() => setDocModalOpen(false)}
            onSubmit={handleDocModalSubmit}
          />
        )}
      </Modal>

      <datalist id="issueStatus-options">`;
matFile = matFile.replace(modalTarget, modalReplace);

// Remove local cleanNotes
const localCleanNotesTarget = `const cleanNotes = (value?: string) => {
  return String(value || '').replace(/\\s*\\[doc-track\\]\\s*/gi, '').trim();
};`;
matFile = matFile.replace(localCleanNotesTarget, "");


fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', matFile, 'utf8');
