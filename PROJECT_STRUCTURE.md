# Cau Truc Thu Muc Du An

```text
.
|-- backend/
|   |-- src/
|   |   |-- common/
|   |   |-- modules/
|   |       |-- auth/
|   |       |-- users/
|   |       |-- projects/
|   |       |-- tasks/
|   |       |-- materials/
|   |       |-- issues/
|   |       |-- notifications/
|   |       |-- reports/
|   |-- tests/
|
|-- web-admin/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- features/
|   |   |   |-- dashboard/
|   |   |   |-- projects/
|   |   |   |-- tasks/
|   |   |   |-- materials/
|   |   |   |-- issues/
|   |   |   |-- reports/
|   |   |-- services/
|   |   |-- styles/
|
|-- mobile-app/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- screens/
|   |   |   |-- tasks/
|   |   |   |-- materials/
|   |   |   |-- issues/
|   |   |-- services/
|   |   |-- store/
|
|-- database/
|   |-- migrations/
|   |-- seeds/
|   |-- diagrams/
|
|-- docs/
|   |-- requirements/
|   |-- workflows/
|   |-- api/
|   |-- ui/
|
|-- import-excel/
|   |-- samples/
|   |-- mapping/
|
|-- storage/
|   |-- uploads/
```

## Nguyen tac to chuc

- `backend` chi chua logic API va xu ly nghiep vu.
- `web-admin` chi chua giao dien quan ly tren trinh duyet.
- `mobile-app` chi chua ung dung mobile cho hien truong.
- `database` chua thay doi schema, du lieu mau va so do CSDL.
- `docs` la noi trao doi voi khach hang/dev, khong tron vao source code.
- `import-excel` chua file mau va quy tac mapping tu Excel sang database.

