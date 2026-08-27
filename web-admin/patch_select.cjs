const fs = require('fs');
let code = fs.readFileSync('src/components/common/CustomSelect.tsx', 'utf8');

code = code.replace(
  /setSearchTerm\(e\.target\.value\);\r?\n\s*if \(\!isOpen\) openDropdown\(\);/,
  'setSearchTerm(e.target.value);\n              if (!isOpen) openDropdown();\n              if (allowCustomInput && onChange) {\n                onChange({ target: { value: e.target.value } } as any);\n              }'
);

code = code.replace(
  /if \(e\.key === "Enter" && filteredOptions\.length > 0\) \{\r?\n\s*e\.preventDefault\(\);\r?\n\s*handleSelect\(filteredOptions\[0\]\.value\);\r?\n\s*\}/,
  'if (e.key === "Enter") {\n                e.preventDefault();\n                if (filteredOptions.length > 0) {\n                  handleSelect(filteredOptions[0].value);\n                } else if (allowCustomInput) {\n                  handleSelect(searchTerm);\n                }\n              }'
);

fs.writeFileSync('src/components/common/CustomSelect.tsx', code);
