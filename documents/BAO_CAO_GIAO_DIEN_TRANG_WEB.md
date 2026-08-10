# BÁO CÁO VỀ GIAO DIỆN TRANG WEB
## HỆ THỐNG QUẢN LÝ CÔNG VIỆC — TITSMART

---

## 1. TỔNG QUAN

Trang web **TITSMART** là giao diện quản trị (Admin/Web) dành cho **Admin, Manager và Procurement** để quản lý toàn bộ dự án xây dựng, bao gồm: tiến độ công việc, vật tư thiết bị, vấn đề/vướng mắc, kế hoạch chi phí, nhân sự, tài liệu và báo cáo. Hệ thống được thiết kế theo mô hình 3 tầng: Backend API, Web Admin, và Mobile App.

---

## 2. CÔNG NGHỆ SỬ DỤNG

### 2.1. Backend (API Server)

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| Node.js + Express | ^5.2.1 | Server API RESTful |
| TypeScript | ^7.0.2 | Ngôn ngữ lập trình backend |
| Prisma ORM | ^7.9.0 | Truy vấn cơ sở dữ liệu |
| PostgreSQL | — | Cơ sở dữ liệu chính |
| @prisma/adapter-pg | ^7.9.0 | Adapter PostgreSQL cho Prisma |
| cors | ^2.8.6 | Xử lý Cross-Origin requests |
| dotenv | ^17.4.2 | Quản lý biến môi trường |
| xlsx | ^0.18.5 | Đọc/ghi file Excel |
| tsx | ^4.23.1 | Chạy TypeScript trực tiếp |

### 2.2. Web Admin (Frontend)

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| React | ^18.2.0 | Thư viện UI chính |
| React Router DOM | ^6.22.3 | Điều hướng đa trang |
| TypeScript | ^5.2.2 | Kiểu dữ liệu tĩnh |
| Vite | ^5.1.6 | Build tool & dev server |
| Tailwind CSS | ^3.4.1 | Styling utility-first |
| @tanstack/react-query | ^5.28.9 | Quản lý state server & caching |
| Zustand | ^4.5.2 | State management toàn cục |
| Axios | ^1.18.1 | Gọi API HTTP |
| Recharts | ^2.12.3 | Biểu đồ thống kê |
| Lucide React | ^0.359.0 | Icons |
| clsx + tailwind-merge | ^2.x | Kết hợp CSS classes |
| jspdf | ^2.5.1 | Xuất báo cáo PDF |
| docx | ^9.7.1 | Xuất báo cáo Word |
| mammoth | ^1.12.0 | Chuyển đổi DOCX sang HTML |
| pdfjs-dist | ^6.1.200 | Xem file PDF trong trình duyệt |
| html2canvas | ^1.4.1 | Chụp ảnh màn hình element |
| Tesseract.js | ^7.0.0 | Nhận dạng OCR từ ảnh |
| xlsx | ^0.18.5 | Đọc/ghi Excel |

### 2.3. Mobile App

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| React Native | 0.86.0 | Framework mobile |
| Expo | ~57.0.8 | Nền tảng phát triển mobile |
| React Navigation | ^7.x | Điều hướng mobile |
| Zustand | ^5.0.14 | State management |
| Axios | ^1.18.1 | Gọi API |
| Tesseract.js | ^7.0.0 | OCR trên mobile |
| lucide-react-native | ^1.25.0 | Icons cho mobile |

### 2.4. Cơ sở dữ liệu & Triển khai

- **PostgreSQL** — cơ sở dữ liệu quan hệ chính
- **Prisma** — ORM và migration management
- **Docker** (docker-compose.postgres.yml) — triển khai database
- **Prisma schema** định nghĩa 16 model chính: User, Project, Task, TaskAssignment, Material, InventoryTransaction, ProgressUpdate, Issue, IssueComment, Attachment, Notification, ActivityLog, ProjectMaterialPlan, ProjectPurchasing, ProjectExpense, LaborPayroll, DocumentTrack

---

## 3. CẤU TRÚC GIAO DIỆN TRANG WEB

### 3.1. Kiến trúc UI

Trang web sử dụng bố cục Layout 2 cột cố định:

- **Sidebar trái** (240px): Menu điều hướng chính, nhóm theo mục, hỗ trợ thu gọn
- **Header trên**: Thanh tiêu đề trang
- **Nội dung chính**: Khu vực hiển thị nội dung động theo route

### 3.2. Các trang (Pages) trong Web Admin

| Route | Trang | Chức năng chính |
|---|---|---|
| `/` | Dashboard | Tổng quan tiến độ, biểu đồ thống kê, thông tin dự án |
| `/projects` | Quản lý dự án | Danh sách dự án, CRUD dự án, chi tiết dự án |
| `/tasks` | Quản lý công việc | Danh sách công việc, giao việc, cập nhật tiến độ, import Excel |
| `/document-tracking` | Theo dõi hồ sơ | Quản lý hợp đồng, văn bản gửi/nhận, trạng thái hồ sơ |
| `/field-logs` | Nhật ký hiện trường | Ghi chép hiện trường, đính kèm ảnh |
| `/materials` | Kho vật tư | Quản lý vật tư theo dự án/hạng mục, nhập/xuất kho |
| `/cost-plan` | Kế hoạch chi phí | Kế hoạch vật tư, mua hàng, chi phí, công nợ, lương công nhân |
| `/issues` | Xử lý vấn đề | Báo cáo vướng mắc, giao người xử lý, theo dõi trạng thái |
| `/reports` | Báo cáo | Xuất báo cáo Excel/PDF, biểu đồ tiến độ |
| `/personnel` | Nhân sự | Quản lý nhân viên, phân quyền, vai trò |
| `/activity-log` | Nhật ký hoạt động | Lịch sử thao tác của người dùng |
| `/account` | Tài khoản | Thông tin cá nhân, đổi mật khẩu |

### 3.3. Các thành phần UI (Components)

- **Layout.tsx**: Bố cục chính với Sidebar + Header + nội dung
- **Sidebar.tsx**: Menu điều hướng nhóm theo mục (Bảng điều khiển, Quản lý dự án, Kho công ty...)
- **Header.tsx**: Thanh tiêu đề phía trên
- **Modal.tsx**: Thành phần modal dùng cho dialog xác nhận, form nhập liệu
- **OcrUploadPanel.tsx**: Giao diện tải lên ảnh để OCR nhận dạng
- **LoadingSpinner.tsx**: Hiệu ứng tải khi fetch dữ liệu
- **Toast.tsx**: Thông báo tạm thời (success/error/warning)

---

## 4. CHI TIẾT GIAO DIỆN TỪNG TRANG

### 4.1. Dashboard (Trang chủ)

- Tổng quan tiến độ tất cả dự án
- Biểu đồ tròn/pie chart: tỷ lệ dự án theo trạng thái (đang thực hiện, hoàn thành, tạm dừng)
- Biểu đồ cột: tiến độ phần trăm khối lượng công việc đã hoàn thành
- Danh sách dự án gần đây với trạng thái
- Thông báo chưa đọc
- Thống kê nhanh: tổng công việc, công việc hoàn thành, vấn đề đang mở

### 4.2. Project Management (Quản lý dự án)

- Bảng danh sách dự án với các cột: Mã dự án, Tên, Địa điểm, Trạng thái, Tiến độ, Người quản lý
- Nút thêm/sửa/xóa dự án
- Form tạo dự án: mã, tên, địa điểm, ngày bắt đầu/kết thúc, người quản lý, ghi chú
- Modal chi tiết dự án hiển thị thông tin tổng hợp
- Tích hợp import Excel để tạo danh sách dự án

### 4.3. Task Management (Quản lý công việc)

- Bảng công việc theo dự án, có phân cấp (hạng mục cha/con)
- Các cột: STT, Mã, Tên công việc, Khối lượng, Đơn vị, Tiến độ, Trạng thái, Ưu tiên, Người phụ trách
- Hỗ trợ import Excel để tạo danh sách hàng mục công việc
- Giao việc cho nhân viên hiện trường (engineer)
- Cập nhật tiến độ (%) và trạng thái (chưa bắt đầu → đang thực hiện → xem xét → hoàn thành)
- Hỗ trợ đánh dấu phần đầu mục (section header) cho các mục I, II, III...
- Tích hợp OCR để đọc thông tin từ ảnh chụp bảng công việc

### 4.4. Material Tracking (Theo dõi vật tư)

- Danh sách vật tư theo dự án và hạng mục
- Thông tin: mã vật tư, tên, khối lượng, đơn giá, tồn kho hiện tại, nhà cung cấp, trạng thái
- Quản lý nhập/xuất kho (inventory transactions)
- Cập nhật trạng thái đặt hàng, giao hàng

### 4.5. Issue Resolution (Xử lý vấn đề)

- Danh sách vấn đề/vướng mắc theo dự án
- Các cột: Mã sự cố, Tiêu đề, Vị trí, Người báo cáo, Ngày báo, Trạng thái, Ưu tiên
- Báo cáo vấn đề mới với mô tả, vị trí, ảnh đính kèm
- Phân công người xử lý (giao cho engineer)
- Cập nhật trạng thái: Mở → Đang xử lý → Đã giải quyết
- Bình luận/phản hồi trong quá trình xử lý

### 4.6. Document Tracking (Theo dõi hồ sơ)

- Quản lý hợp đồng, văn bản gửi/nhận
- Thông tin: số hợp đồng, tên hợp đồng, bên ký, người nhận, ngày gửi/nhận, giá trị hợp đồng, trạng thái thanh toán
- Theo dõi prepay (tạm ứng), trạng thái thanh toán, hóa đơn

### 4.7. Field Logs (Nhật ký hiện trường)

- Ghi chép hoạt động tại công trường
- Đính kèm ảnh chụp hiện trường
- Liên kết với dự án và công việc cụ thể

### 4.8. Project Cost Plan (Kế hoạch chi phí)

- Kế hoạch vật tư theo hợp đồng (material plans)
- Quản lý đặt hàng (purchasings): đơn giá, VAT, tổng tiền, trạng thái thanh toán
- Chi phí dự án (expenses): chi phí phát sinh, hóa đơn
- Bảng lương công nhân (labor payroll): tên công nhân, số tiền, tài khoản ngân hàng, trạng thái thanh toán
- Tất cả đều có CRUD đầy đủ

### 4.9. Report Export (Xuất báo cáo)

- Xuất báo cáo tiến độ ra Excel
- Xuất báo cáo ra PDF
- Biểu đồ trực quan sử dụng Recharts
- Tải báo cáo về máy

### 4.10. Personnel (Nhân sự)

- Danh sách nhân viên (engineers)
- Phân quyền vai trò: Admin, Manager, Procurement, Engineer, Viewer
- Quản lý tài khoản: khóa/mở khóa, đổi mật khẩu

---

## 5. ĐẶC ĐIỂM GIAO DIỆN

### 5.1. Thiết kế

- **Color scheme**: Sử dụng Tailwind CSS với palette Slate (xám nhạt làm nền, slate-50 cho body)
- **Typography**: Font sans-serif, sử dụng Lucide Icons cho biểu tượng
- **Responsive**: Layout cố định với sidebar 240px, nội dung chính co giãn linh hoạt
- **Dark/Light**: Hiện tại sử dụng giao diện sáng (light mode) mặc định

### 5.2. Tương tác người dùng

- **Real-time updates**: Sử dụng Zustand store (realtimeStore.ts) để đồng bộ dữ liệu giữa các component
- **React Query**: Caching và refetching dữ liệu tự động với @tanstack/react-query
- **Toast notifications**: Thông báo tạm thời khi thao tác thành công/thất bại
- **Modal dialogs**: Xác nhận trước khi xóa, form nhập liệu dạng modal
- **Loading states**: Spinner khi tải dữ liệu

### 5.3. Tích hợp đặc biệt

- **OCR (Nhận dạng ký tự)**: Sử dụng Tesseract.js để đọc thông tin từ ảnh chụp bảng công việc, bảng giá, hóa đơn
- **Import Excel**: Hỗ trợ nhập dữ liệu từ file Excel (.xlsx) để tạo dự án, công việc, vật tư
- **Export PDF/Excel**: Xuất báo cáo ra nhiều định dạng
- **File attachment**: Đính kèm ảnh vào vấn đề, nhật ký hiện trường, phiếu lương

### 5.4. Hệ thống phân quyền

- **5 vai trò**: Admin (quản trị toàn bộ), Manager (quản lý dự án), Procurement (mua hàng), Engineer (nhân viên hiện trường), Viewer (chỉ xem)
- **Route-based access**: Mỗi trang có quyền truy cập khác nhau tùy vai trò
- **Activity logging**: Ghi lại mọi thao tác của người dùng để kiểm tra

---

## 6. LUỒNG LÀM VIỆC (USER FLOW)

Đăng nhập → Dashboard → Chọn dự án

Quản lý công việc (giao việc, cập nhật tiến độ)
Quản lý vật tư (nhập/xuất kho, xác nhận vật tư)
Xử lý vấn đề (báo cáo, giao người xử lý, đóng)
Theo dõi hồ sơ (hợp đồng, văn bản)
Nhật ký hiện trường (ghi chép, ảnh)
Kế hoạch chi phí (vật tư, mua hàng, chi phí, lương)
Xuất báo cáo (Excel, PDF)
Quản lý nhân sự (phân quyền, tài khoản)

---

## 7. KẾT LUẬN

Giao diện trang web TITSMART được xây dựng với công nghệ hiện đại (React + TypeScript + Tailwind CSS), có thiết kế rõ ràng, trực quan, phù hợp cho quản trị viên và quản lý dự án xây dựng. Hệ thống cung cấp đầy đủ các chức năng quản lý từ A-Z: dự án, công việc, vật tư, vấn đề, chi phí, nhân sự và báo cáo. Việc tích hợp OCR, import Excel và xuất báo cáo PDF/Excel giúp nâng cao hiệu quả làm việc trong môi trường công trường.

---

Báo cáo được tạo ngày 5/8/2026
Dự án: HỆ THỐNG QUẢN LÝ CÔNG VIỆC — TITSMART