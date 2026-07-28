# 🏢 Hệ Thống Quản Lý Ký Túc Xá (Dormitory Management System)

Hệ thống quản lý ký túc xá toàn diện, được xây dựng với kiến trúc **monorepo** bao gồm backend NestJS và frontend React. Hệ thống hỗ trợ 3 vai trò: **Quản trị viên (ADMIN)**, **Quản lý (MANAGER)** và **Sinh viên (STUDENT)**.

---

## 📋 Mục Lục

- [Tổng Quan](#-tổng-quan)
- [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
- [Hướng Dẫn Cài Đặt](#-hướng-dẫn-cài-đặt)
  - [1. Cấu Hình Database (Aiven MySQL)](#1-cấu-hình-database-aiven-mysql)
  - [2. Cài Đặt Backend](#2-cài-đặt-backend)
  - [3. Cài Đặt Frontend](#3-cài-đặt-frontend)
- [Chạy Ứng Dụng](#-chạy-ứng-dụng)
- [Tính Năng Chính](#-tính-năng-chính)
- [Vai Trò & Phân Quyền](#-vai-trò--phân-quyền)
- [API Endpoints](#-api-endpoints)
- [Kiểm Thử](#-kiểm-thử)
- [Xử Lý Sự Cố](#-xử-lý-sự-cố)

---

## 🌟 Tổng Quan

Hệ thống quản lý ký túc xá cung cấp giải pháp toàn diện cho việc quản lý:

- **Quản lý tòa nhà & phòng**: Theo dõi sức chứa, loại phòng, giới tính, giá phòng
- **Quản lý sinh viên & hợp đồng**: Đăng ký, gia hạn, chấm dứt hợp đồng
- **Quản lý tài chính**: Theo dõi thanh toán, hóa đơn điện/nước
- **Truyền thông**: Đăng thông báo, nội quy
- **Hỗ trợ**: Tiếp nhận và xử lý yêu cầu hỗ trợ, yêu cầu đổi phòng
- **Dashboard**: Thống kê trực quan cho từng vai trò

---

## 🛠 Công Nghệ Sử Dụng

### Backend

| Công Nghệ       | Phiên Bản | Mục Đích             |
| --------------- | --------- | -------------------- |
| NestJS          | ^11.0.1   | Framework backend    |
| TypeORM         | ^0.3.31   | ORM quản lý database |
| MySQL2          | ^3.22.6   | Database driver      |
| Passport JWT    | ^4.0.1    | Xác thực JWT         |
| Bcrypt          | ^6.0.0    | Mã hóa mật khẩu      |
| Class-validator | ^0.15.1   | Validation DTO       |
| Dayjs           | ^1.11.21  | Xử lý ngày tháng     |

### Frontend

| Công Nghệ       | Phiên Bản | Mục Đích             |
| --------------- | --------- | -------------------- |
| React           | ^19.2.8   | Framework frontend   |
| Ant Design      | ^6.5.2    | UI Component Library |
| React Router    | ^6.28.0   | Điều hướng trang     |
| Axios           | ^1.18.1   | HTTP client          |
| React Hook Form | ^7.82.0   | Quản lý form         |
| Yup             | ^1.7.1    | Validation form      |
| Playwright      | ^1.61.1   | E2E testing          |

---

## 📁 Cấu Trúc Dự Án

```
dorm-management/
├── README.md
├── database/
│   └── quan_ly_ky_tuc_xa.sql        # Database mẫu
│
├── dormitory-backend/                # Backend NestJS
│   ├── src/
│   │   ├── main.ts                   # Entry point
│   │   ├── app.module.ts             # Root module
│   │   ├── auth/                     # Authentication module
│   │   ├── users/                    # User management
│   │   ├── students/                 # Student management
│   │   ├── buildings/                # Building management
│   │   ├── rooms/                    # Room management
│   │   ├── contracts/                # Contract management
│   │   ├── payments/                 # Payment management
│   │   ├── utility-bills/            # Utility bill management
│   │   ├── announcements/            # Announcement management
│   │   ├── regulations/              # Regulation management
│   │   ├── support-requests/         # Support request management
│   │   ├── room-change-requests/     # Room change request management
│   │   ├── dashboard/                # Dashboard statistics
│   │   ├── common/                   # Shared utilities
│   │   └── config/                   # Configuration
│   ├── test/                         # E2E tests
│   └── package.json
│
└── dormitory-frontend/               # Frontend React
    ├── src/
    │   ├── api/client.js             # Axios HTTP client
    │   ├── routes/index.js           # Route configuration
    │   ├── layouts/                  # Layout components
    │   ├── pages/                    # Page components
    │   │   ├── admin/                # Admin pages
    │   │   ├── manager/              # Manager pages
    │   │   └── student/              # Student pages
    │   ├── components/               # Shared components
    │   ├── services/                 # API service layers
    │   ├── utils/                    # Utilities & constants
    │   └── hooks/                    # Custom hooks
    ├── e2e/                          # E2E tests (Playwright)
    └── package.json
```

---

## 📦 Yêu Cầu Hệ Thống

- **Node.js** >= 18.x
- **npm** >= 9.x
- **MySQL** 8.x (hoặc Aiven MySQL Cloud)
- **Git**

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Cấu Hình Database (Aiven MySQL)

Tạo file `.env` từ file mẫu:

```bash
cp .env.example .env
```

Cập nhật thông tin kết nối database trong file `.env`:

```env
DB_HOST=mysql-xxxxx.aivencloud.com
DB_PORT=11924
DB_USERNAME=avnadmin
DB_PASSWORD=your_password_here
DB_DATABASE=quan_ly_ky_tuc_xa
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

Import database mẫu:

```bash
mysql --host=YOUR_HOST --port=YOUR_PORT --user=avnadmin -p --ssl-mode=REQUIRED < database/quan_ly_ky_tuc_xa.sql
```

> ⚠️ **Lưu ý cho PowerShell**: Nếu gặp lỗi không tìm thấy `mysql`, hãy sử dụng đường dẫn đầy đủ đến `mysql.exe`.

### 2. Cài Đặt Backend

```bash
cd dormitory-backend
npm install
```

> Nếu PowerShell chặn lệnh `npm`, sử dụng `npm.cmd install`.

### 3. Cài Đặt Frontend

```bash
cd dormitory-frontend
npm install
```

---

## 🏃 Chạy Ứng Dụng

### Chạy Backend (Port 3000)

```bash
cd dormitory-backend

# Development với watch mode
npm run start:dev

# Production
npm run build && npm run start:prod
```

### Chạy Frontend (Port 3000)

```bash
cd dormitory-frontend
npm start
```

> Frontend mặc định chạy ở port 3000. Nếu cần đổi port, sử dụng:
>
> ```bash
> set PORT=3001 && npm start
> ```

### Truy Cập Ứng Dụng

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3000/api`
- **Login**: `http://localhost:3000/login`

---

## ✨ Tính Năng Chính

### 👑 Quản Trị Viên (ADMIN)

| Tính Năng             | Mô Tả                                   |
| --------------------- | --------------------------------------- |
| 📊 Dashboard          | Thống kê tổng quan toàn hệ thống        |
| 👥 Quản lý người dùng | CRUD người dùng, phân quyền             |
| 🏢 Quản lý tòa nhà    | Thêm/sửa/xóa tòa nhà, phân công quản lý |
| 🚪 Quản lý phòng      | Quản lý phòng theo tòa, loại phòng, giá |
| 🧑‍🎓 Quản lý sinh viên  | Xem/thêm/sửa thông tin sinh viên        |
| 📄 Quản lý hợp đồng   | Tạo/gia hạn/chấm dứt hợp đồng           |
| 💰 Quản lý thanh toán | Theo dõi các khoản thu                  |
| ⚡ Quản lý hóa đơn    | Tính tiền điện/nước theo phòng          |
| 📢 Thông báo          | Đăng tin cho sinh viên                  |
| 📜 Nội quy            | Quản lý nội quy ký túc xá               |
| 🆘 Yêu cầu hỗ trợ     | Xử lý yêu cầu từ sinh viên              |
| 🔄 Yêu cầu đổi phòng  | Phê duyệt/từ chối yêu cầu đổi phòng     |

### 👔 Quản Lý (MANAGER)

| Tính Năng            | Mô Tả                           |
| -------------------- | ------------------------------- |
| 📊 Dashboard         | Thống kê tòa nhà được phân công |
| 🏢 Quản lý tòa nhà   | Xem/quản lý tòa nhà được giao   |
| 🚪 Quản lý phòng     | Quản lý phòng trong tòa nhà     |
| 📄 Quản lý hợp đồng  | Quản lý hợp đồng trong tòa nhà  |
| 💰 Thanh toán        | Xem và xác nhận thanh toán      |
| ⚡ Hóa đơn           | Tạo và quản lý hóa đơn          |
| 📢 Thông báo/Nội quy | Đăng tin, quản lý nội quy       |
| 🆘 Yêu cầu hỗ trợ    | Xử lý yêu cầu                   |
| 🔄 Yêu cầu đổi phòng | Quản lý yêu cầu đổi phòng       |

### 🎓 Sinh Viên (STUDENT)

| Tính Năng             | Mô Tả                                    |
| --------------------- | ---------------------------------------- |
| 📊 Dashboard          | Xem thông tin cá nhân, hợp đồng, hóa đơn |
| 👤 Thông tin cá nhân  | Xem/cập nhật thông tin                   |
| 📄 Hợp đồng của tôi   | Xem chi tiết hợp đồng                    |
| 💳 Thanh toán của tôi | Xem lịch sử thanh toán                   |
| 📢 Thông báo          | Xem thông báo từ quản trị viên/quản lý   |
| 📜 Nội quy            | Xem nội quy ký túc xá                    |
| 🆘 Yêu cầu hỗ trợ     | Gửi yêu cầu hỗ trợ                       |
| 🔄 Yêu cầu đổi phòng  | Gửi yêu cầu đổi phòng                    |

---

## 🛡 Vai Trò & Phân Quyền

| Vai Trò   | Mô Tả                                |
| --------- | ------------------------------------ |
| `ADMIN`   | Toàn quyền truy cập tất cả tính năng |
| `MANAGER` | Quản lý các tòa nhà được phân công   |
| `STUDENT` | Chỉ xem được thông tin cá nhân       |

Hệ thống sử dụng **JWT Authentication** kết hợp với **Role-based Guards** để bảo vệ các route.

---

## 🔌 API Endpoints

Base URL: `http://localhost:3000/api`

### Authentication

| Method | Endpoint        | Mô Tả              |
| ------ | --------------- | ------------------ |
| POST   | `/auth/login`   | Đăng nhập          |
| POST   | `/auth/logout`  | Đăng xuất          |
| GET    | `/auth/profile` | Lấy thông tin user |

### Users

| Method | Endpoint     | Mô Tả           |
| ------ | ------------ | --------------- |
| GET    | `/users`     | Danh sách users |
| GET    | `/users/:id` | Chi tiết user   |
| POST   | `/users`     | Tạo user mới    |
| PATCH  | `/users/:id` | Cập nhật user   |
| DELETE | `/users/:id` | Xóa user        |

### Buildings

| Method | Endpoint         | Mô Tả             |
| ------ | ---------------- | ----------------- |
| GET    | `/buildings`     | Danh sách tòa nhà |
| GET    | `/buildings/:id` | Chi tiết tòa nhà  |
| POST   | `/buildings`     | Thêm tòa nhà      |
| PATCH  | `/buildings/:id` | Cập nhật tòa nhà  |
| DELETE | `/buildings/:id` | Xóa tòa nhà       |

### Rooms

| Method | Endpoint     | Mô Tả           |
| ------ | ------------ | --------------- |
| GET    | `/rooms`     | Danh sách phòng |
| GET    | `/rooms/:id` | Chi tiết phòng  |
| POST   | `/rooms`     | Thêm phòng      |
| PATCH  | `/rooms/:id` | Cập nhật phòng  |
| DELETE | `/rooms/:id` | Xóa phòng       |

### Students

| Method | Endpoint        | Mô Tả               |
| ------ | --------------- | ------------------- |
| GET    | `/students`     | Danh sách sinh viên |
| GET    | `/students/:id` | Chi tiết sinh viên  |
| POST   | `/students`     | Thêm sinh viên      |
| PATCH  | `/students/:id` | Cập nhật sinh viên  |
| DELETE | `/students/:id` | Xóa sinh viên       |

### Contracts

| Method | Endpoint         | Mô Tả              |
| ------ | ---------------- | ------------------ |
| GET    | `/contracts`     | Danh sách hợp đồng |
| GET    | `/contracts/:id` | Chi tiết hợp đồng  |
| POST   | `/contracts`     | Tạo hợp đồng       |
| PATCH  | `/contracts/:id` | Cập nhật hợp đồng  |
| DELETE | `/contracts/:id` | Xóa hợp đồng       |

### Payments

| Method | Endpoint        | Mô Tả                |
| ------ | --------------- | -------------------- |
| GET    | `/payments`     | Danh sách thanh toán |
| GET    | `/payments/:id` | Chi tiết thanh toán  |
| POST   | `/payments`     | Tạo thanh toán       |
| PATCH  | `/payments/:id` | Cập nhật thanh toán  |
| DELETE | `/payments/:id` | Xóa thanh toán       |

### Utility Bills

| Method | Endpoint             | Mô Tả             |
| ------ | -------------------- | ----------------- |
| GET    | `/utility-bills`     | Danh sách hóa đơn |
| GET    | `/utility-bills/:id` | Chi tiết hóa đơn  |
| POST   | `/utility-bills`     | Tạo hóa đơn       |
| PATCH  | `/utility-bills/:id` | Cập nhật hóa đơn  |
| DELETE | `/utility-bills/:id` | Xóa hóa đơn       |

### Announcements

| Method | Endpoint             | Mô Tả               |
| ------ | -------------------- | ------------------- |
| GET    | `/announcements`     | Danh sách thông báo |
| GET    | `/announcements/:id` | Chi tiết thông báo  |
| POST   | `/announcements`     | Tạo thông báo       |
| PATCH  | `/announcements/:id` | Cập nhật thông báo  |
| DELETE | `/announcements/:id` | Xóa thông báo       |

### Regulations

| Method | Endpoint           | Mô Tả             |
| ------ | ------------------ | ----------------- |
| GET    | `/regulations`     | Danh sách nội quy |
| GET    | `/regulations/:id` | Chi tiết nội quy  |
| POST   | `/regulations`     | Tạo nội quy       |
| PATCH  | `/regulations/:id` | Cập nhật nội quy  |
| DELETE | `/regulations/:id` | Xóa nội quy       |

### Support Requests

| Method | Endpoint                | Mô Tả                    |
| ------ | ----------------------- | ------------------------ |
| GET    | `/support-requests`     | Danh sách yêu cầu hỗ trợ |
| GET    | `/support-requests/:id` | Chi tiết yêu cầu         |
| POST   | `/support-requests`     | Tạo yêu cầu              |
| PATCH  | `/support-requests/:id` | Cập nhật yêu cầu         |
| DELETE | `/support-requests/:id` | Xóa yêu cầu              |

### Room Change Requests

| Method | Endpoint                    | Mô Tả                       |
| ------ | --------------------------- | --------------------------- |
| GET    | `/room-change-requests`     | Danh sách yêu cầu đổi phòng |
| GET    | `/room-change-requests/:id` | Chi tiết yêu cầu            |
| POST   | `/room-change-requests`     | Tạo yêu cầu                 |
| PATCH  | `/room-change-requests/:id` | Cập nhật yêu cầu            |
| DELETE | `/room-change-requests/:id` | Xóa yêu cầu                 |

### Dashboard

| Method | Endpoint             | Mô Tả                |
| ------ | -------------------- | -------------------- |
| GET    | `/dashboard/admin`   | Thống kê cho ADMIN   |
| GET    | `/dashboard/manager` | Thống kê cho MANAGER |
| GET    | `/dashboard/student` | Thống kê cho STUDENT |

---

## 🧪 Kiểm Thử

### Backend Tests

```bash
cd dormitory-backend

# Chạy unit tests
npm test

# Watch mode
npm run test:watch

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Frontend Tests

```bash
cd dormitory-frontend
npm test
```

### E2E Tests (Playwright)

```bash
cd dormitory-frontend
npx playwright test
```

### Lint & Type Check

```bash
# Backend
cd dormitory-backend
npm run lint                    # ESLint
npx tsc --noEmit                # TypeScript check

# Frontend
cd dormitory-frontend
npx react-scripts test --watchAll=false
```

---

## 🔧 Xử Lý Sự Cố

### 1. PowerShell chặn lệnh `npm`

Sử dụng `npm.cmd` thay thế:

```bash
npm.cmd install
npm.cmd run start:dev
```

### 2. Lỗi kết nối database

- Kiểm tra file `.env` đã được cấu hình đúng
- Đảm bảo IP của bạn được whitelist trong Aiven
- Kiểm tra SSL certificate nếu cần

### 3. Lỗi port bị chiếm dụng

Thay đổi port backend:

```bash
# Windows
set PORT=3001 && npm run start:dev
```

Thay đổi port frontend:

```bash
set PORT=3001 && npm start
```

### 4. MySQL command not found (PowerShell)

Sử dụng đường dẫn đầy đủ:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" [arguments]
```

### 5. Lỗi build frontend

Xóa `node_modules` và cài đặt lại:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📄 Giấy Phép

Dự án được phát triển với mục đích học tập và quản lý ký túc xá.

---

## 🤝 Đóng Góp

Mọi đóng góp đều được chào đón! Vui lòng tạo Pull Request hoặc Issue để cải thiện dự án.

---

<p align="center">Made with ❤️ for Dormitory Management</p>
