import dayjs from "dayjs";
import {
  PASSWORD_REGEX,
  passwordRules,
  loginPasswordRules,
  dateNotPast,
  dateAfterField,
  requiredField,
  maxLengthRule,
  minInt,
  maxInt,
  numberMin,
  userRules,
  contractRules,
  buildingRules,
  roomRules,
  paymentRules,
  utilityBillRules,
  announcementRules,
  regulationRules,
} from "../../utils/validation";

// ==================== PASSWORD_REGEX ====================
describe("PASSWORD_REGEX", () => {
  // Valid passwords
  const validPasswords = [
    "Abcdef1@",
    "StrongP@ss1",
    "P@ssword123",
    "A1!bcdefg",
    "Test@1234",
    "Complex#1Aa",
    "Aa1!aaaa",
  ];

  // Invalid passwords
  const invalidPasswords = [
    { value: "abcdefgh", reason: "no uppercase, no digit, no special" },
    { value: "ABCDEFGH", reason: "no digit, no special" },
    { value: "12345678", reason: "no uppercase, no special" },
    { value: "Abcdefgh", reason: "no digit, no special" },
    { value: "Abcdef1", reason: "too short (< 8 chars)" },
    { value: "abc123!@", reason: "no uppercase" },
    { value: "ABCdef!@", reason: "no digit" },
    { value: "", reason: "empty string" },
  ];

  test.each(validPasswords)(
    'should accept "%s" as a valid password',
    (password) => {
      expect(PASSWORD_REGEX.test(password)).toBe(true);
    },
  );

  test.each(invalidPasswords)(
    'should reject "$value" because $reason',
    ({ value }) => {
      expect(PASSWORD_REGEX.test(value)).toBe(false);
    },
  );
});

// ==================== passwordRules ====================
describe("passwordRules", () => {
  test("should have 3 rules", () => {
    expect(passwordRules).toHaveLength(3);
  });

  test("first rule should require password", () => {
    expect(passwordRules[0]).toMatchObject({
      required: true,
      message: "Vui lòng nhập mật khẩu",
    });
  });

  test("second rule should enforce min 8 characters", () => {
    expect(passwordRules[1]).toMatchObject({
      min: 8,
      message: "Mật khẩu phải có ít nhất 8 ký tự",
    });
  });

  test("third rule should enforce password pattern", () => {
    expect(passwordRules[2]).toMatchObject({
      pattern: PASSWORD_REGEX,
    });
  });
});

// ==================== loginPasswordRules ====================
describe("loginPasswordRules", () => {
  test("should have 2 rules", () => {
    expect(loginPasswordRules).toHaveLength(2);
  });

  test("first rule should require password", () => {
    expect(loginPasswordRules[0]).toMatchObject({
      required: true,
      message: "Vui lòng nhập mật khẩu",
    });
  });

  test("second rule should enforce min 6 characters", () => {
    expect(loginPasswordRules[1]).toMatchObject({
      min: 6,
      message: "Mật khẩu phải có ít nhất 6 ký tự",
    });
  });
});

// ==================== dateNotPast ====================
describe("dateNotPast validator", () => {
  test("should resolve if value is null/undefined", async () => {
    await expect(dateNotPast.validator(null, null)).resolves.toBeUndefined();
    await expect(
      dateNotPast.validator(null, undefined),
    ).resolves.toBeUndefined();
  });

  test("should reject if date is in the past", async () => {
    const pastDate = dayjs().subtract(1, "day");
    await expect(dateNotPast.validator(null, pastDate)).rejects.toThrow(
      "Ngày không được trong quá khứ",
    );
  });

  test("should resolve if date is today", async () => {
    const today = dayjs();
    await expect(dateNotPast.validator(null, today)).resolves.toBeUndefined();
  });

  test("should resolve if date is in the future", async () => {
    const futureDate = dayjs().add(7, "day");
    await expect(
      dateNotPast.validator(null, futureDate),
    ).resolves.toBeUndefined();
  });
});

// ==================== dateAfterField ====================
describe("dateAfterField validator", () => {
  const validator = dateAfterField("start_date", "Ngày kết thúc");

  test("should resolve if value is null/undefined", async () => {
    await expect(validator.validator(null, null, {})).resolves.toBeUndefined();
    await expect(
      validator.validator(null, undefined, {}),
    ).resolves.toBeUndefined();
  });

  test("should resolve if compared value is null/undefined", async () => {
    const futureDate = dayjs().add(10, "day");
    const context = {
      getFieldValue: () => null,
    };
    await expect(
      validator.validator(null, futureDate, context),
    ).resolves.toBeUndefined();
  });

  test("should reject if end date is before start date", async () => {
    const startDate = dayjs("2024-06-01");
    const endDate = dayjs("2024-05-01");
    const context = {
      getFieldValue: () => startDate,
    };
    await expect(validator.validator(null, endDate, context)).rejects.toThrow(
      "Ngày kết thúc phải sau start_date",
    );
  });

  test("should resolve if end date is after start date", async () => {
    const startDate = dayjs("2024-05-01");
    const endDate = dayjs("2024-06-01");
    const context = {
      getFieldValue: () => startDate,
    };
    await expect(
      validator.validator(null, endDate, context),
    ).resolves.toBeUndefined();
  });

  test("should resolve if end date equals start date", async () => {
    const startDate = dayjs("2024-06-01");
    const endDate = dayjs("2024-06-01");
    const context = {
      getFieldValue: () => startDate,
    };
    await expect(
      validator.validator(null, endDate, context),
    ).resolves.toBeUndefined();
  });

  test("should handle getFieldValue not being a function", async () => {
    const endDate = dayjs("2024-06-01");
    const context = {};
    await expect(
      validator.validator(null, endDate, context),
    ).resolves.toBeUndefined();
  });
});

// ==================== Helper Rules ====================
describe("helper rule creators", () => {
  describe("requiredField", () => {
    test("should create required rule with given label", () => {
      const rule = requiredField("Email");
      expect(rule).toEqual({
        required: true,
        message: "Vui lòng nhập email",
      });
    });
  });

  describe("maxLengthRule", () => {
    test("should create max length rule with given max and label", () => {
      const rule = maxLengthRule(100, "Tên");
      expect(rule).toEqual({
        max: 100,
        message: "Tên tối đa 100 ký tự",
      });
    });

    test("should use default label when not provided", () => {
      const rule = maxLengthRule(50);
      expect(rule).toEqual({
        max: 50,
        message: "Trường này tối đa 50 ký tự",
      });
    });
  });

  describe("minInt", () => {
    test("should create min number rule", () => {
      const rule = minInt(1, "Tầng");
      expect(rule).toEqual({
        type: "number",
        min: 1,
        message: "Tầng phải lớn hơn hoặc bằng 1",
      });
    });
  });

  describe("maxInt", () => {
    test("should create max number rule", () => {
      const rule = maxInt(12, "Tháng");
      expect(rule).toEqual({
        type: "number",
        max: 12,
        message: "Tháng phải nhỏ hơn hoặc bằng 12",
      });
    });
  });

  describe("numberMin", () => {
    test("should create non-negative number rule", () => {
      const rule = numberMin(0, "Giá phòng");
      expect(rule).toEqual({
        type: "number",
        min: 0,
        message: "Giá phòng không được âm",
      });
    });
  });
});

// ==================== Entity-Specific Rule Sets ====================
describe("Entity-specific rule sets", () => {
  describe("userRules", () => {
    test("should have username rules", () => {
      expect(userRules.username).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ min: 3 }),
          expect.objectContaining({ max: 50 }),
        ]),
      );
    });

    test("should have password rules", () => {
      expect(userRules.password).toEqual(passwordRules);
    });

    test("should have email rules with email type", () => {
      expect(userRules.email).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "email" }),
          expect.objectContaining({ required: true }),
        ]),
      );
    });

    test("should have fullName rules", () => {
      expect(userRules.fullName).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ min: 2 }),
          expect.objectContaining({ max: 100 }),
        ]),
      );
    });

    test("should have phone rules with pattern", () => {
      expect(userRules.phone).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            pattern: expect.any(RegExp),
          }),
        ]),
      );
    });
  });

  describe("contractRules", () => {
    test("should have contract_code rules", () => {
      expect(contractRules.contract_code).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ max: 20 }),
        ]),
      );
    });

    test("should have student_id and room_id required rules", () => {
      expect(contractRules.student_id).toEqual(
        expect.arrayContaining([expect.objectContaining({ required: true })]),
      );
      expect(contractRules.room_id).toEqual(
        expect.arrayContaining([expect.objectContaining({ required: true })]),
      );
    });

    test("should have start_date required rule", () => {
      expect(contractRules.start_date).toEqual(
        expect.arrayContaining([expect.objectContaining({ required: true })]),
      );
    });

    test("should have end_date with dateAfterField", () => {
      expect(contractRules.end_date).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({
            validator: expect.any(Function),
          }),
        ]),
      );
    });

    test("should have deposit with non-negative rule", () => {
      expect(contractRules.deposit).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "number",
            min: 0,
          }),
        ]),
      );
    });
  });

  describe("buildingRules", () => {
    test("should have building_name rules", () => {
      expect(buildingRules.building_name).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ max: 100 }),
        ]),
      );
    });

    test("should have gender required rule", () => {
      expect(buildingRules.gender).toEqual(
        expect.arrayContaining([expect.objectContaining({ required: true })]),
      );
    });

    test("should have manager_id required rule", () => {
      expect(buildingRules.manager_id).toEqual(
        expect.arrayContaining([expect.objectContaining({ required: true })]),
      );
    });
  });

  describe("roomRules", () => {
    test("should have room_number required with max 20", () => {
      expect(roomRules.room_number).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ max: 20 }),
        ]),
      );
    });

    test("should have capacity with min 1", () => {
      expect(roomRules.capacity).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ type: "number", min: 1 }),
        ]),
      );
    });

    test("should have room_fee with non-negative min", () => {
      expect(roomRules.room_fee).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ type: "number", min: 0 }),
        ]),
      );
    });

    test("should have room_type required with max 20", () => {
      expect(roomRules.room_type).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ max: 20 }),
        ]),
      );
    });
  });

  describe("paymentRules", () => {
    test("should have invoice_code required with max 20", () => {
      expect(paymentRules.invoice_code).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ max: 20 }),
        ]),
      );
    });

    test("should have month rules with min 1 max 12", () => {
      expect(paymentRules.month).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "number", min: 1 }),
          expect.objectContaining({ type: "number", max: 12 }),
        ]),
      );
    });

    test("should have year with min 2000", () => {
      expect(paymentRules.year).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "number", min: 2000 }),
        ]),
      );
    });

    test("should have room_fee and total_amount with non-negative", () => {
      [paymentRules.room_fee, paymentRules.total_amount].forEach((rules) => {
        expect(rules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ required: true }),
            expect.objectContaining({ type: "number", min: 0 }),
          ]),
        );
      });
    });

    test("should have due_date required", () => {
      expect(paymentRules.due_date).toEqual(
        expect.arrayContaining([expect.objectContaining({ required: true })]),
      );
    });
  });

  describe("utilityBillRules", () => {
    test("should have room_id required", () => {
      expect(utilityBillRules.room_id).toEqual(
        expect.arrayContaining([expect.objectContaining({ required: true })]),
      );
    });

    test("should have month rules with min 1 max 12", () => {
      expect(utilityBillRules.month).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "number", min: 1 }),
          expect.objectContaining({ type: "number", max: 12 }),
        ]),
      );
    });

    test("should have electric/water readings with min 0", () => {
      const readings = [
        utilityBillRules.electric_old,
        utilityBillRules.electric_new,
        utilityBillRules.water_old,
        utilityBillRules.water_new,
      ];
      readings.forEach((rules) => {
        expect(rules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: "number", min: 0 }),
          ]),
        );
      });
    });
  });

  describe("announcementRules", () => {
    test("should have title rules required with max 255", () => {
      expect(announcementRules.title).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ max: 255 }),
        ]),
      );
    });

    test("should have content required", () => {
      expect(announcementRules.content).toEqual(
        expect.arrayContaining([expect.objectContaining({ required: true })]),
      );
    });

    test("should have target_role required", () => {
      expect(announcementRules.target_role).toEqual(
        expect.arrayContaining([expect.objectContaining({ required: true })]),
      );
    });
  });

  describe("regulationRules", () => {
    test("should have title rules required with max 255", () => {
      expect(regulationRules.title).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ required: true }),
          expect.objectContaining({ max: 255 }),
        ]),
      );
    });

    test("should have content required", () => {
      expect(regulationRules.content).toEqual(
        expect.arrayContaining([expect.objectContaining({ required: true })]),
      );
    });
  });
});
