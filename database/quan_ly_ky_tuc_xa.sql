CREATE DATABASE IF NOT EXISTS quan_ly_ky_tuc_xa;
USE quan_ly_ky_tuc_xa;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15),

    role VARCHAR(20) NOT NULL,         -- ADMIN, MANAGER, STUDENT
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL UNIQUE,

    student_code VARCHAR(20) NOT NULL UNIQUE,

    gender VARCHAR(10),

    birthday DATE,

    faculty VARCHAR(100),
    class_name VARCHAR(50),

    address TEXT,
    parent_phone VARCHAR(15),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


CREATE TABLE buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,

    building_name VARCHAR(100) NOT NULL UNIQUE,

    gender VARCHAR(10) NOT NULL,      -- Male / Female

    manager_id INT NOT NULL UNIQUE,

    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (manager_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,

    building_id INT NOT NULL,

    room_number VARCHAR(20) NOT NULL,

    floor INT NOT NULL,

    room_type VARCHAR(20),          -- 4_BEDS, 6_BEDS...

    gender VARCHAR(10),             -- Male / Female

    capacity INT NOT NULL,

    room_fee DECIMAL(10,2) NOT NULL,

    status VARCHAR(20) DEFAULT 'ACTIVE',   -- ACTIVE / MAINTENANCE

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(building_id, room_number),

    FOREIGN KEY (building_id)
        REFERENCES buildings(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


CREATE TABLE contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,

    contract_code VARCHAR(20) NOT NULL UNIQUE,

    student_id INT NOT NULL,

    room_id INT NOT NULL,

    created_by INT NOT NULL,      -- Manager tạo hợp đồng

    start_date DATE NOT NULL,

    end_date DATE NOT NULL,

    deposit DECIMAL(10,2) DEFAULT 0,

    status VARCHAR(20) DEFAULT 'ACTIVE',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE utility_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,

    room_id INT NOT NULL,

    month TINYINT NOT NULL,
    year SMALLINT NOT NULL,

    electric_old INT NOT NULL,
    electric_new INT NOT NULL,

    water_old INT NOT NULL,
    water_new INT NOT NULL,

    electric_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    water_fee DECIMAL(10,2) NOT NULL DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PUBLISHED

    created_by INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_room_month UNIQUE (room_id, month, year),

    CONSTRAINT fk_utility_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_utility_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    invoice_code VARCHAR(20) NOT NULL UNIQUE,

    student_id INT NOT NULL,

    contract_id INT NOT NULL,

    utility_bill_id INT NOT NULL,

    month TINYINT NOT NULL,
    year SMALLINT NOT NULL,

    room_fee DECIMAL(10,2) NOT NULL,
    electric_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    water_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    other_fee DECIMAL(10,2) NOT NULL DEFAULT 0,

    total_amount DECIMAL(10,2) NOT NULL,

    due_date DATE NOT NULL,

    payment_date DATETIME NULL,

    payment_method VARCHAR(30),

    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    -- UNPAID
    -- PENDING
    -- PAID

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_payment_contract
        FOREIGN KEY (contract_id)
        REFERENCES contracts(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_payment_utility
        FOREIGN KEY (utility_bill_id)
        REFERENCES utility_bills(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(255) NOT NULL,

    content TEXT NOT NULL,

    target_role VARCHAR(20) NOT NULL,
    -- ALL
    -- MANAGER
    -- STUDENT

    created_by INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_announcement_creator
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE regulations (
    id INT AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(255) NOT NULL,

    content TEXT NOT NULL,

    created_by INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_regulation_creator
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE support_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,

    student_id INT NOT NULL,

    room_id INT NOT NULL,

    category VARCHAR(30) NOT NULL,
    -- ELECTRIC
    -- WATER
    -- INTERNET
    -- FACILITY
    -- OTHER

    title VARCHAR(255) NOT NULL,

    description TEXT NOT NULL,

    reply TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING
    -- PROCESSING
    -- DONE

    handled_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_support_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_support_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_support_manager
        FOREIGN KEY (handled_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE room_change_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,

    student_id INT NOT NULL,

    current_room_id INT NOT NULL,

    requested_room_id INT NOT NULL,

    reason TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING
    -- APPROVED
    -- REJECTED

    approved_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_change_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_change_current_room
        FOREIGN KEY (current_room_id)
        REFERENCES rooms(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_change_new_room
        FOREIGN KEY (requested_room_id)
        REFERENCES rooms(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_change_manager
        FOREIGN KEY (approved_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);
INSERT INTO users(username, password, full_name, email, phone, role)
VALUES
('admin', 'Admin123!', 'Nguyễn Văn Admin', 'admin@ktx.edu.vn', '0901111111', 'ADMIN'),
('manager1', 'Manager123!', 'Trần Văn Quản Lý', 'manager1@ktx.edu.vn', '0902222222', 'MANAGER'),
('student1', 'Student123!', 'Lê Minh Anh', 'student1@ktx.edu.vn', '0903333333', 'STUDENT'),
('student2', 'Student123!', 'Nguyễn Hải Đăng', 'student2@ktx.edu.vn', '0904444444', 'STUDENT'),
('student3', 'Student123!', 'Phạm Thu Hà', 'student3@ktx.edu.vn', '0905555555', 'STUDENT');
-- =========================
-- STUDENTS
-- =========================
INSERT INTO students
(user_id, student_code, gender, birthday, faculty, class_name, address, parent_phone)
VALUES
(3,'SV001','Female','2005-09-10','Công nghệ thông tin','CNTT01','Hải Dương','0911111111'),
(4,'SV002','Male','2004-12-01','Điện tử','DT02','Hà Nội','0922222222'),
(5,'SV003','Female','2005-05-15','Kế toán','KT01','Nam Định','0933333333');

-- =========================
-- BUILDINGS
-- =========================
INSERT INTO buildings
(building_name, gender, manager_id, description)
VALUES
('Tòa A','Female',2,'Ký túc xá nữ'),
('Tòa B','Male',1,'Ký túc xá nam');

-- =========================
-- ROOMS
-- =========================
INSERT INTO rooms
(building_id, room_number, floor, room_type, gender, capacity, room_fee)
VALUES
(1,'A101',1,'4_BEDS','Female',4,600000),
(1,'A102',1,'4_BEDS','Female',4,600000),
(2,'B101',1,'6_BEDS','Male',6,500000),
(2,'B102',1,'6_BEDS','Male',6,500000);

-- =========================
-- CONTRACTS
-- =========================
INSERT INTO contracts
(contract_code, student_id, room_id, created_by, start_date, end_date, deposit)
VALUES
('HD001',1,1,2,'2026-01-01','2026-12-31',500000),
('HD002',2,3,2,'2026-01-01','2026-12-31',500000),
('HD003',3,2,2,'2026-01-01','2026-12-31',500000);

-- =========================
-- UTILITY BILLS
-- =========================
INSERT INTO utility_bills
(room_id, month, year,
electric_old, electric_new,
water_old, water_new,
electric_fee, water_fee,
created_by)
VALUES
(1,7,2026,1000,1050,500,510,175000,50000,2),
(2,7,2026,800,840,400,408,140000,40000,2),
(3,7,2026,1200,1260,700,715,210000,75000,2);

-- =========================
-- PAYMENTS
-- =========================
INSERT INTO payments
(invoice_code, student_id, contract_id, utility_bill_id,
month, year,
room_fee,
electric_fee,
water_fee,
other_fee,
total_amount,
due_date,
status)
VALUES
('INV001',1,1,1,7,2026,600000,175000,50000,0,825000,'2026-07-20','UNPAID'),
('INV002',2,2,3,7,2026,500000,210000,75000,0,785000,'2026-07-20','PAID'),
('INV003',3,3,2,7,2026,600000,140000,40000,0,780000,'2026-07-20','PENDING');

-- =========================
-- ANNOUNCEMENTS
-- =========================
INSERT INTO announcements
(title, content, target_role, created_by)
VALUES
('Thông báo đóng tiền',
'Sinh viên hoàn thành học phí trước ngày 20.',
'STUDENT',
2),

('Bảo trì điện',
'Tòa A sẽ cắt điện từ 13h đến 15h.',
'ALL',
1);

-- =========================
-- REGULATIONS
-- =========================
INSERT INTO regulations
(title, content, created_by)
VALUES
('Nội quy KTX',
'Không gây mất trật tự sau 22h.',
1),

('Giờ đóng cổng',
'Cổng đóng lúc 23h00.',
1);

-- =========================
-- SUPPORT REQUESTS
-- =========================
INSERT INTO support_requests
(student_id, room_id, category, title, description, handled_by, status)
VALUES
(1,1,'ELECTRIC','Đèn hỏng','Đèn trong phòng bị cháy.',2,'PROCESSING'),

(2,3,'WATER','Rò rỉ nước','Ống nước bị rò.',2,'DONE'),

(3,2,'INTERNET','Wifi yếu','Không truy cập được mạng.',NULL,'PENDING');

-- =========================
-- ROOM CHANGE REQUESTS
-- =========================
INSERT INTO room_change_requests
(student_id,current_room_id,requested_room_id,
reason,status,approved_by)
VALUES
(1,1,2,'Muốn ở cùng bạn','PENDING',NULL),

(2,3,4,'Phòng đông người','APPROVED',2);
