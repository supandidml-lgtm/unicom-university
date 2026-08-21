import { describe, it, expect } from "vitest";
import { TOKENS } from "../src/tokens";

describe("Design Tokens Integrity (Taste Skill)", () => {
  it("should have white as primary background per design brief", () => {
    expect(TOKENS.colors.background.primary).toBe("#ffffff");
  });

  it("should have blue as primary brand color", () => {
    expect(TOKENS.colors.brand.primary).toBe("#2563eb");
  });

  it("should define semantic success, warning, danger, and info tokens", () => {
    expect(TOKENS.colors.semantic.success.solid).toBe("#10b981");
    expect(TOKENS.colors.semantic.warning.solid).toBe("#f59e0b");
    expect(TOKENS.colors.semantic.danger.solid).toBe("#ef4444");
    expect(TOKENS.colors.semantic.info.solid).toBe("#0ea5e9");
  });
});
