const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf-8');
c = c.replace(/import \{ UpdateNotifier \} from '\.\/components\/common\/UpdateNotifier';/, "import { UpdateNotifier } from './components/common/UpdateNotifier';\nimport { GlobalNotificationToast } from './components/common/GlobalNotificationToast';");
c = c.replace(/<UpdateNotifier \/>/, "<UpdateNotifier />\n      <GlobalNotificationToast />");
fs.writeFileSync('src/App.tsx', c);
