CREATE DATABASE IF NOT EXISTS quan_ly_ky_tuc_xa;
USE quan_ly_ky_tuc_xa;

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_code VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    class_name VARCHAR(50),
    address VARCHAR(255)
);

CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_code VARCHAR(20) NOT NULL UNIQUE,
    room_name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    current_quantity INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    price DECIMAL(12,2)
);

INSERT INTO students 
(student_code, full_name, gender, phone, email, class_name, address)
VALUES
('SV001', 'Nguyen Van A', 'Nam', '0987654321', 'a@gmail.com', 'CNTT1', 'Nam Dinh'),
('SV002', 'Tran Thi B', 'Nu', '0912345678', 'b@gmail.com', 'CNTT2', 'Ha Noi');

INSERT INTO rooms 
(room_code, room_name, capacity, current_quantity, status, price)
VALUES
('A101', 'Phong A101', 6, 2, 'AVAILABLE', 600000),
('A102', 'Phong A102', 6, 6, 'FULL', 600000);