const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, TableOfContents, HeadingLevel, AlignmentType, PageBreak, Header, Footer,
} = require("docx");

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Hệ Thống Quản Lý Công Việc Công Trình", font: "Arial", size: 20, color: "999999" })],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Trang ", font: "Arial", size: 20 }),
            ],
          }),
        ],
      }),
    },
    children: [
      new Paragraph({
        text: "TÀI LIỆU DỰ ÁN",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: "Hệ Thống Quản Lý Công Việc Công Trình",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: "BuildCore Pro - Web Admin",
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: "Phiên bản: 1.0",
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: "Ngày lập: 04/08/2026",
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
      new PageBreak(),

      new Paragraph({
        text: "MỤC LỤC",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 300 },
      }),
      new TableOfContents("Mục lục", {
        hyperlink: true,
        headingStyle: "Heading1",
      }),
      new PageBreak(),

      new Paragraph({
        text: "1. TỔNG QUAN DỰ ÁN",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: "Hệ thống Quản lý Công việc Công trình (BuildCore Pro) là một nền tảng quản lý dự án xây dựng toàn diện, được thiết kế để theo dõi tiến độ, vật tư, chi phí, hồ sơ chứng từ và nhân sự trên công trình. Hệ thống cung cấp giao diện web quản trị và ứng dụng di động cho kỹ sư hiện trường.",
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: "Mục tiêu: Tối ưu hóa quy trình quản lý công trình xây dựng, số hóa báo cáo tiến độ, quản lý vật tư, theo dõi chi phí và hồ sơ pháp lý một cách minh bạch, real-time.",
        spacing: { after: 400 },
      }),

      new Paragraph({
        text: "2. CÔNG NGHỆ SỬ DỤNG",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: "2.1 Frontend",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("React 18 + TypeScript + Vite"),
      new Paragraph("React Router DOM v6"),
      new Paragraph("Zustand v4 (State Management)"),
      new Paragraph("Tailwind CSS v3"),
      new Paragraph("Recharts (Biểu đồ)"),
      new Paragraph("Lucide React + Material Symbols (Icon)"),
      new Paragraph("Axios (HTTP Client)"),
      new Paragraph("xlsx, jsPDF, html2canvas (Xuất báo cáo)"),
      new Paragraph("tesseract.js (OCR)"),

      new Paragraph({
        text: "2.2 Backend",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Express.js v5 + TypeScript"),
      new Paragraph("Prisma v7 (ORM)"),
      new Paragraph("PostgreSQL"),
      new Paragraph("tsx (Runtime)"),

      new Paragraph({
        text: "2.3 Mobile",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Expo (React Native)"),
      new Paragraph("React Navigation"),
      new Paragraph("Zustand"),

      new PageBreak(),

      new Paragraph({
        text: "3. CẤU TRÚC THƯ MỤC",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: "Hệ thống được tổ chức theo cấu trúc monorepo với 3 module chính:",
        spacing: { after: 200 },
      }),
      new Paragraph("backend/     - API Server (Express + Prisma + PostgreSQL)"),
      new Paragraph("web-admin/   - Ứng dụng quản trị web (React + Vite)"),
      new Paragraph("mobile-app/  - Ứng dụng di động (Expo/React Native)"),
      new Paragraph("docs/        - Tài liệu yêu cầu, quy trình, API"),
      new Paragraph("database/    - Migration, seed data, sơ đồ DB"),
      new Paragraph("import-excel/ - Template Excel và quy tắc import"),
      new Paragraph("storage/     - Lưu trữ file upload (dev)"),
      new Paragraph("ocr/         - Xử lý OCR"),

      new PageBreak(),

      new Paragraph({
        text: "4. CHỨC NĂNG CHÍNH (WEB ADMIN)",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: "4.1 Dashboard",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Tổng quan tiến độ các dự án (biểu đồ donut + bar/line)"),
      new Paragraph("Thống kê công việc hoàn thành, chậm tiến độ, vướng mắc"),

      new Paragraph({
        text: "4.2 Quản lý Dự án",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Tạo, sửa, xóa dự án"),
      new Paragraph("Import dự án từ file Excel/OCR"),
      new Paragraph("Xem danh sách dự án với tiến độ tổng hợp"),

      new Paragraph({
        text: "4.3 Quản lý Công việc",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Phân cấp công việc theo mục (I, II, III...)"),
      new Paragraph("Cập nhật tiến độ, trạng thái mua hàng, thi công"),
      new Paragraph("Phân công kỹ sư, theo dõi người duyệt"),
      new Paragraph("Đính kèm ảnh minh chứng"),

      new Paragraph({
        text: "4.4 Kế hoạch & Chi phí",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Kế hoạch vật tư: tiêu chuẩn kỹ thuật, tiến độ, đặt hàng, chứng từ"),
      new Paragraph("Mua sắm: hợp đồng, thanh toán, hóa đơn, tạm ứng"),
      new Paragraph("Chi phí công trình: thu/chi, tồn quỹ"),
      new Paragraph("Lương công nhật: thông tin ngân hàng, CCCD, tình trạng thanh toán"),
      new Paragraph("Theo dõi chứng từ: CO, CQ, PCCC"),

      new Paragraph({
        text: "4.5 Quản lý Kho & Vật tư",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Danh mục vật tư & tồn kho"),
      new Paragraph("Nhật ký nhập/xuất kho"),
      new Paragraph("Quản lý đơn hàng, nhà cung cấp"),

      new Paragraph({
        text: "4.6 Theo dõi Hồ sơ",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Quản lý giao nhận công văn, hợp đồng"),
      new Paragraph("Chứng từ thanh toán tạm ứng"),
      new Paragraph("Theo dõi công nợ"),

      new Paragraph({
        text: "4.7 Báo cáo & Xuất dữ liệu",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Xuất Excel, PDF, Word"),
      new Paragraph("Báo cáo tiến độ, vật tư, chi phí"),
      new Paragraph("Import dữ liệu từ Excel hàng loạt"),

      new Paragraph({
        text: "4.8 Nhân sự & Phân quyền",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Quản lý kỹ sư, nhân viên, thợ"),
      new Paragraph("Phân quyền: Admin, Manager, Procurement, Engineer, Viewer"),
      new Paragraph("Nhật ký hoạt động real-time"),

      new Paragraph({
        text: "4.9 Giải quyết Vấn đề",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Theo dõi vấn đề/vướng mắc công trình"),
      new Paragraph("Lịch sử xử lý, chỉ đạo"),
      new Paragraph("Đính kèm ảnh, mức độ ưu tiên"),

      new Paragraph({
        text: "4.10 Nhật ký Hiện trường",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Ghi nhận tiến độ hàng ngày"),
      new Paragraph("Upload ảnh, GPS, mô tả"),
      new Paragraph("Cập nhật trạng thái công việc"),

      new PageBreak(),

      new Paragraph({
        text: "5. KIẾN TRÚC HỆ THỐNG",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: "5.1 Kiến trúc tổng thể",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Hệ thống sử dụng kiến trúc client-server với 3 lớp:"),
      new Paragraph("Frontend: React SPA (Vite)"),
      new Paragraph("Backend: Express.js REST API"),
      new Paragraph("Database: PostgreSQL + Prisma ORM"),
      new Paragraph("Mobile: Expo/React Native (chia sẻ logic với web)"),

      new Paragraph({
        text: "5.2 State Management",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Zustand store tập trung tại src/services/realtimeStore.ts"),
      new Paragraph("Persist vào localStorage (key: buildcore_pro_excel_db_v7)"),
      new Paragraph("BroadcastChannel sync giữa các tab"),
      new Paragraph("Fallback seed data khi API offline"),

      new Paragraph({
        text: "5.3 Data Flow",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("API sync: realtimeStore ↔ backend REST API"),
      new Paragraph("Excel Import: File → XLSX parse → validate → upsert vào store"),
      new Paragraph("OCR: Image → Tesseract.js → extract fields → auto-fill forms"),
      new Paragraph("Export: Store data → XLSX/PDF/Word generation"),

      new PageBreak(),

      new Paragraph({
        text: "6. CƠ SỞ DỮ LIỆU",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: "6.1 Các bảng chính",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Project: Thông tin dự án, tiến độ, trạng thái"),
      new Paragraph("Task: Công việc phân cấp, tiến độ, phân công"),
      new Paragraph("Material: Vật tư, tồn kho, quy cách"),
      new Paragraph("InventoryTransaction: Nhập/xuất kho"),
      new Paragraph("ProjectMaterialPlan: Kế hoạch vật tư"),
      new Paragraph("ProjectPurchasing: Mua sắm, hợp đồng"),
      new Paragraph("ProjectExpense: Chi phí công trình"),
      new Paragraph("LaborPayroll: Lương công nhật"),
      new Paragraph("DocumentTrack: Theo dõi hồ sơ"),
      new Paragraph("Issue: Vấn đề/vướng mắc"),
      new Paragraph("FieldLog: Nhật ký hiện trường"),
      new Paragraph("Engineer/User: Nhân sự, phân quyền"),
      new Paragraph("ActivityLog: Nhật ký hoạt động"),

      new Paragraph({
        text: "6.2 Quan hệ chính",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Project 1:N Task, Material, Expense, FieldLog"),
      new Paragraph("Task có self-referencing (section headers)"),
      new Paragraph("Material 1:N InventoryTransaction"),
      new Paragraph("ProjectMaterialPlan N:1 Project"),
      new Paragraph("ProjectPurchasing N:1 Project"),
      new Paragraph("Issue N:1 Project, có timeline logs"),

      new PageBreak(),

      new Paragraph({
        text: "7. GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: "7.1 Layout",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Sidebar cố định bên trái (w-60)"),
      new Paragraph("Nội dung chính bên phải (ml-60)"),
      new Paragraph("Header sticky với tiêu đề trang"),
      new Paragraph("Tab system đồng nhất trên toàn bộ ứng dụng"),

      new Paragraph({
        text: "7.2 Màu sắc & Typography",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Palette: Slate (neutral), Blue (primary), Emerald (success), Amber (warning), Rose (danger)"),
      new Paragraph("Font: UI Sans-serif, System UI"),
      new Paragraph("Tab buttons: 12px, weight 800, icon 20px"),
      new Paragraph("Border-bottom active indicator style"),

      new Paragraph({
        text: "7.3 Responsive",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Grid responsive: grid-cols-1 lg:grid-cols-3"),
      new Paragraph("Flex responsive: flex-col md:flex-row"),
      new Paragraph("Table: overflow-x-auto với min-width"),

      new PageBreak(),

      new Paragraph({
        text: "8. TÍNH NĂNG NỔI BẬT",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph("Excel-Centric: Import/export hàng loạt từ Excel"),
      new Paragraph("OCR Support: Trích xuất dữ liệu từ ảnh/PDF"),
      new Paragraph("Real-time Sync: BroadcastChannel giữa các tab"),
      new Paragraph("Offline Mode: localStorage fallback"),
      new Paragraph("Multi-language: Tiếng Việt với chuẩn hóa Unicode"),
      new Paragraph("Role-based Access: Phân quyền chi tiết"),
      new Paragraph("Mobile App: Expo app cho kỹ sư hiện trường"),
      new Paragraph("Reporting: PDF, Excel, Word export"),

      new PageBreak(),

      new Paragraph({
        text: "9. TRIỂN KHAI & VẬN HÀNH",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: "9.1 Yêu cầu hệ thống",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Node.js >= 18"),
      new Paragraph("PostgreSQL >= 14"),
      new Paragraph("npm hoặc pnpm"),

      new Paragraph({
        text: "9.2 Cài đặt",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Backend: cd backend && npm install && npm run dev (port 3001)"),
      new Paragraph("Web Admin: cd web-admin && npm install && npm run dev (port 5173)"),
      new Paragraph("Mobile: cd mobile-app && npm install && npx expo start"),

      new Paragraph({
        text: "9.3 Database",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph("Prisma migrate: npx prisma migrate dev"),
      new Paragraph("Seed data: npx prisma db seed"),
      new Paragraph("Studio: npx prisma studio"),

      new PageBreak(),

      new Paragraph({
        text: "10. KẾ HOẠCH PHÁT TRIỂN",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph("Tích hợp đăng nhập/JWT authentication"),
      new Paragraph("Push notification cho mobile"),
      new Paragraph("Dashboard analytics nâng cao"),
      new Paragraph("Tích hợp SMS/Email notification"),
      new Paragraph("Multi-language support (Tiếng Anh)"),
      new Paragraph("Docker containerization"),
      new Paragraph("CI/CD pipeline"),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const outputPath = path.join(__dirname, "..", "TAI_LIEU_DU_AN_He_Thong_Quan_Ly_Cong_Viec_Cong_Trinh.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log("Da tao file DOCX tai:", outputPath);
});
