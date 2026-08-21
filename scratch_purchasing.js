const fs = require("fs"); let c = fs.readFileSync("web-admin/src/pages/cost-plan/PurchasingTab.tsx", "utf8");
c = c.replace(/<option value="([^"]+)">([^<]+)<\/option>/g, (match, p1, p2) => {
  return `<option value="${p1}" className={getStatusColorStyle("${p1}")}>${p2}</option>`;
});
fs.writeFileSync("web-admin/src/pages/cost-plan/PurchasingTab.tsx", c);
console.log("Replaced PurchasingTab");

