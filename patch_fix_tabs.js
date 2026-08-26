const fs = require('fs');
const filePath = 'web-admin/src/pages/DocumentTrackingPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

const startIdx = data.indexOf("{[");
const endStr = "].map(tab => (";
const endIdx = data.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx && (endIdx - startIdx) < 2000) {
  const tabsBlock = data.substring(startIdx, endIdx + endStr.length);
  
  if (tabsBlock.includes("'overview'") && tabsBlock.includes("'delivery'")) {
    const newTabs = `{[
              { id: 'overview', label: 'Thông tin Giao nhận', icon: 'local_shipping', count: filteredTracks.length },
              { id: 'finance', label: 'Tạm ứng & Thanh toán', icon: 'payments', count: filteredTracks.filter(t => !t.paymentStatus?.includes('Đã')).length }
              ].map(tab => (` ;
    data = data.replace(tabsBlock, newTabs);
    fs.writeFileSync(filePath, data);
    console.log('Fixed tabs');
  } else {
    console.log('Tabs block not found correctly');
  }
} else {
  console.log('Indices not found correctly');
}
