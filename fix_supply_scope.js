const fs = require("fs");
let f = "web-admin/src/pages/ProjectCostPlanPage.tsx";
let c = fs.readFileSync(f, "utf8");

const target = `
      // Đồng bộ trạng thái đặt hàng / thi công sang Purchasing + Task
`;

const replacement = `
      // Đồng bộ khi thay đổi Phạm vi cung cấp (supplyScope)
      if (updates.supplyScope && updates.supplyScope !== existing.supplyScope) {
        if (updates.supplyScope === "contractor") {
          // Tạo sang Purchasing nếu chưa có
          const pExists = purchasingPlans.find(p => p.projectCode === existing.projectCode && p.stt === existing.stt && p.content === existing.jobContent);
          if (!pExists) {
            await addPurchasingPlan({
              projectCode: existing.projectCode,
              stt: existing.stt,
              content: existing.jobContent,
              unit: existing.unit,
              volumeContract: existing.contractVolume,
              volumeOrder: 0,
              unitPrice: 0,
              vatRate: 0,
              vatAmount: 0,
              totalAmount: 0,
              prepayPercent: 0,
              prepayAmount: 0,
              remainingAmount: 0,
              orderStatus: existing.orderedStatus || "Chưa đặt hàng",
              contractStatus: "Chưa ký",
              invoiceStatus: "Chưa xuất",
              notes: existing.notes || "",
            });
          }
          // Tạo sang Task nếu chưa có
          const tExists = tasks.find(t => t.projectCode === existing.projectCode && t.stt === existing.stt && t.name === existing.jobContent);
          if (!tExists) {
            await addTask({
              projectCode: existing.projectCode,
              stt: existing.stt,
              name: existing.jobContent,
              unit: existing.unit,
              volumeContract: existing.contractVolume,
              volumeConstructed: 0,
              completionPercent: 0,
              issueStatus: "Không có",
              issueContent: "",
              isFinished: false,
              notes: existing.notes || "",
            });
          }
        } else if (updates.supplyScope === "owner") {
          // Xóa khỏi Purchasing nếu có
          const pExists = purchasingPlans.find(p => p.projectCode === existing.projectCode && p.stt === existing.stt && p.content === existing.jobContent);
          if (pExists) await deletePurchasingPlan(pExists.id);
          // Xóa khỏi Task nếu có
          const tExists = tasks.find(t => t.projectCode === existing.projectCode && t.stt === existing.stt && t.name === existing.jobContent);
          if (tExists) await deleteTask(tExists.id);
        }
      }

      // Đồng bộ trạng thái đặt hàng / thi công sang Purchasing + Task
`;

c = c.replace(target, replacement);
fs.writeFileSync(f, c);
console.log("Fixed supplyScope sync in handleUpdateMaterialPlanSync");

