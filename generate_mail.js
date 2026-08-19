const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./web-admin/public/version.json', 'utf8'));
const version = data.version;
const notes = data.notes.map(n => `<li>${n}</li>`).join('');
const repo = process.env.GITHUB_REPOSITORY;
const downloadLink = `https://github.com/${repo}/releases/tag/v${version}`;

const html = `
<h2>TITSMART Project Manager - Thông báo cập nhật phần mềm</h2>
<p>Chào bạn,</p>
<p>Hệ thống đã phát hành thành công phiên bản <strong>v${version}</strong>.</p>
<h3>Nội dung cập nhật / Fix lỗi:</h3>
<ul>
  ${notes}
</ul>
<p><strong>🔗 Link tải xuống phiên bản mới:</strong> <a href="${downloadLink}">${downloadLink}</a></p>
<br>
<p>Trân trọng,<br>Hệ thống tự động TITSMART</p>
`;

fs.writeFileSync('mail_body.html', html);
console.log('Successfully generated mail_body.html');
