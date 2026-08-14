const fs = require('fs');
const filePath = 'D:/HỆ THỐNG QUẢN LÝ CÔNG VIỆC-web-app-titsmart/web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
`        if (!sectionInMaterial && finalSectionName) {
          const sectionCount = materialPlans.filter(`,
`        if (finalSectionName) {
          const sectionCount = materialPlans.filter(`
);

content = content.replace(
`          sectionMaterialId = await addMaterialPlan({
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
          if (!sectionIsOwner) {`,
`          if (!sectionInMaterial) {
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
          if (!sectionIsOwner) {`
);

content = content.replace(
`          if (!sectionIsOwner) {
            // Đồng bộ section header sang Mua hàng
            sectionPurchasingId = await addPurchasingPlan({`,
`          if (!sectionIsOwner) {
            const sectionInPurchasing = purchasingPlans.find(
              p => p.projectCode === projectCode &&
                   (String(p.notes || '').toLowerCase().includes('[section]') ||
                    /^[IVXLCDM]+$/i.test(String(p.stt || '').trim())) &&
                   p.content?.trim().toLowerCase() === finalSectionName.trim().toLowerCase()
            );
            sectionPurchasingId = sectionInPurchasing?.id;
            if (!sectionInPurchasing) {
              sectionPurchasingId = await addPurchasingPlan({`
);

content = content.replace(
`              notes: '[section]',
            });
          }
        }

        // Tìm section cha trong PurchasingPlan theo sectionName`,
`              notes: '[section]',
            });
            }
          }
        }

        // Tìm section cha trong PurchasingPlan theo sectionName`
);


content = content.replace(
`      // Đồng bộ section header sang Kế hoạch Vật tư
      const existingSection = materialPlans.find(
        m => m.projectCode === projectCode &&
             (String(m.notes || '').toLowerCase().includes('[section]') || /^[IVXLCDM]+$/i.test(String(m.stt || '').trim())) &&
             m.jobContent?.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (!existingSection) {`,
`      // Đồng bộ section header sang Kế hoạch Vật tư
      const existingMaterialSection = materialPlans.find(
        m => m.projectCode === projectCode &&
             (String(m.notes || '').toLowerCase().includes('[section]') || /^[IVXLCDM]+$/i.test(String(m.stt || '').trim())) &&
             m.jobContent?.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (!existingMaterialSection) {`
);

content = content.replace(
`          supplyScope: 'unknown',
          notes: '[section]',
        });
        // Đồng bộ section header sang Mua hàng
        await addPurchasingPlan({`,
`          supplyScope: 'unknown',
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
        await addPurchasingPlan({`
);


fs.writeFileSync(filePath, content, 'utf8');
console.log('Done fix3');
