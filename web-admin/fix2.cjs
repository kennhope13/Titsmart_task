const fs = require('fs');
const filePath = 'D:/HỆ THỐNG QUẢN LÝ CÔNG VIỆC-web-app-titsmart/web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const s1_start = '        if (!sectionInMaterial && finalSectionName) {';
const s1_end = '        // Tìm section cha trong PurchasingPlan theo sectionName';

const block1 = `        if (finalSectionName) {
          const sectionCount = materialPlans.filter(
            m => m.projectCode === projectCode &&
                 (String(m.notes || '').toLowerCase().includes('[section]') ||
                  /^[IVXLCDM]+$/i.test(String(m.stt || '').trim()))
          ).length;
          const sectionTask = tasks.find(
            t => t.projectCode === projectCode && t.isSectionHeader &&
                 (t.sectionName === finalSectionName || t.name === finalSectionName)
          );
          const sectionStt = sectionTask?.stt || toRoman(sectionCount + 1);

          if (!sectionInMaterial) {
            sectionMaterialId = await addMaterialPlan({
              projectCode,
              stt: sectionStt,
              jobContent: finalSectionName,
              unit: '',
              contractVolume: 0,
              progressStatus: 'Chưa thi công',
              orderedVolume: 0,
              orderedStatus: 'Chưa đặt hàng',
              supplyScope: 'unknown',
              notes: '[section]',
            });
          }

          if (!sectionIsOwner) {
            const sectionInPurchasing = purchasingPlans.find(
              p => p.projectCode === projectCode &&
                   (String(p.notes || '').toLowerCase().includes('[section]') ||
                    /^[IVXLCDM]+$/i.test(String(p.stt || '').trim())) &&
                   p.content?.trim().toLowerCase() === finalSectionName.trim().toLowerCase()
            );
            sectionPurchasingId = sectionInPurchasing?.id;

            if (!sectionInPurchasing) {
              sectionPurchasingId = await addPurchasingPlan({
                projectCode,
                stt: sectionStt,
                content: finalSectionName,
                unit: '',
                volumeContract: 0,
                volumeOrder: 0,
                unitPrice: 0,
                vatRate: 10,
                vatAmount: 0,
                totalAmount: 0,
                prepayPercent: 0,
                prepayAmount: 0,
                remainingAmount: 0,
                orderStatus: 'Chưa đặt hàng',
                contractStatus: 'Chưa ký',
                invoiceStatus: 'Chưa xuất',
                notes: '[section]',
              });
            }
          }
        }

`;

const s2_start = '    if (isSectionHeader) {\\n      // Đồng bộ section header sang Kế hoạch Vật tư';
const s2_end = '      setIsSectionHeader(false);';

const block2 = `    if (isSectionHeader) {
      // Đồng bộ section header sang Kế hoạch Vật tư
      const existingMaterialSection = materialPlans.find(
        m => m.projectCode === projectCode &&
             (String(m.notes || '').toLowerCase().includes('[section]') || /^[IVXLCDM]+$/i.test(String(m.stt || '').trim())) &&
             m.jobContent?.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (!existingMaterialSection) {
        await addMaterialPlan({
          projectCode,
          stt: taskStt,
          jobContent: name,
          unit: '',
          contractVolume: 0,
          progressStatus: 'Chưa thi công',
          orderedVolume: 0,
          orderedStatus: 'Chưa đặt hàng',
          supplyScope: 'unknown',
          notes: '[section]',
        });
      }

      // Đồng bộ section header sang Mua hàng
      const existingPurchasingSection = purchasingPlans.find(
        p => p.projectCode === projectCode &&
             (String(p.notes || '').toLowerCase().includes('[section]') || /^[IVXLCDM]+$/i.test(String(p.stt || '').trim())) &&
             p.content?.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (!existingPurchasingSection) {
        await addPurchasingPlan({
          projectCode,
          stt: taskStt,
          content: name,
          unit: '',
          volumeContract: 0,
          volumeOrder: 0,
          unitPrice: 0,
          vatRate: 10,
          vatAmount: 0,
          totalAmount: 0,
          prepayPercent: 0,
          prepayAmount: 0,
          remainingAmount: 0,
          orderStatus: 'Chưa đặt hàng',
          contractStatus: 'Chưa ký',
          invoiceStatus: 'Chưa xuất',
          notes: '[section]',
        });
      }
    }

`;

const idx1_start = content.indexOf(s1_start);
const idx1_end = content.indexOf(s1_end);

if (idx1_start !== -1 && idx1_end !== -1) {
    content = content.substring(0, idx1_start) + block1 + content.substring(idx1_end);
    console.log('Block 1 replaced');
} else {
    console.log('Block 1 not found');
}

const s2_start_actual = '    if (isSectionHeader) {';
const s2_end_actual = '      setIsSectionHeader(false);';

const idx2_start = content.indexOf(s2_start_actual, content.indexOf('setName('));
const idx2_end = content.indexOf(s2_end_actual, idx2_start);

if (idx2_start !== -1 && idx2_end !== -1) {
    content = content.substring(0, idx2_start) + block2 + content.substring(idx2_end);
    console.log('Block 2 replaced');
} else {
    console.log('Block 2 not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
