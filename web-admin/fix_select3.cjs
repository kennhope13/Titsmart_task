const fs = require("fs");
let code = fs.readFileSync("src/components/common/CustomSelect.tsx", "utf8");

code = code.replace(/children\?: React\.ReactNode;\r?\n\}/g, "children?: React.ReactNode;\n  searchable?: boolean;\n}");
code = code.replace(/required = false,\r?\n  \.\.\.rest\r?\n\}\) => \{/g, "required = false,\n  searchable = false,\n  ...rest\n}) => {");

fs.writeFileSync("src/components/common/CustomSelect.tsx", code);
console.log("Fixed CRLF issues");

