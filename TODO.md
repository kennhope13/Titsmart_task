# TODO - Sửa lỗi tạo Đầu mục lớn (Section Header)

## Mục tiêu
Khi người dùng muốn tạo "đầu mục lớn" (section header / parent item) trong trang Quản lý Tiến độ Công việc, hệ thống phải tạo đúng loại đầu mục lớn, sau đó mới thêm đầu mục nhỏ bên trong.

## Các bước thực hiện

- [x] 1. Phân tích nguyên nhân: State `isSectionHeader` tồn tại nhưng không có UI toggle trong modal "Thêm Hạng mục Công việc"
- [x] 2. Lập kế hoạch sửa lỗi và được người dùng xác nhận

## Thay đổi trong `web-admin/src/pages/TaskManagementPage.tsx`

- [x] 3. Sửa `handleCreateTask`: dùng STT số La Mã đã tính khi `isSectionHeader === true` (thay vì `''`)
- [x] 4. Reset `isSectionHeader` về `false` khi đóng modal / sau khi tạo task
- [x] 5. Thêm toggle checkbox "Tạo Đầu mục cha" vào đầu form modal
- [x] 6. Ẩn dropdown "Thuộc Đầu mục cha" + nút "+" khi bật toggle
- [x] 7. Đổi label "Tên Hạng mục / Thiết bị" → "Tên Đầu mục cha" khi bật toggle
- [x] 8. Ẩn các trường chi tiết (Khối lượng, ĐVT, Tình trạng, Kỹ sư, Tiến độ) khi bật toggle

## Kiểm tra

- [ ] 9. Chạy TypeScript build để đảm bảo không có lỗi
- [ ] 10. Kiểm tra luồng: Tạo đầu mục cha → chọn nó trong dropdown → thêm đầu mục nhỏ bên trong
