const fs = require('fs');

const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

const target = `  const [subTitle, setSubTitle] = useState('');`;
const replacement = `  const [subTitle, setSubTitle] = useState('');

  // Clear subtitle on main tab change
  useEffect(() => {
    setSubTitle('');
  }, [location.pathname]);`;

data = data.replace(target, replacement);

fs.writeFileSync(filePath, data);
console.log('Fixed subTitle clearing');
