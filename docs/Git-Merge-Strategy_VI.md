# Chiến lược Merge Request

## Phương thức Merge

Dự án sử dụng phương thức "Squash and Merge" để giữ cho lịch sử của nhánh `develop` gọn gàng và dễ dàng truy xuất nguồn gốc.

## Quy tắc

- Mỗi ticket Jira cần được gộp (merge) thành một commit duy nhất.
- Thực hiện squash các commit trước khi merge.
- Các nhánh tính năng (feature branch) nguồn cần được xóa sau khi merge thành công.
- Tiêu đề commit phải bao gồm mã ID của ticket Jira.

Ví dụ:

    - F1-123 Cấu hình chiến lược squash cho MR