const fs = require("fs");
let code = fs.readFileSync("src/pages/MaterialTrackingPage.tsx", "utf8");

code = code.replace(
  /<option value="" disabled>-- Chọn vật tư --<\/option>/g,
  ""
);

fs.writeFileSync("src/pages/MaterialTrackingPage.tsx", code);
console.log("Removed -- Chọn vật tư -- option");

