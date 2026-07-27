import dayjs from "dayjs";

export const normalizeDateValue = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  if (value instanceof Date) return dayjs(value);
  if (typeof value === "string") {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  }
  return null;
};

/**
 * Shared validation rules đồng bộ với backend DTO
 * Backend: NestJS + class-validator
 */

// ==================== Password ====================
// Đồng bộ với CreateUserDto: @MinLength(8) + @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/)
export const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export const passwordRules = [
  { required: true, message: "Vui lòng nhập mật khẩu" },
  { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
  {
    pattern: PASSWORD_REGEX,
    message: "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt",
  },
];

// Đồng bộ với LoginDto: @MinLength(6)
export const loginPasswordRules = [
  { required: true, message: "Vui lòng nhập mật khẩu" },
  { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
];

// ==================== Numeric Helpers ====================
export const minInt = (min, label = "Giá trị") => ({
  type: "number",
  min,
  message: `${label} phải lớn hơn hoặc bằng ${min}`,
});

export const maxInt = (max, label = "Giá trị") => ({
  type: "number",
  max,
  message: `${label} phải nhỏ hơn hoặc bằng ${max}`,
});

export const numberMin = (min, label = "Giá trị") => ({
  type: "number",
  min,
  message: `${label} không được âm`,
});

// ==================== Date Validators ====================
export const requiredDate = {
  required: true,
  message: "Vui lòng chọn ngày",
};

export const dateNotPast = {
  validator: (_, value) => {
    const normalizedValue = normalizeDateValue(value);
    if (!normalizedValue) return Promise.resolve();
    if (normalizedValue.isBefore(dayjs().startOf("day"))) {
      return Promise.reject(new Error("Ngày không được trong quá khứ"));
    }
    return Promise.resolve();
  },
};

export const dateAfterField = (fieldName, label = "Ngày kết thúc") => ({
  validator: (_, value, context = {}) => {
    if (!value) return Promise.resolve();

    const normalizedValue = normalizeDateValue(value);
    const getFieldValue = context.getFieldValue;
    const comparedValue = normalizeDateValue(
      typeof getFieldValue === "function" ? getFieldValue(fieldName) : null,
    );

    if (!normalizedValue || !comparedValue) {
      return Promise.resolve();
    }

    if (normalizedValue.isBefore(comparedValue)) {
      return Promise.reject(new Error(`${label} phải sau ${fieldName}`));
    }

    return Promise.resolve();
  },
});

// ==================== Required Field ====================
export const requiredField = (label) => ({
  required: true,
  message: `Vui lòng nhập ${label.toLowerCase()}`,
});

export const maxLengthRule = (max, label = "Trường này") => ({
  max,
  message: `${label} tối đa ${max} ký tự`,
});

// ==================== Entity-specific Rule Sets ====================
// Đồng bộ với CreateUserDto
export const userRules = {
  username: [
    requiredField("Tên đăng nhập"),
    { min: 3, message: "Tên đăng nhập phải có ít nhất 3 ký tự" },
    maxLengthRule(50, "Tên đăng nhập"),
  ],
  password: passwordRules,
  email: [
    requiredField("Email"),
    { type: "email", message: "Email không hợp lệ" },
  ],
  fullName: [
    requiredField("Họ và tên"),
    { min: 2, message: "Họ tên phải có ít nhất 2 ký tự" },
    maxLengthRule(100, "Họ và tên"),
  ],
  phone: [
    { pattern: /^\+?[0-9\s()-]{7,15}$/, message: "Số điện thoại không hợp lệ" },
  ],
};

// Đồng bộ với CreateContractDto
export const contractRules = {
  contract_code: [
    requiredField("Mã hợp đồng"),
    maxLengthRule(20, "Mã hợp đồng"),
  ],
  student_id: [{ required: true, message: "Vui lòng chọn sinh viên" }],
  room_id: [{ required: true, message: "Vui lòng chọn phòng" }],
  start_date: [requiredDate],
  end_date: [requiredDate, dateAfterField("start_date", "Ngày kết thúc")],
  deposit: [numberMin(0, "Tiền đặt cọc")],
};

// Đồng bộ với CreateBuildingDto
export const buildingRules = {
  building_name: [
    requiredField("Tên tòa nhà"),
    maxLengthRule(100, "Tên tòa nhà"),
  ],
  gender: [{ required: true, message: "Vui lòng chọn giới tính" }],
  manager_id: [{ required: true, message: "Vui lòng chọn quản lý" }],
};

// Đồng bộ với CreateRoomDto
export const roomRules = {
  room_number: [requiredField("Số phòng"), maxLengthRule(20, "Số phòng")],
  building_id: [{ required: true, message: "Vui lòng chọn tòa nhà" }],
  floor: [{ required: true, message: "Vui lòng nhập tầng" }, minInt(1, "Tầng")],
  capacity: [
    { required: true, message: "Vui lòng nhập sức chứa" },
    minInt(1, "Sức chứa"),
  ],
  room_fee: [
    { required: true, message: "Vui lòng nhập giá phòng" },
    numberMin(0, "Giá phòng"),
  ],
  room_type: [
    { required: true, message: "Vui lòng nhập loại phòng" },
    maxLengthRule(20, "Loại phòng"),
  ],
};

// Đồng bộ với CreatePaymentDto
export const paymentRules = {
  invoice_code: [requiredField("Mã hóa đơn"), maxLengthRule(20, "Mã hóa đơn")],
  month: [
    { required: true, message: "Vui lòng nhập tháng" },
    minInt(1, "Tháng"),
    { type: "number", max: 12, message: "Tháng phải từ 1 đến 12" },
  ],
  year: [{ required: true, message: "Vui lòng nhập năm" }, minInt(2000, "Năm")],
  room_fee: [
    { required: true, message: "Vui lòng nhập tiền phòng" },
    numberMin(0, "Tiền phòng"),
  ],
  total_amount: [
    { required: true, message: "Vui lòng nhập tổng tiền" },
    numberMin(0, "Tổng tiền"),
  ],
  due_date: [requiredDate],
};

// Đồng bộ với CreateUtilityBillDto
export const utilityBillRules = {
  room_id: [{ required: true, message: "Vui lòng chọn phòng" }],
  month: [
    { required: true, message: "Vui lòng nhập tháng" },
    minInt(1, "Tháng"),
    { type: "number", max: 12, message: "Tháng phải từ 1 đến 12" },
  ],
  year: [{ required: true, message: "Vui lòng nhập năm" }, minInt(2000, "Năm")],
  electric_old: [minInt(0, "Chỉ số điện cũ")],
  electric_new: [minInt(0, "Chỉ số điện mới")],
  water_old: [minInt(0, "Chỉ số nước cũ")],
  water_new: [minInt(0, "Chỉ số nước mới")],
};

// Đồng bộ với CreateAnnouncementDto
export const announcementRules = {
  title: [requiredField("Tiêu đề"), maxLengthRule(255, "Tiêu đề")],
  content: [requiredField("Nội dung")],
  target_role: [{ required: true, message: "Vui lòng chọn đối tượng" }],
};

// Đồng bộ với CreateRegulationDto
export const regulationRules = {
  title: [requiredField("Tiêu đề"), maxLengthRule(255, "Tiêu đề")],
  content: [requiredField("Nội dung")],
};

// Export all rules as a single object for convenient importing
const validationRules = {
  user: userRules,
  contract: contractRules,
  building: buildingRules,
  room: roomRules,
  payment: paymentRules,
  utilityBill: utilityBillRules,
  announcement: announcementRules,
  regulation: regulationRules,
};

export default validationRules;
