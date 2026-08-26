const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

if (!code.includes('createPortal')) {
  code = code.replace(
    "import React, { useEffect, useMemo, useRef, useState } from 'react';",
    "import React, { useEffect, useMemo, useRef, useState } from 'react';\nimport { createPortal } from 'react-dom';\nimport { useOutletContext } from 'react-router-dom';"
  );
}

if (!code.includes('const [portalNode, setPortalNode]')) {
  code = code.replace(
    'const [isUploadOpen, setIsUploadOpen] = useState(false);',
    'const outletContext = useOutletContext<any>();\n  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);\n  useEffect(() => { setPortalNode(document.getElementById(\'project-header-actions\')); }, []);\n  const [isUploadOpen, setIsUploadOpen] = useState(false);'
  );
}

fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', code);
console.log('Fixed state in FieldLogsPage');
