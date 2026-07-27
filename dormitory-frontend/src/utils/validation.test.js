import dayjs from "dayjs";
import { contractRules, normalizeDateValue } from "./validation";

describe("date validation helpers", () => {
  it("normalizes string dates into dayjs values", () => {
    const normalized = normalizeDateValue("2024-04-01");

    expect(dayjs.isDayjs(normalized)).toBe(true);
    expect(normalized.format("YYYY-MM-DD")).toBe("2024-04-01");
    expect(normalizeDateValue("not-a-date")).toBeNull();
  });

  it("validates date comparisons without crashing when values are strings", async () => {
    const validatorRule = contractRules.end_date[1];

    await expect(
      validatorRule.validator(
        null,
        "2024-04-02",
        { getFieldValue: () => "2024-04-01" },
      ),
    ).resolves.toBeUndefined();
  });
});
