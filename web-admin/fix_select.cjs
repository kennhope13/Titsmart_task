const fs = require("fs");
let code = fs.readFileSync("src/components/common/CustomSelect.tsx", "utf8");

// Add searchable prop
code = code.replace(
  /children\?: React\.ReactNode;\n\}/g,
  `children?: React.ReactNode;\n  searchable?: boolean;\n}`
);

code = code.replace(
  /const \[isOpen, setIsOpen\] = useState\(false\);/g,
  `const [isOpen, setIsOpen] = useState(false);\n  const [searchTerm, setSearchTerm] = useState("");`
);

// Focus input when opened
code = code.replace(
  /setIsOpen\(\(prev\) => !prev\);/g,
  `setIsOpen((prev) => {\n      if (!prev) setSearchTerm("");\n      return !prev;\n    });`
);

// Filter options
code = code.replace(
  /const dropdownEl = isOpen && !disabled \? \(/g,
  `const filteredOptions = searchable ? options.filter(opt => String(opt.label).toLowerCase().includes(searchTerm.toLowerCase())) : options;\n\n  const dropdownEl = isOpen && !disabled ? (`
);

code = code.replace(
  /\{options\.length === 0 \? \(/g,
  `{searchable && (
        <div className="px-2 py-1 sticky top-0 bg-white z-10 border-b border-slate-100">
          <input
            type="text"
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-primary"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredOptions.length > 0) {
                e.preventDefault();
                handleSelect(filteredOptions[0].value);
              }
            }}
            autoFocus
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {filteredOptions.length === 0 ? (`
);

code = code.replace(
  /options\.map\(\(option, idx\) => \(/g,
  `filteredOptions.map((option, idx) => (`
);

code = code.replace(
  /required = false,\n  \.\.\.rest\n\}\) => \{/g,
  `required = false,\n  searchable = false,\n  ...rest\n}) => {`
);

fs.writeFileSync("src/components/common/CustomSelect.tsx", code);
console.log("Updated CustomSelect");

