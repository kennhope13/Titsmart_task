const fs = require('fs');

const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

// Add useNavigate if it's not imported
if (!data.includes('useNavigate')) {
  data = data.replace('import { useParams, Link, useLocation, Outlet, Navigate } from \'react-router-dom\';', 'import { useParams, Link, useLocation, Outlet, Navigate, useNavigate } from \'react-router-dom\';');
}

// Add the click handler inside the component
if (!data.includes('handleTabClick')) {
  data = data.replace('const [subTitle, setSubTitle] = useState(\'\');', 'const [subTitle, setSubTitle] = useState(\'\');\n  const navigate = useNavigate();\n\n  const handleTabClick = (e: React.MouseEvent, path: string) => {\n    e.preventDefault();\n    navigate(path, { replace: true, state: { reset: Date.now() } });\n  };');
}

// Replace the <a> tag with an <a> tag that has onClick
const aTagRegex = /<a href=\{activeTab\.path\}[^>]*>([\s\S]*?)<\/a>/;
data = data.replace(aTagRegex, '<a href={activeTab.path} onClick={(e) => handleTabClick(e, activeTab.path)} className="text-[15px] font-bold text-slate-700 hover:text-primary transition-colors shrink-0 cursor-pointer">$1</a>');

// Update Outlet key
data = data.replace('<Outlet context={{ setSubTitle }} />', '<Outlet context={{ setSubTitle }} key={location.state?.reset || location.pathname} />');

fs.writeFileSync(filePath, data);
console.log('Fixed navigation state reset');
