const fs = require('fs');
const filePath = 'web-admin/src/pages/ProjectCostPlanPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

const target = `  useEffect(() => {
    if (outletContext?.setSubTitle) {
      if (activeTab === 'TECH') outletContext.setSubTitle('Đặt hàng');
      else if (activeTab === 'DOCS') outletContext.setSubTitle('Chứng từ');
      else if (activeTab === 'FINANCE') outletContext.setSubTitle('Thanh toán');
      else if (activeTab === 'EXPENSE') outletContext.setSubTitle('Chi phí công trình');
      else outletContext.setSubTitle('');
    }
  }, [activeTab, outletContext?.setSubTitle]);`;

const replacement = `  useEffect(() => {
    if (outletContext?.setSubTitle) {
      if (activeTab === 'TECH') outletContext.setSubTitle('Đặt hàng');
      else if (activeTab === 'DOCS') outletContext.setSubTitle('Chứng từ');
      else if (activeTab === 'FINANCE') outletContext.setSubTitle('Thanh toán');
      else if (activeTab === 'EXPENSE') outletContext.setSubTitle('Chi phí công trình');
      else outletContext.setSubTitle('');
    }
    
    // Clear subtitle when component unmounts (e.g. switching to another main tab)
    return () => {
      if (outletContext?.setSubTitle) {
        outletContext.setSubTitle('');
      }
    };
  }, [activeTab, outletContext?.setSubTitle]);`;

data = data.replace(target, replacement);
fs.writeFileSync(filePath, data);
console.log('Fixed CostPlan unmount');
