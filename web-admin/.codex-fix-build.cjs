const fs = require('fs');
let s = fs.readFileSync('src/services/webOcrService.ts', 'utf8');
const oldPdf = `  const textPages: string[] = [];
  const pageRefs: any[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({ status: \`Đang đọc PDF trang \${pageNumber}/\${pdf.numPages}\`, progress: Math.round((pageNumber / pdf.numPages) * 100) });
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || '').filter(Boolean).join(' ');
    pages.push(pageText);
  }

  return pages.join('\\n\\n');`;
const newPdf = `  const textPages: string[] = [];
  const pageRefs: any[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({ status: \`Đang đọc text PDF trang \${pageNumber}/\${pdf.numPages}\`, progress: Math.round((pageNumber / pdf.numPages) * 45) });
    const page = await pdf.getPage(pageNumber);
    pageRefs.push(page);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || '').filter(Boolean).join(' ');
    textPages.push(pageText);
  }

  const textLayerContent = textPages.join('\\n\\n').trim();
  if (textLayerContent.length >= 20) return textLayerContent;

  const ocrPages: string[] = [];
  for (let index = 0; index < pageRefs.length; index += 1) {
    const pageNumber = index + 1;
    const page = pageRefs[index];
    onProgress?.({ status: \`PDF không có text, đang render trang \${pageNumber}/\${pdf.numPages}\`, progress: Math.round(45 + (index / pdf.numPages) * 10) });
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    ocrPages.push(await ocrCanvas(canvas, pageNumber, pdf.numPages, onProgress));
  }

  return ocrPages.join('\\n\\n');`;
s = s.replace(oldPdf, newPdf);
fs.writeFileSync('src/services/webOcrService.ts', s, 'utf8');

s = fs.readFileSync('src/pages/ProjectManagementPage.tsx', 'utf8');
s = s.replace("{toastState.show && <Toast message={toastState.message} type={toastState.type} onClose={() => setToastState((state) => ({ ...state, show: false }))} />}", "<Toast show={toastState.show} message={toastState.message} type={toastState.type} />");
fs.writeFileSync('src/pages/ProjectManagementPage.tsx', s, 'utf8');

s = fs.readFileSync('src/pages/TaskManagementPage.tsx', 'utf8');
s = s.replace("uniqueSectionsForProj[0] || 'I. Hạng mục chung'", "uniqueSectionsForProj[0] || ''");
s = s.replace("stt: stt || (isSectionHeader ? 'I' : nextStt),", "stt: isSectionHeader ? '' : (stt || nextStt),");
s = s.replaceAll("status: 'Not Started'", "status: 'Chưa làm'");
s = s.replace("assignedEngineerId: 'eng-1',", "assignedEngineerId: engineers[0]?.id || '',");
s = s.replace("assignedEngineerName: 'Kỹ sư Nam',", "assignedEngineerName: engineers[0]?.name || '',");
s = s.replace("assignedEngineerName: eng ? eng.name : 'Kỹ sư Nam',", "assignedEngineerName: eng?.name || '',");
const fakeBlock = /\s+const hasHeader = groups\[sec\]\.some\(t => t\.isSectionHeader\);[\s\S]*?\n\s+flattened\.push\(\.\.\.groups\[sec\]\);/;
s = s.replace(fakeBlock, "\n      flattened.push(...groups[sec]);");
fs.writeFileSync('src/pages/TaskManagementPage.tsx', s, 'utf8');
