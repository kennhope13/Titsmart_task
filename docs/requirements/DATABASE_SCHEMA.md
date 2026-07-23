# Database Schema De Xuat

He thong nen dung PostgreSQL hoac MySQL. Cac enum luu bang tieng Anh trong database, giao dien hien thi tieng Viet.

## Bang chinh

- `users`: nhan su va phan quyen.
- `projects`: du an/cong trinh tao dong.
- `tasks`: hang muc cong viec.
- `task_assignments`: phan cong nhan su cho cong viec.
- `materials`: vat tu thiet bi.
- `progress_updates`: lich su cap nhat tien do.
- `issues`: vuong mac/su co.
- `issue_comments`: trao doi xu ly su co.
- `attachments`: anh/file dinh kem.
- `notifications`: thong bao.

## Quan he chinh

```text
users 1 - n projects
projects 1 - n tasks
tasks 1 - n task_assignments
users 1 - n task_assignments
projects 1 - n materials
tasks 1 - n materials
tasks 1 - n progress_updates
tasks 1 - n issues
issues 1 - n issue_comments
issues/tasks/progress_updates/materials 1 - n attachments
users 1 - n notifications
```

