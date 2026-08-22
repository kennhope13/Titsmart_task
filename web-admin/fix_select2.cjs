const fs = require("fs");
let code = fs.readFileSync("src/components/common/CustomSelect.tsx", "utf8");

// Fix Interface
code = code.replace(
  /children\?: React\.ReactNode;\n\}/g,
  `children?: React.ReactNode;\n  searchable?: boolean;\n}`
);

// Fix Destructuring
code = code.replace(
  /required = false,\n  \.\.\.rest\n\}\) => \{/g,
  `required = false,\n  searchable = false,\n  ...rest\n}) => {`
);

fs.writeFileSync("src/components/common/CustomSelect.tsx", code);
console.log("Fixed CustomSelect TS errors");

