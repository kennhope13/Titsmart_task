import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runLiveVisualTest() {
  console.log('--- ĐANG MỞ CỬA SỔ GOOGLE CHROME TRÊN MÀN HÌNH CỦA BẠN ---');
  
  // Khởi động Chrome thật hiển thị trực tiếp trên màn hình máy tính
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // MỞ CỬA SỔ THẬT HIỂN THỊ TRÊN MÀN HÌNH
    defaultViewport: null, // Sử dụng full kích thước cửa sổ
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--auto-open-devtools-for-tabs=false'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  // Helper để vẽ con trỏ hoặc highlight trực quan khi AI thao tác
  async function visualHighlight(selectorText) {
    await page.evaluate((text) => {
      const all = Array.from(document.querySelectorAll('button, a, tr, th, td, div, span'));
      const target = all.find(el => el.textContent && el.textContent.trim().includes(text));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const prevOutline = target.style.outline;
        const prevBoxShadow = target.style.boxShadow;
        target.style.outline = '4px solid #ef4444';
        target.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.8)';
        setTimeout(() => {
          target.style.outline = prevOutline;
          target.style.boxShadow = prevBoxShadow;
        }, 1500);
      }
    }, selectorText);
  }

  try {
    console.log('1. Đang mở trang localhost:5173...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    // Đăng nhập Admin
    await page.evaluate(() => {
      const adminUser = {
        id: 'admin-001',
        username: 'admin',
        name: 'Quản trị viên (Admin)',
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

    console.log('2. Điều hướng vào trang Tất cả dự án...');
    await page.goto('http://localhost:5173/projects', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Highlight một dự án
    await visualHighlight('Trạm biến áp 110kV Phước Tân');
    await new Promise(r => setTimeout(r, 2000));

    console.log('3. Mở trang Giao việc (Task Assignment)...');
    await page.goto('http://localhost:5173/task-assignment', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Highlight tab Cần phân công
    await visualHighlight('Cần phân công');
    await new Promise(r => setTimeout(r, 2000));

    // Click tab Đang thực hiện
    console.log('4. AI đang click vào tab [Đang thực hiện]...');
    await visualHighlight('Đang thực hiện');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent && x.textContent.includes('Đang thực hiện'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    // Click tab Đã hoàn thành
    console.log('5. AI đang click vào tab [Đã hoàn thành]...');
    await visualHighlight('Đã hoàn thành');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent && x.textContent.includes('Đã hoàn thành'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    // Highlight công việc đã hoàn thành
    await visualHighlight('Thiết bị đồng hồ GPS');
    await new Promise(r => setTimeout(r, 2000));

    console.log('6. AI đang click vào dòng công việc để chuyển thẳng vào dự án...');
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const targetRow = rows.find(r => r.textContent && r.textContent.includes('Thiết bị đồng hồ GPS'));
      if (targetRow) targetRow.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    console.log('=== HOÀN TẤT THAO TÁC TRỰC QUAN TRÊN GOOGLE CHROME ===');
    console.log('👉 CỬA SỔ CHROME SẼ ĐƯỢC GIỮ NGUYÊN TRÊN MÀN HÌNH ĐỂ BẠN TỰ DO XEM VÀ THAO TÁC TIẾP!');
    
    // Giữ cửa sổ mở 5 phút (300 giây) để người dùng xem và thao tác
    await new Promise(r => setTimeout(r, 300000));
  } catch (err) {
    console.error('Lỗi thao tác:', err);
  }
}

runLiveVisualTest();
