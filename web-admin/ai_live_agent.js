import puppeteer from 'puppeteer-core';
import { exec } from 'child_process';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA = 'C:\\Users\\MSI\\AppData\\Local\\Temp\\ai_chrome_live_test';

async function bringToFront() {
  exec(`powershell -Command "$w = New-Object -ComObject WScript.Shell; $w.AppActivate('TITSMART'); $w.AppActivate('Chrome')"`);
}

async function runLiveAIOperation() {
  console.log('--- KHỞI ĐỘNG CHROME VÀ BẮT ĐẦU THAO TÁC TRỰC TIẾP TRÊN MÀN HÌNH ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    userDataDir: USER_DATA,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--app=http://localhost:5173' // Mở dạng App Window để nổi bật trên Desktop
    ]
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  // Tạo con trỏ chuột ảo màu đỏ cực to và banner hiển thị thao tác của AI
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('DOMContentLoaded', () => {
      // Banner AI
      const banner = document.createElement('div');
      banner.id = 'ai-status-banner';
      banner.style.position = 'fixed';
      banner.style.top = '12px';
      banner.style.left = '50%';
      banner.style.transform = 'translateX(-50%)';
      banner.style.zIndex = '999999';
      banner.style.background = '#2563eb';
      banner.style.color = '#ffffff';
      banner.style.padding = '8px 20px';
      banner.style.borderRadius = '9999px';
      banner.style.fontSize = '14px';
      banner.style.fontWeight = 'bold';
      banner.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
      banner.style.transition = 'all 0.3s ease';
      banner.innerText = '🤖 ANTIGRAVITY AI ĐANG ĐIỀU KHIỂN...';
      document.body.appendChild(banner);

      // Con trỏ chuột ảo
      const cursor = document.createElement('div');
      cursor.id = 'ai-mouse-cursor';
      cursor.style.position = 'fixed';
      cursor.style.width = '24px';
      cursor.style.height = '24px';
      cursor.style.borderRadius = '50%';
      cursor.style.background = 'rgba(239, 68, 68, 0.85)';
      cursor.style.border = '3px solid white';
      cursor.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.8)';
      cursor.style.zIndex = '9999999';
      cursor.style.pointerEvents = 'none';
      cursor.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
      cursor.style.transform = 'translate(-50%, -50%)';
      cursor.style.left = '50%';
      cursor.style.top = '50%';
      document.body.appendChild(cursor);
    });
  });

  async function updateStatus(text) {
    console.log(text);
    await page.evaluate((t) => {
      const b = document.getElementById('ai-status-banner');
      if (b) b.innerText = `🤖 AI: ${t}`;
    }, text);
  }

  async function moveCursorAndClick(selectorOrText) {
    await page.evaluate((selectorText) => {
      const all = Array.from(document.querySelectorAll('button, a, input, tr, th, td, div, span'));
      const target = all.find(el => (el.textContent && el.textContent.trim().includes(selectorText)) || el.placeholder?.includes(selectorText) || el.matches?.(selectorText));
      
      const cursor = document.getElementById('ai-mouse-cursor');
      if (target && cursor) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = target.getBoundingClientRect();
        cursor.style.left = `${rect.left + rect.width / 2}px`;
        cursor.style.top = `${rect.top + rect.height / 2}px`;

        target.style.outline = '3px solid #ef4444';
        target.style.boxShadow = '0 0 18px rgba(239, 68, 68, 0.9)';
        setTimeout(() => {
          target.style.outline = '';
          target.style.boxShadow = '';
        }, 1200);

        target.click();
        if (target.focus) target.focus();
      }
    }, selectorOrText);
    await new Promise(r => setTimeout(r, 1800));
  }

  try {
    await bringToFront();
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await bringToFront();
    await new Promise(r => setTimeout(r, 2000));

    // Kiểm tra trang login
    const isLogin = await page.$('input[type="text"], input[type="password"]');
    if (isLogin) {
      await updateStatus('Đang tự động nhập tên đăng nhập "admin"...');
      const inputs = await page.$$('input');
      if (inputs.length >= 2) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type('admin', { delay: 100 });
        await new Promise(r => setTimeout(r, 800));

        await updateStatus('Đang tự động nhập mật khẩu "admin123"...');
        await inputs[1].click({ clickCount: 3 });
        await inputs[1].type('admin123', { delay: 100 });
        await new Promise(r => setTimeout(r, 800));

        await updateStatus('Đang bấm nút Đăng nhập...');
        await moveCursorAndClick('Đăng nhập');
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    await bringToFront();
    await updateStatus('Đang mở trang Giao việc (Task Assignment)...');
    await page.goto('http://localhost:5173/task-assignment', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    await updateStatus('Đang kiểm tra Tab "Cần phân công"...');
    await moveCursorAndClick('Cần phân công');
    await new Promise(r => setTimeout(r, 2500));

    await updateStatus('Đang click chuyển sang Tab "Đang thực hiện"...');
    await moveCursorAndClick('Đang thực hiện');
    await new Promise(r => setTimeout(r, 2500));

    await updateStatus('Đang click chuyển sang Tab "Đã hoàn thành"...');
    await moveCursorAndClick('Đã hoàn thành');
    await new Promise(r => setTimeout(r, 2500));

    await updateStatus('Đang click vào công việc hoàn thành để xem chi tiết dự án...');
    await moveCursorAndClick('Thiết bị đồng hồ GPS');
    await new Promise(r => setTimeout(r, 3000));

    await updateStatus('Đang điều hướng về trang Tất cả dự án...');
    await page.goto('http://localhost:5173/projects', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));

    await updateStatus('✅ AI ĐÃ HOÀN TẤT BÀI THAO TÁC MẪU TRỰC TIẾP!');
    console.log('=== AI ĐÃ THAO TÁC XONG TRỰC TIẾP TRÊN MÀN HÌNH ===');

    // Giữ cửa sổ mở liên tục để người dùng quan sát
    await new Promise(r => setTimeout(r, 600000));
  } catch (err) {
    console.error('Lỗi khi thao tác:', err);
  }
}

runLiveAIOperation();
