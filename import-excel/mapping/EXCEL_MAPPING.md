# Mapping Import Excel

File Excel hien tai co cac sheet tuong ung voi du an mau. Khi import:

- Moi sheet co the tao thanh mot `project`.
- Moi dong cong viec tao thanh mot `task`.
- Cac cot trong Excel duoc mapping nhu sau:

```text
NỘI DUNG CÔNG VIỆC      -> tasks.task_name
KHỐI LƯỢNG              -> tasks.quantity
ĐVT                     -> tasks.unit
TIẾN ĐỘ                 -> tasks.progress_percent
TÌNH TRẠNG MUA HÀNG     -> tasks.material_status
TÌNH TRẠNG THI CÔNG     -> tasks.construction_status
VƯỚNG MẮC/ TỒN ĐỌNG     -> issues.issue_description
TT XỬ LÝ                -> issues.manager_feedback
HOÀN THÀNH              -> tasks.actual_end_date hoac construction_status
GHI CHÚ                 -> tasks.note
```

Can chot them voi khach hang cach tinh tien do tong du an: trung binh deu theo task hay tinh theo trong so khoi luong.

