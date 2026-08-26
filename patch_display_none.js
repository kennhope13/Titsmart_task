const fs = require('fs');
const file = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let data = fs.readFileSync(file, 'utf8');

const target = `style={{ display: subTab === "DOCS" ? "none" : "flex" }}`;
if (data.includes(target)) {
  data = data.replace(target, '');
  fs.writeFileSync(file, data);
  console.log("Replaced");
} else {
  console.log("Not found");
}
