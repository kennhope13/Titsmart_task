const fs = require("fs"); let c = fs.readFileSync("web-admin/src/pages/ProjectCostPlanPage.tsx", "utf8");

const s1 = `        if (matchingTask) {
          const taskUpdates: Record<string, any> = {};
          if (updates.orderedStatus !== undefined) taskUpdates.purchaseStatus = updates.orderedStatus || "Chưa đặt hàng";
          if (updates.progressStatus !== undefined) taskUpdates.constrStatus = updates.progressStatus || "Chưa thi công";
          updateTask(matchingTask.id, taskUpdates);
        }`;

const s2 = `        if (matchingTask) {
          const taskUpdates: Record<string, any> = {};
          let newPurch = matchingTask.purchaseStatus;
          let newConstr = matchingTask.constrStatus;

          if (updates.orderedStatus !== undefined) {
             taskUpdates.purchaseStatus = updates.orderedStatus || "Chưa đặt hàng";
             newPurch = taskUpdates.purchaseStatus;
          }
          if (updates.progressStatus !== undefined) {
             taskUpdates.constrStatus = updates.progressStatus || "Chưa thi công";
             newConstr = taskUpdates.constrStatus;
          }

          if (!matchingTask.isSectionHeader) {
            const nextProgress = calculateAutoProgressRatio(newPurch, newConstr);
            taskUpdates.progress = nextProgress;
            taskUpdates.isDone = nextProgress >= 1;
            taskUpdates.status = nextProgress >= 1 ? "Hoàn thành" : nextProgress > 0 ? "Đang làm" : "Chưa làm";
          }

          updateTask(matchingTask.id, taskUpdates);
        }`;

c = c.replace(s1.replace(/\r/g, ""), s2);
fs.writeFileSync("web-admin/src/pages/ProjectCostPlanPage.tsx", c);
console.log("Replaced!");

