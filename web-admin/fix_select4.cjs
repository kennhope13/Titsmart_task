const fs = require("fs");
let code = fs.readFileSync("src/components/common/CustomSelect.tsx", "utf8");

code = code.replace(
  "const filteredOptions = searchable ? options.filter(opt => String(opt.label).toLowerCase().includes(searchTerm.toLowerCase())) : options;",
  `const extractText = (node: any): string => {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (node && typeof node === "object" && node.props && node.props.children) return extractText(node.props.children);
    return "";
  };
  const filteredOptions = searchable ? options.filter(opt => extractText(opt.label).toLowerCase().includes(searchTerm.toLowerCase())) : options;`
);

fs.writeFileSync("src/components/common/CustomSelect.tsx", code);
console.log("Fixed text extraction");

