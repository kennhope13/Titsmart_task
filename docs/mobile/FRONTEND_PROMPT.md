# 🚀 Prompt thiết kế Mobile App - Hệ Thống Quản Lý Công Việc

## 1. Tổng quan hệ thống

**Tên dự án:** Hệ Thống Quản Lý Công Việc Công Trình (TitSmart)
**Backend:** Express.js + Prisma + PostgreSQL (chạy tại `http://10.0.2.2:3001/api` hoặc `http://192.168.0.173:3001/api`)
**Web Admin:** React + Vite + TailwindCSS (giao diện quản lý cho Admin/Manager)

**Mục tiêu:** Xây dựng lại hoàn toàn giao diện Mobile App (React Native + Expo) với trải nghiệm mobile-first, thân thiện với kỹ sư hiện trường, quản lý dự án. **KHÔNG copy giao diện Web Admin**, mà thiết kế lại hoàn toàn cho mobile.

## 2. Công nghệ & Thư viện sẵn có

```
React Native 0.86.0
Expo SDK 57
React Navigation 7 (Bottom Tabs + Native Stack)
Zustand (state management)
Axios (HTTP client)
lucide-react-native (icons)
react-native-safe-area-context
react-native-screens
react-native-svg
xlsx (đọc/xuất Excel)
```

## 3. Cấu trúc Mobile App hiện tại

```
mobile-app/
├── App.tsx                        # Root component
├── index.ts
├── app.json
├── package.json
├── tsconfig.json
├── src/
│   ├── components/
│   │   └── MobileUI.tsx           # UI components: AppText, Screen, ScreenHeader, SectionTitle, Card, StatCard, StatusBadge, ActionButton
│   ├── navigation/
│   │   └── AppNavigator.tsx       # Tab Navigator + Stack Navigator
│   ├── screens/
│   │   ├── DashboardScreen.tsx
│   │   ├── TaskManagementScreen.tsx
│   │   ├── TaskDetailScreen.tsx
│   │   ├── TaskFormScreen.tsx
│   │   ├── ProjectManagementScreen.tsx
│   │   ├── ProjectDetailScreen.tsx
│   │   ├── MaterialTrackingScreen.tsx
│   │   ├── IssueResolutionScreen.tsx
│   │   ├── ReportExportScreen.tsx
│   │   ├── FieldLogsScreen.tsx
│   │   ├── DocumentTrackingScreen.tsx
│   │   ├── ProjectCostPlanScreen.tsx
│   │   ├── OcrScannerScreen.tsx
│   │   ├── PersonnelScreen.tsx
│   │   ├── AccountScreen.tsx
│   │   ├── ActivityLogScreen.tsx
│   │   ├── MoreScreen.tsx
│   ├── services/
│   │   ├── api.ts                 # Axios API client
│   │   ├── realtimeStore.ts       # Zustand store (tất cả state)
│   │   ├── ocrService.ts
│   │   ├── excelSeedData.json
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── theme/
│   │   └── index.ts               # Colors, spacing, typography
│   └── utils/
│       └── text.ts
```

## 4. Navigation Structure (Cần thiết kế lại)

**Bottom Tab Bar (5 tab):**
1. 📊 **Tổng quan** (Dashboard) - Thống kê, biểu đồ, công việc cần chú ý
2. 📋 **Công việc** (Tasks) - Danh sách, filter, tìm kiếm, tạo mới
3. 📦 **Vật tư** (Materials) - Danh sách vật tư, filter, cập nhật trạng thái
4. 📷 **OCR** (OCR Scanner) - Quét/chụp ảnh để nhập dữ liệu
5. ⚡ **Thêm** (More) - Menu mở rộng: Dự án, Sự cố, Báo cáo, Nhân sự, Tài khoản, v.v.

**Stack Screens (navigation.push):**
- Dashboard, Projects, ProjectDetail, Tasks, TaskDetail, TaskForm, Materials, Issues, Reports, FieldLogs, Documents, CostPlan, Personnel, Account, ActivityLog, OcrScanner

## 5. Data Models (TypeScript interfaces)

### Task
```typescript
interface Task {
  id: string;
  stt: string;
  code: string;
  name: string;
  projectCode: string;
  projectName: string;
  volume: number;
  unit: string;
  progress: number; // 0-1
  status: 'Chưa làm' | 'Đang làm' | 'Chờ vật tư' | 'Chờ khách hàng' | 'Chờ nghiệm thu' | 'Hoàn thành' | 'Tạm dừng';
  purchaseStatus: string;
  constrStatus: string;
  issue?: string;
  issueStatus?: string;
  isDone: boolean;
  isSectionHeader?: boolean;
  sectionName?: string;
  notes?: string;
  assignedEngineerId?: string;
  assignedEngineerName?: string;
  dueDate?: string;
  priority?: 'Low' | 'Medium' | 'High';
  createdAt?: string;
}
```

### Project
```typescript
interface Project {
  id: string;
  code: string;
  name: string;
  client?: string;
  location: string;
  contractValue?: number;
  progressPercent: number;
  status: 'active' | 'completed' | 'on_hold';
  activeTeams?: number;
  totalTasks: number;
  completedTasks: number;
  issueTasksCount: number;
  managerName: string;
  members?: string[];
  startDate?: string;
  endDate?: string;
}
```

### Material
```typescript
interface Material {
  id: string;
  code: string;
  name: string;
  englishName?: string;
  projectCode: string;
  projectName: string;
  volume: number;
  unit: string;
  unitPrice?: number;
  status: string; // 'Chưa đặt hàng' | 'Đã đặt hàng' | 'Đã có hàng'
  constrStatus?: string;
  supplier?: string;
  initialStock?: number;
  currentStock?: number;
  totalImport?: number;
  totalExport?: number;
  category?: string;
  specs?: string;
  notes?: string;
}
```

### Issue
```typescript
interface Issue {
  id: string;
  incidentCode: string;
  title: string;
  projectName: string;
  projectCode: string;
  location: string;
  reportedBy: string;
  reportedTime: string;
  description: string;
  photoUrl: string;
  status: 'OPEN' | 'PROCESSING' | 'RESOLVED';
  priority: 'CRITICAL' | 'WARNING' | 'STANDARD';
  assignedTo: string;
  managerDirectives?: string;
  timelineLogs: Array<{ id: string; time: string; author: string; message: string }>;
}
```

### Engineer / User
```typescript
interface Engineer {
  id: string;
  name: string;
  title: string;
  avatar: string;
  phone: string;
  email: string;
}
```

### FieldLog (Nhật ký hiện trường)
```typescript
interface FieldLog {
  id: string;
  projectCode: string;
  taskId: string;
  engineerId: string;
  timestamp: string;
  note: string;
  images: string[];
  gpsLocation?: { lat: number; lng: number; text?: string };
  statusUpdate: 'Đang làm' | 'Hoàn thành' | 'Vướng mắc';
}
```

### Additional Models (for Cost Plan page)
- ProjectMaterialPlan, ProjectPurchasing, ProjectExpense, LaborPayroll, DocumentTrack

## 6. API Endpoints

Base URL: `http://10.0.2.2:3001/api` (Android emulator) hoặc `http://192.168.0.173:3001/api`

```
GET    /projects
GET    /projects/:id
POST   /projects
PUT    /projects/:id
DELETE /projects/:id

GET    /tasks?projectId=xxx
POST   /tasks
PUT    /tasks/:id
DELETE /tasks/:id

GET    /materials?projectId=xxx
GET    /issues?projectId=xxx
GET    /users/engineers
GET    /activity-logs
GET    /field-logs
POST   /field-logs

GET    /accounting/material-plans
POST   /accounting/material-plans
PUT    /accounting/material-plans/:id
DELETE /accounting/material-plans/:id

GET    /accounting/purchasings
POST   /accounting/purchasings
PUT    /accounting/purchasings/:id
DELETE /accounting/purchasings/:id

GET    /accounting/expenses
POST   /accounting/expenses
PUT    /accounting/expenses/:id
DELETE /accounting/expenses/:id

GET    /accounting/payrolls
POST   /accounting/payrolls
PUT    /accounting/payrolls/:id
DELETE /accounting/payrolls/:id

GET    /accounting/document-tracks
POST   /accounting/document-tracks
PUT    /accounting/document-tracks/:id
DELETE /accounting/document-tracks/:id
```

## 7. Zustand Store (realtimeStore.ts)

Store cung cấp các state & actions sau. **KHÔNG cần thay đổi store**, chỉ dùng các hook có sẵn:

```typescript
const store = {
  // State arrays
  projects: Project[],
  tasks: Task[],
  materials: Material[],
  issues: Issue[],
  engineers: Engineer[],
  activityLogs: ActivityLog[],
  fieldLogs: FieldLog[],
  materialPlans: ProjectMaterialPlan[],
  purchasingPlans: ProjectPurchasing[],
  expenses: ProjectExpense[],
  laborPayrolls: LaborPayroll[],
  documentTracks: DocumentTrack[],
  isLoaded: boolean,

  // Actions
  loadState: () => Promise<void>,
  fetchProjects: () => Promise<void>,
  fetchTasks: () => Promise<void>,
  fetchMaterials: () => Promise<void>,
  fetchIssues: () => Promise<void>,
  fetchEngineers: () => Promise<void>,
  fetchActivityLogs: () => Promise<void>,
  fetchAccounting: () => Promise<void>,
  fetchFieldLogs: () => Promise<void>,

  // CRUD Actions
  addProject: (data) => Project,
  updateProject: (id, data) => void,
  deleteProject: (id) => void,

  addTask: (data) => void,
  addTasksBatch: (data[]) => void,
  updateTask: (id, data) => void,
  updateTaskProgress: (id, progress, isDone) => void,
  deleteTask: (id) => void,

  addMaterial: (data) => void,
  updateMaterial: (id, data) => void,
  deleteMaterial: (id) => void,

  addIssue: (data) => void,
  updateIssue: (id, data) => void,
  updateIssueStatus: (id, status) => void,
  addDirective: (issueId, message) => void,

  addEngineer: (data) => Engineer,
  updateEngineer: (id, data) => void,

  addFieldLog: (data) => void,

  logActivity: (action, project) => void,

  addMaterialPlan: (data) => void,
  updateMaterialPlan: (id, data) => void,
  deleteMaterialPlan: (id) => void,

  addPurchasingPlan: (data) => void,
  updatePurchasingPlan: (id, data) => void,
  deletePurchasingPlan: (id) => void,

  addExpense: (data) => void,
  updateExpense: (id, data) => void,
  deleteExpense: (id) => void,

  addLaborPayroll: (data) => void,
  updateLaborPayroll: (id, data) => void,
  deleteLaborPayroll: (id) => void,

  addDocumentTrack: (data) => void,
  updateDocumentTrack: (id, data) => void,
  deleteDocumentTrack: (id) => void,
}
```

## 8. Theme hiện tại

```typescript
export const colors = {
  primary: '#1e3a8a',        // Dark blue
  primaryLight: '#eff6ff',   // Light blue
  accent: '#10b981',         // Emerald green
  accentLight: '#ecfdf5',    // Light green
  danger: '#ef4444',         // Red
  dangerLight: '#fef2f2',    // Light red
  warning: '#f59e0b',        // Amber
  warningLight: '#fffbeb',   // Light amber
  slate: { 50-900 },        // Gray scale
  white: '#ffffff',
  border: '#e2e8f0',
};
```

## 9. UI Components sẵn có (có thể dùng lại hoặc cải tiến)

File: `src/components/MobileUI.tsx`
- `AppText` - Text component với cleanText
- `Screen` - SafeAreaView wrapper
- `ScreenHeader` - Header với icon, title, subtitle, badge, action
- `SectionTitle` - Section heading với title, caption, action
- `Card` - Card container
- `StatCard` - Statistic card với label, value, tone, icon
- `StatusBadge` - Status pill với các tone màu
- `ActionButton` - Button với các variant

## 10. Yêu cầu thiết kế Mobile App

### Nguyên tắc chung
1. **Mobile-first**: Thiết kế dành riêng cho điện thoại, không phải web responsive
2. **Bottom navigation**: 5 tab chính, dễ tiếp cận bằng 1 tay
3. **Gesture-friendly**: Các nút bấm, thẻ, danh sách phải đủ lớn để chạm (tối thiểu 44px)
4. **Loading states**: Tất cả màn hình đều có skeleton loading hoặc spinner
5. **Empty states**: Thiết kế đẹp khi không có dữ liệu
6. **Pull-to-refresh**: Tất cả danh sách đều có pull-to-refresh
7. **Search & Filter**: Tìm kiếm realtime, filter nhanh
8. **Offline-friendly**: Dữ liệu cache local, hoạt động khi mất mạng
9. **Bottom sheet**: Modal dạng bottom sheet cho form nhập liệu ngắn
10. **Swipe actions**: Vuốt để xóa/cập nhật nhanh

### Màn hình chi tiết

#### 1. Dashboard (Tổng quan)
- Header với greeting + thông báo
- Progress ring: % hoàn thành toàn bộ
- 4 stat cards: Đang làm, Chờ duyệt, Hoàn thành, Trễ/Vướng
- Biểu đồ stacked bar: Tỉ lệ trạng thái công việc
- Biểu đồ cột: Tiến độ theo dự án
- Quick actions: 3 nút (Tạo việc, Giao việc, Duyệt báo cáo)
- Danh sách "Công việc cần chú ý" (top 3-5 task)

#### 2. Task Management (Công việc)
- Search bar + filter chips (Tất cả, Chờ giao, Đang làm, Chờ duyệt, Hoàn thành)
- FlatList hiệu suất cao với card task
- Mỗi card: Mã code, tên, dự án, người thực hiện, hạn, progress bar
- FAB (Floating Action Button) để tạo task mới
- Pull-to-refresh
- Empty state khi không có kết quả

#### 3. Task Detail (Chi tiết công việc)
- Hero section: Trạng thái, tên, mô tả
- Progress bar lớn
- Thông tin: Dự án, Người thực hiện, Hạn hoàn thành
- 2 action buttons: "Duyệt hoàn thành" (xanh) và "Yêu cầu sửa" (đỏ)
- Text input cho lý do yêu cầu sửa
- Bottom sheet feedback

#### 4. Task Form (Tạo/Sửa công việc)
- Bottom sheet hoặc full screen modal
- Form: Tên, Dự án (dropdown), Người thực hiện, Hạn, Khối lượng, ĐVT, Ghi chú
- Validation cơ bản
- Nút "Lưu" và "Hủy"

#### 5. Project Management (Dự án)
- Danh sách dự án dạng card
- Mỗi card: Tên, mã, địa điểm, chủ đầu tư, progress bar, thống kê nhanh
- Search bar
- Filter: Đang triển khai / Hoàn thành / Tạm dừng
- Pull-to-refresh

#### 6. Project Detail (Chi tiết dự án)
- Header: Tên, mã, trạng thái, địa điểm
- Progress gauge
- 3-4 stat cards: Tổng việc, Hoàn thành, Vật tư, Vướng mắc
- Quick links: Xem công việc, Xem vật tư, Kế hoạch chi phí, Nhật ký hiện trường
- Thông tin: Chủ đầu tư, Giá trị HĐ, Chỉ huy trưởng

#### 7. Material Tracking (Vật tư)
- Search bar + filter chips (Tất cả, Chưa đặt, Đã đặt, Có hàng)
- Card list: Tên, dự án, số lượng, trạng thái đặt hàng, trạng thái thi công
- Nút "Đánh dấu đã có hàng" trên mỗi card
- Swipe to delete
- Pull-to-refresh

#### 8. Issue Resolution (Sự cố)
- Header: "Chi đạo nhanh" text input
- Card list: Mã sự cố, ảnh, tiêu đề, địa điểm, mô tả
- 2 action buttons: "Gửi chỉ đạo" và "Hoàn thành"
- Trạng thái: OPEN (đỏ), PROCESSING (vàng), RESOLVED (xanh)
- Pull-to-refresh

#### 9. Field Logs (Nhật ký hiện trường)
- Timeline-style list
- Mỗi item: Avatar, thời gian, dự án, hạng mục, ghi chú, ảnh, GPS, trạng thái
- FAB để tạo báo cáo mới
- Bottom sheet form: Chọn dự án, chọn hạng mục, chụp ảnh, ghi chú, GPS, trạng thái

#### 10. More Screen (Thêm - Menu mở rộng)
- Danh sách nhóm chức năng:
  - **Bảng điều khiển**: Tổng quan
  - **Quản lý dự án**: Dự án, Công việc, KH & Chi phí, Nhật ký hiện trường, Hồ sơ
  - **Kho công ty**: Vật tư
  - **Sự cố & Báo cáo**: Sự cố, Báo cáo
  - **Hệ thống**: Nhân sự, Nhật ký hoạt động
  - **Cá nhân**: Tài khoản, Cài đặt

#### 11. Report Export (Báo cáo)
- Tab bar: Chờ duyệt, Đã duyệt, Bị từ chối, Thống kê, Điểm danh
- Tab "Chờ duyệt": Danh sách task chờ, mỗi item có ảnh, code, tên, người thực hiện
- 2 buttons: "Duyệt" và "Từ chối" (kèm lý do)
- Tab "Thống kê": 5 stat cards (Tổng, Đang làm, Chờ duyệt, Hoàn thành, Trễ)
- Tab "Điểm danh": Danh sách nhân viên với trạng thái điểm danh

#### 12. Document Tracking (Hồ sơ) - Simplified
- Danh sách hồ sơ gửi đi
- Mỗi item: Số HĐ, tên, công ty, trạng thái, thanh toán
- Tab: Tổng quan, Giao nhận, Tạm ứng, Hoàn tất
- FAB để thêm mới

#### 13. OCR Scanner
- Camera view hoặc chọn ảnh từ thư viện
- Nút "Chụp" để OCR
- Hiển thị kết quả trích xuất
- Nút "Áp dụng" để import dữ liệu

#### 14. Account Screen (Tài khoản)
- Avatar, tên, vai trò
- Thông tin cá nhân: SĐT, Email
- Nút: Đăng xuất, Đổi mật khẩu

#### 15. Personnel Screen (Nhân sự) - Đơn giản
- Danh sách nhân viên
- Mỗi item: Avatar, tên, chức vụ, SĐT

#### 16. Activity Log (Nhật ký hoạt động)
- Danh sách theo thời gian
- Mỗi item: Người dùng, hành động, dự án, thời gian
- FlatList đơn giản

#### 17. Project Cost Plan (Kế hoạch & Chi phí) - Simplified
- Dropdown chọn dự án
- Tab bar: Tổng quan, KH Vật tư, Mua sắm, Chi phí, Lương, Chứng từ
- **Tab Tổng quan**: Biểu đồ cột chi phí + thông tin tài chính
- **Tab KH Vật tư**: Danh sách hạng mục vật tư với trạng thái
- **Tab Mua sắm**: Danh sách mua sắm với giá trị, tạm ứng
- **Tab Chi phí**: Danh sách phiếu chi
- **Tab Lương**: Danh sách lương công nhật
- **Tab Chứng từ**: Theo dõi CO/CQ

## 11. Các file cần tạo/sửa

### File cần tạo MỚI:
Không tạo file mới. Sửa các file hiện có.

### File cần SỬA:
1. `mobile-app/src/screens/DashboardScreen.tsx` - Thiết kế lại dashboard
2. `mobile-app/src/screens/TaskManagementScreen.tsx` - Thiết kế lại danh sách task
3. `mobile-app/src/screens/TaskDetailScreen.tsx` - Thiết kế lại chi tiết task
4. `mobile-app/src/screens/TaskFormScreen.tsx` - Thiết kế lại form tạo task
5. `mobile-app/src/screens/ProjectManagementScreen.tsx` - Thiết kế lại danh sách dự án
6. `mobile-app/src/screens/ProjectDetailScreen.tsx` - Thiết kế lại chi tiết dự án
7. `mobile-app/src/screens/MaterialTrackingScreen.tsx` - Thiết kế lại vật tư
8. `mobile-app/src/screens/IssueResolutionScreen.tsx` - Thiết kế lại sự cố
9. `mobile-app/src/screens/FieldLogsScreen.tsx` - Thiết kế lại nhật ký hiện trường
10. `mobile-app/src/screens/ReportExportScreen.tsx` - Thiết kế lại báo cáo
11. `mobile-app/src/screens/DocumentTrackingScreen.tsx` - Thiết kế lại hồ sơ
12. `mobile-app/src/screens/ProjectCostPlanScreen.tsx` - Thiết kế lại kế hoạch chi phí
13. `mobile-app/src/screens/OcrScannerScreen.tsx` - Thiết kế lại OCR
14. `mobile-app/src/screens/PersonnelScreen.tsx` - Thiết kế lại nhân sự
15. `mobile-app/src/screens/AccountScreen.tsx` - Thiết kế lại tài khoản
16. `mobile-app/src/screens/ActivityLogScreen.tsx` - Thiết kế lại nhật ký hoạt động
17. `mobile-app/src/screens/MoreScreen.tsx` - Thiết kế lại menu mở rộng
18. `mobile-app/src/components/MobileUI.tsx` - Cải tiến UI components
19. `mobile-app/src/navigation/AppNavigator.tsx` - Cải tiến navigation
20. `mobile-app/src/theme/index.ts` - Cập nhật theme nếu cần

## 12. Lưu ý quan trọng

### KHÔNG được thay đổi:
- `mobile-app/src/services/api.ts` - API client
- `mobile-app/src/services/realtimeStore.ts` - Zustand store
- `mobile-app/src/types/index.ts` - TypeScript interfaces
- `mobile-app/src/services/ocrService.ts` - OCR service
- `mobile-app/src/utils/text.ts` - Text utilities
- `mobile-app/App.tsx` - Root component
- `mobile-app/app.json` - App config
- `mobile-app/package.json` - Dependencies

### Cần giữ nguyên:
- Tất cả các API call dùng từ `realtimeStore`
- Navigation structure (tab names, screen names)
- Theme colors (có thể thêm màu mới nhưng không xóa)
- Các props của UI components

### Coding Standards:
- Sử dụng TypeScript strict mode
- Tất cả StyleSheet đặt dưới component
- Không dùng `any` type (trừ trường hợp bất khả kháng)
- Sử dụng `useCallback` và `useMemo` cho performance
- FlatList phải có: `keyExtractor`, `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews`
- Icons: Sử dụng `lucide-react-native`
- Format code: Prettier với single quote, tab width 2

---

## 📁 Tài liệu tham khảo

- File gốc web admin: `web-admin/src/pages/` (tham khảo logic, KHÔNG copy UI)
- Data types: `mobile-app/src/types/index.ts`
- Theme: `mobile-app/src/theme/index.ts`
- Store: `mobile-app/src/services/realtimeStore.ts`
- API: `mobile-app/src/services/api.ts`
- UI Components: `mobile-app/src/components/MobileUI.tsx`
- Navigation: `mobile-app/src/navigation/AppNavigator.tsx`
