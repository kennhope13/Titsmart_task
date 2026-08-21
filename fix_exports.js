const fs = require("fs"); let c = fs.readFileSync("web-admin/src/types/index.ts", "utf8");

c += `
export const PURCHASE_STATUS_OPTIONS = [
  "Không có hàng",
  "Chưa đặt hàng",
  "Đang đặt hàng",
  "Đã đặt hàng",
  "Đang giao",
  "Đã có hàng",
  "Hàng gia công",
];

export const CONSTRUCTION_STATUS_OPTIONS = [
  "Chưa thi công",
  "Đang thi công",
  "Đã thi công",
  "Vướng mắc",
  "Đã kéo dây",
  "Đã lắp thiết bị vào tủ",
  "Đã lắp TB + kéo dây",
  "Đang ETE",
];
`;
fs.writeFileSync("web-admin/src/types/index.ts", c, "utf8");
console.log("Exported options");

