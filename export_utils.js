const fs = require("fs"); let c = fs.readFileSync("web-admin/src/types/index.ts", "utf8");
c += `
export const normalizeStatusText = (value?: string) => (value || "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\\u0300-\\u036f]/g, "")
  .replace(/đ/g, "d");

export const purchaseProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === "khong co hang" || clean === "chua dat hang") return 0;
  if (clean === "dang dat hang") return 0.3;
  if (clean === "da dat hang") return 0.6;
  if (clean === "dang giao" || clean === "dang giao hang") return 0.85;
  if (clean === "da co hang" || clean === "da nhan du" || clean === "hang gia cong") return 1;
  return 0;
};

export const constructionProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === "chua thi cong" || clean === "dang vuong mac") return 0;
  if (clean === "vuong mac") return 0.2;
  if (clean === "da keo day" || clean === "da lap thiet bi vao tu") return 0.2;
  if (clean === "da lap tb + keo day") return 0.3;
  if (clean === "dang ete") return 0.4;
  if (clean === "dang thi cong") return 0.5;
  if (clean === "da thi cong" || clean === "da hoan thanh") return 1;
  return 0;
};

export const calculateAutoProgressPercent = (purchaseStatus?: string, constrStatus?: string) =>
  Math.round((purchaseProgressScore(purchaseStatus) * 0.5 + constructionProgressScore(constrStatus) * 0.5) * 100);

export const calculateAutoProgressRatio = (purchaseStatus?: string, constrStatus?: string) =>
  calculateAutoProgressPercent(purchaseStatus, constrStatus) / 100;
`;
fs.writeFileSync("web-admin/src/types/index.ts", c, "utf8");

