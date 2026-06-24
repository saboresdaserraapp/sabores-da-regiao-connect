import { describe, expect, it } from "vitest";
import {
  formatBrPhone,
  formatBrPhoneTyping,
  isValidBrPhone,
  normalizeBrPhone,
  toE164Br,
} from "@/lib/phone";

describe("normalizeBrPhone", () => {
  it("returns empty string for nullish input", () => {
    expect(normalizeBrPhone("")).toBe("");
    expect(normalizeBrPhone(null)).toBe("");
    expect(normalizeBrPhone(undefined)).toBe("");
  });

  it("strips symbols, spaces and parentheses", () => {
    expect(normalizeBrPhone("(11) 91234-5678")).toBe("11912345678");
    expect(normalizeBrPhone("11 9 1234 5678")).toBe("11912345678");
    expect(normalizeBrPhone("11.91234.5678")).toBe("11912345678");
  });

  it("strips +55 country code", () => {
    expect(normalizeBrPhone("+55 11 91234-5678")).toBe("11912345678");
    expect(normalizeBrPhone("5511912345678")).toBe("11912345678");
  });

  it("strips a long-distance leading 0", () => {
    expect(normalizeBrPhone("011912345678")).toBe("11912345678");
  });

  it("keeps short numbers as-is so the caller can decide", () => {
    expect(normalizeBrPhone("12345")).toBe("12345");
  });
});

describe("isValidBrPhone", () => {
  it.each([
    ["11912345678", true],
    ["(11) 91234-5678", true],
    ["+55 11 91234 5678", true],
    ["1133221122", true], // landline 10 digits
    ["(11) 3322-1122", true],
  ])("accepts %s", (input, expected) => {
    expect(isValidBrPhone(input)).toBe(expected);
  });

  it.each([
    "",
    "1234",
    "0012345678", // DDD < 11
    "10912345678", // DDD < 11
    "11812345678", // 11 digits but third digit is not 9
    "abcdefghij",
  ])("rejects %s", (input) => {
    expect(isValidBrPhone(input)).toBe(false);
  });
});

describe("formatBrPhone", () => {
  it("formats mobile and landline", () => {
    expect(formatBrPhone("11912345678")).toBe("(11) 91234-5678");
    expect(formatBrPhone("1133221122")).toBe("(11) 3322-1122");
  });

  it("falls back to original when format is unknown", () => {
    expect(formatBrPhone("123")).toBe("123");
  });

  it("formats values that carry +55 prefix", () => {
    expect(formatBrPhone("+55 11 91234-5678")).toBe("(11) 91234-5678");
  });
});

describe("formatBrPhoneTyping", () => {
  it("masks incrementally as the user types", () => {
    expect(formatBrPhoneTyping("")).toBe("");
    expect(formatBrPhoneTyping("1")).toBe("(1");
    expect(formatBrPhoneTyping("11")).toBe("(11");
    expect(formatBrPhoneTyping("119")).toBe("(11) 9");
    expect(formatBrPhoneTyping("119123")).toBe("(11) 9123");
    expect(formatBrPhoneTyping("1191234")).toBe("(11) 9123-4");
    expect(formatBrPhoneTyping("11912345678")).toBe("(11) 91234-5678");
  });

  it("caps at 11 digits even if more are typed", () => {
    expect(formatBrPhoneTyping("119123456789999")).toBe("(11) 91234-5678");
  });
});

describe("toE164Br", () => {
  it("returns +55 prefixed form when valid", () => {
    expect(toE164Br("(11) 91234-5678")).toBe("+5511912345678");
  });

  it("returns empty string when invalid", () => {
    expect(toE164Br("123")).toBe("");
  });
});