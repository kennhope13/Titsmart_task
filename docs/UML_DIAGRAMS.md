# Sơ đồ UML — Hệ thống quản lý công việc công trình

Mỗi khối bên dưới có thể dán trực tiếp vào [Mermaid Live Editor](https://mermaid.live/) hoặc Markdown hỗ trợ Mermaid. Các sơ đồ Use Case và Deployment được biểu diễn bằng `flowchart` vì Mermaid chưa hỗ trợ cú pháp UML `usecaseDiagram` gốc.

## 1. Use Case

```mermaid
flowchart LR
    Admin([Admin])
    Manager([Quản lý])
    Procurement([Thu mua])
    Engineer([Kỹ sư])
    Viewer([Viewer])

    subgraph System[Hệ thống quản lý công trình]
        UC1([Đăng nhập])
        UC2([Quản lý dự án])
        UC3([Quản lý công việc])
        UC4([Cập nhật tiến độ])
        UC5([Quản lý vật tư])
        UC6([Quản lý kho])
        UC7([Kế hoạch và chi phí])
        UC8([Xử lý vướng mắc])
        UC9([Báo cáo hiện trường])
        UC10([Theo dõi hồ sơ])
        UC11([Xuất báo cáo])
        UC12([Import Excel/OCR])
        UC13([Quản lý nhân sự])
        UC14([Xem nhật ký])
    end

    Admin --- UC1 & UC2 & UC13 & UC14
    Manager --- UC1 & UC2 & UC3 & UC4 & UC8 & UC11 & UC12 & UC14
    Procurement --- UC1 & UC5 & UC6 & UC7 & UC10 & UC11
    Engineer --- UC1 & UC3 & UC4 & UC8 & UC9
    Viewer --- UC1 & UC2 & UC3 & UC11 & UC14
```

## 2. Sequence diagrams

### 2.1 Khởi tạo dự án và import Excel

```mermaid
sequenceDiagram
    actor QL as Quản lý
    participant FE as Web Admin
    participant API as Backend API
    participant DB as PostgreSQL
    participant Store as Zustand Store

    QL->>FE: Tạo dự án mới
    FE->>API: POST /api/projects
    API->>DB: INSERT project
    DB-->>API: Project
    API-->>FE: Project created
    QL->>FE: Upload file Excel
    FE->>FE: Parse XLSX và validate
    FE->>API: POST /api/tasks/bulk
    API->>DB: INSERT tasks
    DB-->>API: Tasks
    API-->>FE: Tasks created
    FE->>Store: Upsert tasks
    Store->>Store: Tính lại tiến độ dự án
    Store-->>FE: Cập nhật UI
    FE-->>QL: Hiển thị danh sách công việc
```

### 2.2 Cập nhật tiến độ thi công

```mermaid
sequenceDiagram
    actor KS as Kỹ sư
    participant Mobile as Mobile App
    participant API as Backend API
    participant DB as PostgreSQL
    participant Realtime as Realtime service
    actor QL as Quản lý

    KS->>Mobile: Chọn công việc, nhập tiến độ/ảnh/ghi chú
    Mobile->>API: PUT /api/tasks/:id/progress
    API->>DB: UPDATE task, INSERT progress_update
    DB-->>API: Success
    API-->>Mobile: Updated task
    Mobile->>Mobile: Cập nhật UI cục bộ
    API->>Realtime: Broadcast task updated
    Realtime-->>QL: Hiển thị tiến độ mới
    QL->>QL: Dashboard tự cập nhật
```

### 2.3 Xử lý vướng mắc

```mermaid
sequenceDiagram
    actor KS as Kỹ sư
    participant Mobile as Mobile App
    participant API as Backend API
    participant DB as PostgreSQL
    participant Notify as Notification System
    actor QL as Quản lý

    KS->>Mobile: Tạo báo cáo vướng mắc
    Mobile->>API: POST /api/issues
    API->>DB: INSERT issue
    DB-->>API: Issue
    API->>Notify: Tạo thông báo
    Notify-->>QL: Push notification
    API-->>Mobile: Issue created
    QL->>API: Phản hồi và cập nhật trạng thái
    API->>DB: UPDATE issue, INSERT comment
    DB-->>API: Updated
    API->>Notify: Thông báo kỹ sư
    Notify-->>KS: Push notification
```

### 2.4 Quản lý vật tư và nhập kho

```mermaid
sequenceDiagram
    actor TM as Thu mua
    participant FE as Web Admin
    participant API as Backend API
    participant DB as PostgreSQL

    TM->>FE: Lọc hạng mục chưa đặt hàng
    FE->>API: GET /api/materials?status=unordered
    API->>DB: SELECT materials
    DB-->>API: Material list
    API-->>FE: Display list
    TM->>FE: Cập nhật đặt hàng
    FE->>API: PUT /api/materials/:id
    API->>DB: UPDATE material
    DB-->>API: Success
    API-->>FE: Updated
    TM->>FE: Nhập kho
    FE->>API: POST /api/inventory-transactions
    API->>DB: INSERT transaction và UPDATE stock
    DB-->>API: Success
    API-->>FE: Transaction created
```

## 3. Activity diagrams

### 3.1 Khởi tạo dự án

```mermaid
flowchart TD
    A[Quản lý tạo dự án mới] --> B{Nhập dữ liệu từ Excel?}
    B -->|Có| C[Upload file Excel] --> D[Parse và validate] --> E{Dữ liệu hợp lệ?}
    E -->|Không| F[Hiển thị lỗi] --> C
    E -->|Có| G[Tạo danh sách công việc]
    B -->|Không| H[Nhập thủ công] --> G
    G --> I[Gán người phụ trách] --> J[Gửi thông báo] --> K[Nhân viên nhận việc] --> L([Hoàn tất])
```

### 3.2 Cập nhật tiến độ

```mermaid
flowchart TD
    A[Kỹ sư xem việc được giao] --> B[Chuyển trạng thái: Đang thi công] --> C[Cập nhật phần trăm tiến độ] --> D{Đính kèm ảnh?}
    D -->|Có| E[Upload ảnh hiện trường] --> F{Tiến độ = 100%?}
    D -->|Không| F
    F -->|Có| G[Chuyển trạng thái: Hoàn thành] --> I[Tính lại tiến độ dự án] --> J[Thông báo quản lý] --> K([Kết thúc])
    F -->|Không| H[Lưu tạm] --> A
```

### 3.3 Xử lý vướng mắc

```mermaid
flowchart TD
    A[Kỹ sư phát hiện vướng mắc] --> B[Tạo báo cáo và ảnh] --> C[Hệ thống gán ưu tiên] --> D[Thông báo quản lý] --> E{Quản lý xử lý}
    E -->|Chỉ đạo| F[Cập nhật hướng xử lý] --> G[Thông báo kỹ sư] --> I{Đã giải quyết?}
    E -->|Đóng| H[Đóng vướng mắc]
    I -->|Chưa| A
    I -->|Rồi| H --> J([Kết thúc])
```

## 4. Class diagram

```mermaid
classDiagram
    class User { +UUID id +String code +String fullName +String email +UserRole role +AccountStatus status +login() +updateProfile() }
    class Project { +UUID id +String code +String name +ProjectStatus status +Decimal progressPercent +Date startDate +Date endDate +calculateProgress() }
    class Task { +UUID id +UUID projectId +UUID parentId +String code +String name +Decimal progress +TaskStatus status +TaskPriority priority +updateProgress() +assignEngineer() }
    class ProgressUpdate { +UUID id +UUID taskId +UUID engineerId +Decimal progress +String note +DateTime recordedAt }
    class Material { +UUID id +UUID projectId +UUID taskId +String code +String name +Decimal currentStock +Decimal unitPrice +updateStock() }
    class InventoryTransaction { +UUID id +UUID materialId +UUID projectId +TransactionType type +Decimal quantity +DateTime transactionDate }
    class Issue { +UUID id +UUID projectId +UUID taskId +String title +IssueStatus status +IssuePriority priority +updateStatus() +addComment() }
    class FieldLog { +UUID id +UUID projectId +UUID taskId +UUID engineerId +String note +String[] images +DateTime timestamp }
    class ProjectMaterialPlan { +UUID id +UUID projectId +String jobContent +Decimal contractVolume +String orderedStatus }
    class ProjectPurchasing { +UUID id +UUID projectId +String content +Decimal totalAmount +String paymentStatus +calculateTotal() }
    class ProjectExpense { +UUID id +UUID projectId +Date date +String content +Decimal totalAmount }
    class LaborPayroll { +UUID id +UUID projectId +String workerName +Decimal totalAmount +String paymentStatus }
    class DocumentTrack { +UUID id +UUID projectId +String contractNo +String company +String paymentStatus +Boolean isCompleted }
    class ActivityLog { +UUID id +UUID userId +UUID projectId +String action +DateTime timestamp }

    User "1" --> "*" Project : manages
    User "1" --> "*" Task : assignedTo
    User "1" --> "*" FieldLog : creates
    User "1" --> "*" ActivityLog : performs
    Project "1" *-- "*" Task : contains
    Project "1" *-- "*" Material : has
    Project "1" *-- "*" Issue : has
    Project "1" *-- "*" FieldLog : has
    Project "1" *-- "*" ProjectMaterialPlan
    Project "1" *-- "*" ProjectPurchasing
    Project "1" *-- "*" ProjectExpense
    Project "1" *-- "*" LaborPayroll
    Project "1" *-- "*" DocumentTrack
    Task "0..1" --> "*" Task : parent
    Task "1" --> "*" ProgressUpdate
    Task "1" --> "*" Material : requires
    Task "1" --> "*" Issue : relatesTo
    Material "1" --> "*" InventoryTransaction
```

## 5. Deployment diagram

```mermaid
flowchart TD
    Browser[Browser: Chrome / Edge / Safari] --> Web[Web Admin: React + Vite :5173]
    Mobile[Mobile App: Expo / React Native] --> API
    Web --> Nginx[Load balancer: Nginx] --> API[Backend API: Express.js + TypeScript :3001]
    API --> Postgres[(PostgreSQL)]
    API --> Redis[(Redis cache/session)]
    API --> Local[Local uploads: development]
    API --> Cloud[Cloud storage: S3 / Cloudinary]
    API --> OCR[OCR: Tesseract.js]
    API --> Notify[Email / SMS / Push notification]
```

## 6. ERD

```mermaid
erDiagram
    USER ||--o{ PROJECT : manages
    PROJECT ||--o{ TASK : contains
    TASK o|--o{ TASK : parent_of
    USER ||--o{ TASK : assigned_to
    TASK ||--o{ PROGRESS_UPDATE : records
    PROJECT ||--o{ MATERIAL : has
    TASK ||--o{ MATERIAL : requires
    MATERIAL ||--o{ INVENTORY_TRANSACTION : has
    PROJECT ||--o{ ISSUE : has
    TASK ||--o{ ISSUE : relates_to
    PROJECT ||--o{ FIELD_LOG : has
    USER ||--o{ FIELD_LOG : writes
    PROJECT ||--o{ PROJECT_MATERIAL_PLAN : plans
    PROJECT ||--o{ PROJECT_PURCHASING : purchases
    PROJECT ||--o{ PROJECT_EXPENSE : incurs
    PROJECT ||--o{ LABOR_PAYROLL : pays
    PROJECT ||--o{ DOCUMENT_TRACK : tracks
    USER ||--o{ ACTIVITY_LOG : performs

    USER { uuid id PK string code string full_name string email string role string status }
    PROJECT { uuid id PK uuid manager_id FK string code string name string status decimal progress_percent }
    TASK { uuid id PK uuid project_id FK uuid parent_id FK uuid assignee_id FK string code string name decimal progress string status }
    PROGRESS_UPDATE { uuid id PK uuid task_id FK uuid engineer_id FK decimal progress datetime recorded_at }
    MATERIAL { uuid id PK uuid project_id FK uuid task_id FK string code string name decimal current_stock decimal unit_price }
    INVENTORY_TRANSACTION { uuid id PK uuid material_id FK uuid project_id FK string type decimal quantity datetime transaction_date }
    ISSUE { uuid id PK uuid project_id FK uuid task_id FK string title string status string priority }
    FIELD_LOG { uuid id PK uuid project_id FK uuid task_id FK uuid engineer_id FK string note datetime timestamp }
    PROJECT_MATERIAL_PLAN { uuid id PK uuid project_id FK string job_content decimal contract_volume string ordered_status }
    PROJECT_PURCHASING { uuid id PK uuid project_id FK string content decimal total_amount string payment_status }
    PROJECT_EXPENSE { uuid id PK uuid project_id FK date expense_date string content decimal total_amount }
    LABOR_PAYROLL { uuid id PK uuid project_id FK string worker_name decimal total_amount string payment_status }
    DOCUMENT_TRACK { uuid id PK uuid project_id FK string contract_no string company boolean is_completed }
    ACTIVITY_LOG { uuid id PK uuid user_id FK uuid project_id FK string action datetime timestamp }
```

## 7. State diagram — Task

```mermaid
stateDiagram-v2
    [*] --> not_started
    not_started --> in_progress : Giao việc
    not_started --> paused : Tạm dừng
    in_progress --> waiting_material : Chờ vật tư
    waiting_material --> in_progress : Có vật tư
    in_progress --> review : Hoàn thành
    in_progress --> paused : Tạm dừng
    review --> done : Duyệt
    review --> in_progress : Sửa lại
    paused --> in_progress : Tiếp tục
    done --> [*]
    paused --> [*] : Hủy
```

## 8. State diagram — Issue

```mermaid
stateDiagram-v2
    [*] --> open
    open --> processing : Phân công
    open --> resolved : Đóng ngay
    processing --> resolved : Giải quyết
    resolved --> processing : Mở lại
    resolved --> [*]
```

## Cách xem và xuất ảnh

1. Mở file Markdown này trong VS Code (có extension Mermaid) hoặc dán từng khối vào Mermaid Live Editor.
2. Trong Mermaid Live Editor, dùng **Actions → PNG** hoặc **SVG** để xuất từng sơ đồ.
3. SVG phù hợp nhất cho tài liệu/slide vì phóng to không vỡ hình.
