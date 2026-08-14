const fs = require('fs');
const filePath = 'D:/HỆ THỐNG QUẢN LÝ CÔNG VIỆC-web-app-titsmart/web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace Block 1
const regex1 = /if \(!sectionInMaterial && finalSectionName\) \{([\s\S]*?)if \(!sectionIsOwner\) \{([\s\S]*?)\}([\s\S]*?)\}/;
const match1 = content.match(regex1);
if (match1) {
    const newBlock1 = `if (finalSectionName) {
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
        }`;
    content = content.replace(regex1, newBlock1);
    console.log('Block 1 replaced');
} else {
    console.log('Block 1 not found');
}

// Replace Block 2
const regex2 = /if \(isSectionHeader\) \{\s*\/\/ Đồng bộ section header sang Kế hoạch Vật tư\s*const existingSection = materialPlans\.find\([\s\S]*?if \(!existingSection\) \{\s*await addMaterialPlan\([\s\S]*?\);\s*\/\/ Đồng bộ section header sang Mua hàng\s*await addPurchasingPlan\([\s\S]*?\);\s*\}\s*\}/;

const match2 = content.match(regex2);
if (match2) {
    const newBlock2 = `if (isSectionHeader) {
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
    }`;
    content = content.replace(regex2, newBlock2);
    console.log('Block 2 replaced');
} else {
    console.log('Block 2 not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
