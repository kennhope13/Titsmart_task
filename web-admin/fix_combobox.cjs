const fs = require("fs");
let code = fs.readFileSync("src/components/common/CustomSelect.tsx", "utf8");

const triggerRegex = /<button[\s\S]*?<\/button>/;
const triggerReplacement = `
      {searchable ? (
        <div className={triggerClassName} onClick={handleOpen} style={{ cursor: disabled ? "not-allowed" : "text" }}>
          <input
            type="text"
            className="w-full h-full bg-transparent border-none outline-none pr-6"
            style={{ color: "inherit", fontWeight: "inherit", fontSize: "inherit", margin: 0, padding: 0 }}
            placeholder="-- Chọn --"
            disabled={disabled}
            value={isOpen ? searchTerm : (typeof displayLabel === "string" ? displayLabel : extractText(displayLabel)) || ""}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) handleOpen();
            }}
            onFocus={() => { if (!isOpen) handleOpen(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredOptions.length > 0) {
                e.preventDefault();
                handleSelect(filteredOptions[0].value);
              }
            }}
          />
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className={\`w-4 h-4 text-slate-400 transition-transform duration-200 \${isOpen ? "rotate-180" : ""}\`} />
          </span>
        </div>
      ) : (
        <button
          type="button"
          className={triggerClassName}
          onClick={handleOpen}
          disabled={disabled}
        >
          <span className="block truncate min-w-0 flex-1 pr-6" title={typeof displayLabel === "string" ? displayLabel : ""}>{displayLabel || "\\u00A0"}</span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className={\`w-4 h-4 text-slate-400 transition-transform duration-200 \${isOpen ? "rotate-180" : ""}\`} />
          </span>
        </button>
      )}
`;

code = code.replace(triggerRegex, triggerReplacement);

const searchInputRegex = /\{searchable && \([\s\S]*?<\/div>\r?\n      \)\}/;
code = code.replace(searchInputRegex, "");

fs.writeFileSync("src/components/common/CustomSelect.tsx", code);
console.log("Fixed Combobox");

