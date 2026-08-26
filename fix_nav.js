const fs = require('fs');

const filePath = 'web-admin/src/components/layout/Sidebar.tsx';
let f = fs.readFileSync(filePath, 'utf8');

// The file currently has </nav> TWICE. One before the user profile div, and one at the end.
// We need to remove the one at the end.
const endOfFile = `        </div>
      </nav>
    </aside>
  );
};`;

const newEndOfFile = `        </div>
    </aside>
  );
};`;

f = f.replace(endOfFile, newEndOfFile);
fs.writeFileSync(filePath, f);
console.log('Fixed');
