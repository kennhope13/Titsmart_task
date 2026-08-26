const fs = require('fs');
const version = process.env.version || '1.0.0';

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; }
        .header { background: #007bff; color: white; padding: 15px 20px; border-radius: 5px 5px 0 0; text-align: center; }
        .content { padding: 20px 0; }
        .footer { font-size: 12px; color: #888; text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">🎉 Bản Cập Nhật Mới (v${version})</h2>
        </div>
        <div class="content">
            <p>Chào bạn,</p>
            <p>Hệ thống Quản lý Dự án TITSMART vừa có bản cập nhật mới nhất <b>v${version}</b>.</p>
            <p>Bản cập nhật bao gồm:</p>
            <ul>
                <li>Cập nhật giao diện tự động</li>
                <li>Khắc phục lỗi Import file và lỗi số liệu</li>
                <li>Nâng cấp hiệu năng hoạt động</li>
            </ul>
            <p>Hệ thống sẽ tự động tải về khi bạn mở ứng dụng. Hoặc bạn có thể lên trang GitHub Releases để tải bản cài đặt mới nhất.</p>
        </div>
        <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Kỹ thuật TITSMART</p>
        </div>
    </div>
</body>
</html>
`;

fs.writeFileSync('mail_body.html', htmlContent, 'utf8');
console.log('mail_body.html generated successfully.');
