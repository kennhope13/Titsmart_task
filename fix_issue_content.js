const fs = require('fs');

// --- Patch DocumentCertificateTab.tsx ---
let docFile = fs.readFileSync('web-admin/src/pages/cost-plan/DocumentCertificateTab.tsx', 'utf8');

const decodeTarget = `export const decodeModels = (issueContent?: string): ModelEntry[] => {
  if (!issueContent) return [{ ...EMPTY_MODEL, docs: [{ ...EMPTY_DOC }] }];
  try {
    const parsed = JSON.parse(issueContent);`;

const decodeReplace = `export const decodeModels = (issueContent?: string): ModelEntry[] => {
  if (!issueContent) return [{ ...EMPTY_MODEL, docs: [{ ...EMPTY_DOC }] }];
  try {
    const parts = issueContent.split('[DOC-DATA]');
    let dataString = parts.length > 1 ? parts[1].trim() : issueContent;
    
    // If it's not a JSON array/object, it will throw in JSON.parse
    const parsed = JSON.parse(dataString);`;

docFile = docFile.replace(decodeTarget, decodeReplace);
fs.writeFileSync('web-admin/src/pages/cost-plan/DocumentCertificateTab.tsx', docFile, 'utf8');

// --- Patch MaterialAndPurchasingTab.tsx ---
let matFile = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// 1. Add issueContent helper functions
const issueHelpers = `
const getIssueContentText = (val?: string) => {
  const parts = String(val || '').split('[DOC-DATA]');
  // If there's no [DOC-DATA], and the string is valid JSON, then it's all JSON (no text).
  if (parts.length === 1) {
    try {
      JSON.parse(parts[0]);
      return ''; // It's all JSON, so text is empty
    } catch (e) {
      return parts[0]; // Not JSON, so it's all text
    }
  }
  return parts[0];
};

const getIssueContentData = (val?: string) => {
  const parts = String(val || '').split('[DOC-DATA]');
  if (parts.length > 1) return parts[1];
  try {
    JSON.parse(parts[0]);
    return parts[0];
  } catch (e) {
    return '';
  }
};
`;

matFile = matFile.replace("const getTechNote =", issueHelpers + "\nconst getTechNote =");

// 2. Fix handleFastDocSubmit to preserve text
const fastDocSubmitTarget = `issueContent: encodeModels(newModels),`;
const fastDocSubmitReplace = `issueContent: \`\${getIssueContentText(plan.issueContent)} [DOC-DATA] \${encodeModels(newModels)}\`,`;
matFile = matFile.replace(fastDocSubmitTarget, fastDocSubmitReplace);

// 3. Fix saveEditing to preserve data when editing issueContent
const saveEditingTarget = `if (field === 'notes') {
        if (subTab === 'DOCS') {
          finalValue = \`\${getTechNote(plan.notes)} [DOC-NOTE] \${finalValue}\`;
        } else {
          finalValue = \`\${finalValue} [DOC-NOTE] \${getDocNote(plan.notes)}\`;
        }
      }

      onUpdateMaterial(id, { ...plan, [field]: finalValue });`;

const saveEditingReplace = `if (field === 'notes') {
        if (subTab === 'DOCS') {
          finalValue = \`\${getTechNote(plan.notes)} [DOC-NOTE] \${finalValue}\`;
        } else {
          finalValue = \`\${finalValue} [DOC-NOTE] \${getDocNote(plan.notes)}\`;
        }
      }

      if (field === 'issueContent') {
         finalValue = \`\${finalValue} [DOC-DATA] \${getIssueContentData(plan.issueContent)}\`;
      }

      onUpdateMaterial(id, { ...plan, [field]: finalValue });`;
matFile = matFile.replace(saveEditingTarget, saveEditingReplace);

// 4. Update the render UI to display getIssueContentText(plan.issueContent) instead of plan.issueContent
const issueRenderTarget = `{plan.issueContent || <span className="text-slate-300 italic">...</span>}`;
const issueRenderReplace = `{getIssueContentText(plan.issueContent) || <span className="text-slate-300 italic">...</span>}`;
matFile = matFile.replace(issueRenderTarget, issueRenderReplace);

const issueRenderTitleTarget = `title={plan.issueContent || 'Click để nhập'}`;
const issueRenderTitleReplace = `title={getIssueContentText(plan.issueContent) || 'Click để nhập'}`;
matFile = matFile.replace(issueRenderTitleTarget, issueRenderTitleReplace);

// Wait, the <input /> for issueContent uses tempValue, which we should set to getIssueContentText(plan.issueContent) in startEditing!
const startEditingTarget = `setTempValue(value === undefined || value === null ? '' : value);`;
const startEditingReplace = `
    let finalTemp = value === undefined || value === null ? '' : value;
    if (field === 'issueContent') finalTemp = getIssueContentText(value);
    setTempValue(finalTemp);
`;
matFile = matFile.replace(startEditingTarget, startEditingReplace);


fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', matFile, 'utf8');

