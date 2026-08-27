const fs = require('fs');
let code = fs.readFileSync('src/components/common/CustomSelect.tsx', 'utf8');

code = code.replace(
  "interface CustomSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {",
  "interface CustomSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {\n  placeholder?: string;"
);

// We should also pass placeholder down to the input inside CustomSelect.tsx if it's there.
code = code.replace(
  /className="w-full h-full min-h-\[30px\] outline-none bg-transparent appearance-none border-none"/,
  'className="w-full h-full min-h-[30px] outline-none bg-transparent appearance-none border-none" placeholder={props.placeholder}'
);

fs.writeFileSync('src/components/common/CustomSelect.tsx', code);
