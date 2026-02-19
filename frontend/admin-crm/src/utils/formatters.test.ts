import { describe, it, expect } from "vitest";
import {
  formatPercent,
  formatNumber,
  formatCompactNumber,
  formatDecimalAsPercent,
  formatNumberRange,
  formatOrdinal,
  getThresholdColor,
} from "./formatters";

describe("formatPercent", () => {
  it("formats standard percentages with default 1 decimal", () => {
    expect(formatPercent(75.123)).toBe("75.1%");
  });

  it("formats with custom decimal places", () => {
    expect(formatPercent(33.3333, 2)).toBe("33.33%");
    expect(formatPercent(99.9, 0)).toBe("100%");
  });

  it("handles zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("handles negative values", () => {
    expect(formatPercent(-5.5)).toBe("-5.5%");
  });

  it("returns 0% for NaN", () => {
    expect(formatPercent(NaN)).toBe("0%");
  });

  it("returns 0% for Infinity", () => {
    expect(formatPercent(Infinity)).toBe("0%");
    expect(formatPercent(-Infinity)).toBe("0%");
  });
});

describe("formatNumber", () => {
  it("formats with default locale and no decimals", () => {
    const result = formatNumber(1234567);
    expect(result).toMatch(/1.*234.*567/); // locale-dependent separator
  });

  it("returns 0 for NaN", () => {
    expect(formatNumber(NaN)).toBe("0");
  });

  it("returns 0 for Infinity", () => {
    expect(formatNumber(Infinity)).toBe("0");
  });

  it("respects minimumFractionDigits", () => {
    const result = formatNumber(100, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(result).toContain("00");
  });

  it("respects maximumFractionDigits", () => {
    const result = formatNumber(100.999, { maximumFractionDigits: 1 });
    expect(result).toContain("1");
  });
});

describe("formatCompactNumber", () => {
  it("formats billions", () => {
    expect(formatCompactNumber(3000000000)).toBe("3.0B");
  });

  it("formats millions", () => {
    expect(formatCompactNumber(2500000)).toBe("2.5M");
  });

  it("formats thousands", () => {
    expect(formatCompactNumber(1500)).toBe("1.5K");
  });

  it("falls back to formatNumber for values under 1000", () => {
    expect(formatCompactNumber(999)).toMatch(/999/);
  });

  it("returns 0 for NaN", () => {
    expect(formatCompactNumber(NaN)).toBe("0");
  });

  it("returns 0 for Infinity", () => {
    expect(formatCompactNumber(Infinity)).toBe("0");
  });

  it("respects maximumFractionDigits", () => {
    expect(formatCompactNumber(1234, { maximumFractionDigits: 2 })).toBe(
      "1.23K",
    );
  });
});

describe("formatDecimalAsPercent", () => {
  it("converts 0.75 to 75%", () => {
    expect(formatDecimalAsPercent(0.75)).toBe("75%");
  });

  it("converts with custom decimals", () => {
    expect(formatDecimalAsPercent(0.333, 1)).toBe("33.3%");
  });

  it("handles zero", () => {
    expect(formatDecimalAsPercent(0)).toBe("0%");
  });

  it("handles 1.0 as 100%", () => {
    expect(formatDecimalAsPercent(1.0)).toBe("100%");
  });

  it("handles values greater than 1", () => {
    expect(formatDecimalAsPercent(1.5)).toBe("150%");
  });

  it("returns 0% for NaN", () => {
    expect(formatDecimalAsPercent(NaN)).toBe("0%");
  });

  it("returns 0% for Infinity", () => {
    expect(formatDecimalAsPercent(Infinity)).toBe("0%");
  });
});

describe("formatNumberRange", () => {
  it("formats range with default separator", () => {
    const result = formatNumberRange(100, 500);
    expect(result).toMatch(/100.*-.*500/);
  });

  it("supports custom separator", () => {
    const result = formatNumberRange(100, 500, { separator: " to " });
    expect(result).toMatch(/100 to 500/);
  });
});

describe("formatOrdinal", () => {
  it("formats 1st, 2nd, 3rd, 4th", () => {
    expect(formatOrdinal(1)).toBe("1st");
    expect(formatOrdinal(2)).toBe("2nd");
    expect(formatOrdinal(3)).toBe("3rd");
    expect(formatOrdinal(4)).toBe("4th");
  });

  it("formats teens correctly (11th, 12th, 13th)", () => {
    expect(formatOrdinal(11)).toBe("11th");
    expect(formatOrdinal(12)).toBe("12th");
    expect(formatOrdinal(13)).toBe("13th");
  });

  it("formats twenties correctly (21st, 22nd, 23rd)", () => {
    expect(formatOrdinal(21)).toBe("21st");
    expect(formatOrdinal(22)).toBe("22nd");
    expect(formatOrdinal(23)).toBe("23rd");
  });

  it("returns empty string for NaN", () => {
    expect(formatOrdinal(NaN)).toBe("");
  });

  it("returns empty string for Infinity", () => {
    expect(formatOrdinal(Infinity)).toBe("");
  });
});

describe("getThresholdColor", () => {
  const thresholds = { success: 80, warning: 50 };

  it("returns success when value >= success threshold", () => {
    expect(getThresholdColor(80, thresholds)).toBe("success");
    expect(getThresholdColor(100, thresholds)).toBe("success");
  });

  it("returns warning when value >= warning threshold but < success", () => {
    expect(getThresholdColor(50, thresholds)).toBe("warning");
    expect(getThresholdColor(79, thresholds)).toBe("warning");
  });

  it("returns error when value < warning threshold", () => {
    expect(getThresholdColor(49, thresholds)).toBe("error");
    expect(getThresholdColor(0, thresholds)).toBe("error");
  });
});
