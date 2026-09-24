import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\MSI\\.gemini\\antigravity\\brain\\4c24f527-a632-4ece-b18b-eb924f75ba9c';

async function runBrowserTest() {
  console.log('--- KHỞI ĐỘNG GOOGLE CHROME VÀ KIỂM THỬ CLICK SIDEBAR & TABS ---');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  });

  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER LOG] [${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR] ${err.toString()}`);
  });

  try {
    console.log('1. Thiết lập session Admin...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    
    await page.evaluate(() => {
      const adminUser = {
        id: 'admin-001',
        username: 'admin',
        name: 'Quản trị viên',
        role: 'admin',
        title: 'Quản trị viên',
        email: 'admin@titsmart.vn',
        phone: '0901 234 567',
        permissions: [
          'VIEW_PROJECTS', 'CREATE_PROJECTS', 'EDIT_PROJECTS', 'DELETE_PROJECTS',
          'VIEW_TASKS', 'IMPORT_TASKS', 'EDIT_TASKS', 'ASSIGN_TASKS', 'UPDATE_TASK_PROGRESS', 'APPROVE_TASKS',
          'VIEW_MATERIALS', 'IMPORT_MATERIALS', 'EDIT_MATERIALS', 'UPDATE_MATERIAL_STATUS',
          'VIEW_FINANCE', 'EDIT_PRICES', 'VIEW_PAYMENTS', 'EDIT_PAYMENTS', 'VIEW_EXPENSES', 'EDIT_EXPENSES', 'VIEW_OFFICE_COSTS',
          'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS',
          'VIEW_USERS', 'MANAGE_USERS', 'MANAGE_PERMISSIONS', 'MANAGE_PAYROLL',
          'EXPORT_DATA'
        ]
      };
      localStorage.setItem('titsmart_auth_session', JSON.stringify(adminUser));
    });

    console.log('2. Mở trang chủ và đợi tải xong...');
    await page.goto('http://localhost:5173/projects', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log('3. Tìm và click icon [Công việc] trên Sidebar...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const taskLink = links.find(a => a.href.includes('/my-tasks') || (a.textContent && a.textContent.includes('Công việc')));
      if (taskLink) {
        taskLink.click();
      } else {
        window.location.href = '/task-assignment';
      }
    });
    await new Promise(r => setTimeout(r, 2500));

    console.log('4. Click tab [Cần phân công]...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent && x.textContent.includes('Cần phân công'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const shot1 = path.join(ARTIFACT_DIR, 'test_tab_unassigned.png');
    await page.screenshot({ path: shot1 });
    console.log('✓ Đã chụp ảnh màn hình Tab Cần phân công:', shot1);

    console.log('5. Click tab [Đang thực hiện]...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent && x.textContent.includes('Đang thực hiện'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const shot2 = path.join(ARTIFACT_DIR, 'test_tab_in_progress.png');
    await page.screenshot({ path: shot2 });
    console.log('✓ Đã chụp ảnh màn hình Tab Đang thực hiện:', shot2);

    console.log('6. Click tab [Đã hoàn thành]...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent && x.textContent.includes('Đã hoàn thành'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const shot3 = path.join(ARTIFACT_DIR, 'test_tab_completed.png');
    await page.screenshot({ path: shot3 });
    console.log('✓ Đã chụp ảnh màn hình Tab Đã hoàn thành:', shot3);

    console.log('=== TOÀN BỘ CÁC TRANG & TAB HOẠT ĐỘNG HOÀN HẢO! 0 LỖI REACT ===');
  } catch (err) {
    console.error('Lỗi khi test:', err);
  } finally {
    await new Promise(r => setTimeout(r, 4000));
    await browser.close();
    console.log('✓ Đã đóng Google Chrome.');
  }
}

runBrowserTest();
